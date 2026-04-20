import { db } from '../../core/db.js'
import { userIsAssociationOwner } from '../group/educatorScope.js'
import { userIsAppAdmin } from '../admin/adminScope.js'

const dateFromYMD = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0))
}

const ymdFromDate = (dt) => dt.toISOString().slice(0, 10)

const assertNotEducatorBlocked = async (userId) => {
  if (await userIsAssociationOwner(userId))
    throw {
      status: 403,
      message: 'Compte éducateur association : les RDV se font depuis l’onglet Agenda (assignation aux membres).',
    }
  if (await userIsAppAdmin(userId))
    throw { status: 403, message: 'Compte administrateur : pas d’agenda joueur.' }
}

export const listCalendar = async (userId, year) => {
  await assertNotEducatorBlocked(userId)
  const start = new Date(Date.UTC(year, 0, 1, 12, 0, 0, 0))
  const end = new Date(Date.UTC(year, 11, 31, 12, 0, 0, 0))

  const [scheduled, completed] = await Promise.all([
    db.appointment.groupBy({
      by: ['date'],
      where: { userId, date: { gte: start, lte: end } },
      _count: { _all: true },
    }),
    db.appointmentCompletion.groupBy({
      by: ['date'],
      where: {
        userId,
        date: { gte: start, lte: end },
        outcome: 'COMPLETED',
      },
      _count: { _all: true },
    }),
  ])

  const schedMap = Object.fromEntries(scheduled.map((r) => [ymdFromDate(r.date), r._count._all]))
  const doneMap = Object.fromEntries(completed.map((r) => [ymdFromDate(r.date), r._count._all]))

  const days = []
  const cur = new Date(start)
  while (cur <= end) {
    const y = cur.getUTCFullYear()
    const mo = cur.getUTCMonth()
    const da = cur.getUTCDate()
    const key = `${y}-${String(mo + 1).padStart(2, '0')}-${String(da).padStart(2, '0')}`
    const s = schedMap[key] ?? 0
    const c = doneMap[key] ?? 0
    const intensity = s === 0 ? 0 : Math.min(100, Math.round((c / s) * 100))
    days.push({ date: key, scheduled: s, completed: c, intensity })
    cur.setUTCDate(cur.getUTCDate() + 1)
  }

  return { year, days }
}

export const listDay = async (userId, dateStr) => {
  await assertNotEducatorBlocked(userId)
  const day = dateFromYMD(dateStr)
  const rows = await db.appointment.findMany({
    where: { userId, date: day },
    orderBy: [{ timeHm: 'asc' }, { createdAt: 'asc' }],
    include: {
      completions: { where: { date: day } },
    },
  })
  return rows.map((a) => {
    const c = a.completions[0]
    return {
      id: a.id,
      title: a.title,
      notes: a.notes,
      date: ymdFromDate(a.date),
      timeHm: a.timeHm,
      xpReward: a.xpReward,
      done: c?.outcome === 'COMPLETED',
      notDone: c?.outcome === 'NOT_DONE',
    }
  })
}

export const createMine = async (userId, data) => {
  await assertNotEducatorBlocked(userId)
  const d = dateFromYMD(data.date)
  return db.appointment.create({
    data: {
      userId,
      createdByUserId: userId,
      title: data.title.trim(),
      notes: data.notes?.trim() || null,
      date: d,
      timeHm: data.timeHm,
      xpReward: 30,
    },
  })
}

/** Éducateur OWNER ASSO uniquement */
export const createForMember = async (educatorId, data) => {
  if (await userIsAppAdmin(educatorId))
    throw { status: 403, message: 'Compte administrateur : pas d’agenda.' }

  const membership = await db.groupMember.findFirst({
    where: {
      userId: educatorId,
      groupId: data.groupId,
      role: 'OWNER',
      group: { type: 'ASSOCIATION' },
    },
    select: { groupId: true },
  })
  if (!membership) throw { status: 403, message: 'Réservé au propriétaire d’un groupe association.' }

  const member = await db.groupMember.findUnique({
    where: { userId_groupId: { userId: data.memberUserId, groupId: data.groupId } },
  })
  if (!member) throw { status: 404, message: 'Ce membre n’est pas dans ce groupe.' }
  if (member.role === 'OWNER')
    throw { status: 400, message: 'Impossible d’assigner un RDV au propriétaire du groupe.' }

  const d = dateFromYMD(data.date)
  return db.appointment.create({
    data: {
      userId: data.memberUserId,
      createdByUserId: educatorId,
      groupId: data.groupId,
      title: data.title.trim(),
      notes: data.notes?.trim() || null,
      date: d,
      timeHm: data.timeHm,
      xpReward: 30,
    },
  })
}

export const listManaged = async (educatorId, groupId, year) => {
  const membership = await db.groupMember.findFirst({
    where: {
      userId: educatorId,
      groupId,
      role: 'OWNER',
      group: { type: 'ASSOCIATION' },
    },
  })
  if (!membership) throw { status: 403, message: 'Accès refusé à ce groupe.' }

  const start = new Date(Date.UTC(year, 0, 1, 12, 0, 0, 0))
  const end = new Date(Date.UTC(year, 11, 31, 12, 0, 0, 0))

  const rows = await db.appointment.findMany({
    where: {
      groupId,
      createdByUserId: educatorId,
      date: { gte: start, lte: end },
    },
    orderBy: [{ date: 'asc' }, { timeHm: 'asc' }, { createdAt: 'asc' }],
    include: {
      assignee: { select: { id: true, username: true, avatar: true } },
      completions: {
        where: { outcome: 'COMPLETED' },
        take: 1,
        select: { id: true },
      },
    },
  })
  return rows.map(({ completions, ...rest }) => ({
    ...rest,
    hasCompletion: completions.length > 0,
  }))
}

export const complete = async (userId, appointmentId, body) => {
  await assertNotEducatorBlocked(userId)

  const appt = await db.appointment.findFirst({
    where: { id: appointmentId, userId },
  })
  if (!appt) throw { status: 404, message: 'Rendez-vous introuvable' }

  const apptYmd = ymdFromDate(appt.date)
  const today = body?.today
  if (!today || today !== apptYmd)
    throw {
      status: 400,
      message: 'Ce RDV ne peut être validé que le jour prévu (jour civil).',
    }

  const day = dateFromYMD(apptYmd)

  const existing = await db.appointmentCompletion.findUnique({
    where: { appointmentId_date: { appointmentId, date: day } },
  })
  if (existing?.outcome === 'COMPLETED')
    return { ok: true, already: true, xpEarned: existing.xpEarned }

  if (existing?.outcome === 'NOT_DONE')
    throw {
      status: 400,
      message:
        'Ce RDV est marqué non fait : il ne peut plus être validé ni rapporter d’XP. Tu peux supprimer le RDV depuis l’agenda si besoin.',
    }

  const row = await db.appointmentCompletion.create({
    data: {
      appointmentId,
      userId,
      date: day,
      xpEarned: appt.xpReward,
      outcome: 'COMPLETED',
    },
  })
  return { ok: true, xpEarned: row.xpEarned }
}

/** Marque le RDV « non fait » ce jour — pas d’XP ; raison optionnelle (Stats heatmap uniquement). */
export const declineNotDone = async (userId, appointmentId, body) => {
  await assertNotEducatorBlocked(userId)

  const appt = await db.appointment.findFirst({
    where: { id: appointmentId, userId },
  })
  if (!appt) throw { status: 404, message: 'Rendez-vous introuvable' }

  const apptYmd = ymdFromDate(appt.date)
  const today = body?.today
  if (!today || today !== apptYmd)
    throw {
      status: 400,
      message: 'Ce RDV ne peut être marqué que le jour prévu (jour civil).',
    }

  const day = dateFromYMD(apptYmd)
  const reason =
    typeof body?.reason === 'string' && body.reason.trim().length > 0
      ? body.reason.trim().slice(0, 500)
      : null

  const existing = await db.appointmentCompletion.findUnique({
    where: { appointmentId_date: { appointmentId, date: day } },
  })
  if (existing?.outcome === 'COMPLETED')
    throw { status: 400, message: 'RDV déjà validé.' }

  if (existing?.outcome === 'NOT_DONE') {
    await db.appointmentCompletion.update({
      where: { id: existing.id },
      data: { declineReason: reason },
    })
    return { ok: true }
  }

  await db.appointmentCompletion.create({
    data: {
      appointmentId,
      userId,
      date: day,
      xpEarned: 0,
      outcome: 'NOT_DONE',
      declineReason: reason,
    },
  })
  return { ok: true }
}

export const update = async (requesterId, appointmentId, data) => {
  const appt = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      completions: {
        where: { outcome: 'COMPLETED' },
        take: 1,
      },
    },
  })
  if (!appt) throw { status: 404, message: 'Rendez-vous introuvable' }

  const isAssignee = appt.userId === requesterId
  const isCreator = appt.createdByUserId === requesterId
  if (!isAssignee && !isCreator) throw { status: 403, message: 'Accès refusé' }

  const hasCompleted = appt.completions.length > 0
  const patch = {}
  if (data.title != null) patch.title = data.title.trim()
  if (data.notes !== undefined) patch.notes = data.notes === null || data.notes === '' ? null : String(data.notes).trim() || null
  if (!hasCompleted) {
    if (data.date != null) patch.date = dateFromYMD(data.date)
    if (data.timeHm != null) patch.timeHm = data.timeHm
    if (data.date != null || data.timeHm != null) {
      patch.emailReminderDayBeforeSentAt = null
      patch.emailReminderHourBeforeSentAt = null
    }
  } else if (data.date != null || data.timeHm != null) {
    throw {
      status: 400,
      message: 'RDV déjà validé : seuls le titre et les notes sont modifiables.',
    }
  }

  if (Object.keys(patch).length === 0) throw { status: 400, message: 'Rien à modifier' }

  await db.appointment.update({ where: { id: appointmentId }, data: patch })
  return { ok: true }
}

export const remove = async (requesterId, appointmentId) => {
  const appt = await db.appointment.findUnique({ where: { id: appointmentId } })
  if (!appt) throw { status: 404, message: 'Rendez-vous introuvable' }

  const isAssignee = appt.userId === requesterId
  const isCreator = appt.createdByUserId === requesterId
  if (!isAssignee && !isCreator) throw { status: 403, message: 'Accès refusé' }

  await db.appointment.delete({ where: { id: appointmentId } })
  return { ok: true }
}
