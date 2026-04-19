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
      where: { userId, date: { gte: start, lte: end } },
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
  return rows.map((a) => ({
    id: a.id,
    title: a.title,
    notes: a.notes,
    date: ymdFromDate(a.date),
    timeHm: a.timeHm,
    xpReward: a.xpReward,
    done: a.completions.length > 0,
  }))
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
      completions: { take: 1, select: { id: true } },
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
  if (existing) return { ok: true, already: true, xpEarned: existing.xpEarned }

  const row = await db.appointmentCompletion.create({
    data: {
      appointmentId,
      userId,
      date: day,
      xpEarned: appt.xpReward,
    },
  })
  return { ok: true, xpEarned: row.xpEarned }
}

export const update = async (requesterId, appointmentId, data) => {
  const appt = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: { completions: { take: 1 } },
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
