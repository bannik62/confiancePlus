import { db } from '../../core/db.js'
import { userIsAssociationOwner } from '../group/educatorScope.js'
import { userIsAppAdmin } from '../admin/adminScope.js'

/** YYYY-MM-DD → Date midi UTC (@db.Date) */
const dateFromYMD = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0))
}

/** Jours à ajouter à une date Y-M-D (UTC) */
const addDaysYmd = (ymd, delta) => {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0))
  dt.setUTCDate(dt.getUTCDate() + delta)
  return dt.toISOString().slice(0, 10)
}

const notEligible = async (userId) =>
  (await userIsAssociationOwner(userId)) || (await userIsAppAdmin(userId))

const formatOffer = (row) => ({
  id: row.id,
  offerDate: row.offerDate.toISOString().slice(0, 10),
  status: row.status,
  template: row.template
    ? {
        id: row.template.id,
        title: row.template.title,
        icon: row.template.icon,
        xpTotal: row.template.xpTotal,
      }
    : null,
  habit: row.habit
    ? { id: row.habit.id, name: row.habit.name, icon: row.habit.icon, xp: row.habit.xp }
    : null,
})

/**
 * Parmi les templates actifs, exclut ceux déjà proposés sur les 7 derniers jours civils (fenêtre glissante).
 * Si le pool est vide, retombe sur tous les actifs (évite blocage).
 */
export const pickTemplateForUser = async (userId, clientYmd) => {
  const templates = await db.dailyHabitTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  })
  if (!templates.length) return null

  const windowStartYmd = addDaysYmd(clientYmd, -6)
  const start = dateFromYMD(windowStartYmd)
  const end = dateFromYMD(clientYmd)

  const recent = await db.dailyHabitOffer.findMany({
    where: {
      userId,
      offerDate: { gte: start, lte: end },
    },
    select: { templateId: true },
  })
  const used = new Set(recent.map((r) => r.templateId))
  let pool = templates.filter((t) => !used.has(t.id))
  if (!pool.length) pool = templates

  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * GET — crée l’offre du jour si absente (status PENDING).
 */
export const getOrCreateDailyOffer = async (userId, clientYmd) => {
  if (await notEligible(userId)) {
    return { eligible: false, reason: 'educator_or_admin' }
  }

  const ymd =
    clientYmd && /^\d{4}-\d{2}-\d{2}$/.test(clientYmd)
      ? clientYmd
      : new Date().toISOString().slice(0, 10)

  const day = dateFromYMD(ymd)

  const existing = await db.dailyHabitOffer.findUnique({
    where: { userId_offerDate: { userId, offerDate: day } },
    include: {
      template: true,
      habit: { select: { id: true, name: true, icon: true, xp: true } },
    },
  })

  if (existing) {
    return { eligible: true, offer: formatOffer(existing) }
  }

  const template = await pickTemplateForUser(userId, ymd)
  if (!template) {
    return { eligible: false, reason: 'no_templates' }
  }

  const created = await db.dailyHabitOffer.create({
    data: {
      userId,
      offerDate: day,
      templateId: template.id,
      status: 'PENDING',
    },
    include: {
      template: true,
      habit: { select: { id: true, name: true, icon: true, xp: true } },
    },
  })

  return { eligible: true, offer: formatOffer(created) }
}

export const dismissDailyOffer = async (userId, clientYmd) => {
  if (await notEligible(userId)) {
    throw { status: 403, message: 'Non disponible pour ce profil.' }
  }
  const ymd =
    clientYmd && /^\d{4}-\d{2}-\d{2}$/.test(clientYmd)
      ? clientYmd
      : new Date().toISOString().slice(0, 10)
  const day = dateFromYMD(ymd)

  const offer = await db.dailyHabitOffer.findUnique({
    where: { userId_offerDate: { userId, offerDate: day } },
  })
  if (!offer) throw { status: 404, message: 'Aucune offre pour ce jour.' }
  if (offer.status === 'ACCEPTED') {
    throw { status: 400, message: 'Déjà acceptée.' }
  }

  await db.dailyHabitOffer.update({
    where: { id: offer.id },
    data: { status: 'DISMISSED' },
  })
  return { ok: true }
}

export const acceptDailyOffer = async (userId, clientYmd) => {
  if (await notEligible(userId)) {
    throw { status: 403, message: 'Non disponible pour ce profil.' }
  }

  const ymd =
    clientYmd && /^\d{4}-\d{2}-\d{2}$/.test(clientYmd)
      ? clientYmd
      : new Date().toISOString().slice(0, 10)
  const day = dateFromYMD(ymd)

  const offer = await db.dailyHabitOffer.findUnique({
    where: { userId_offerDate: { userId, offerDate: day } },
    include: { template: true },
  })
  if (!offer) throw { status: 404, message: 'Aucune offre pour ce jour.' }
  if (offer.status === 'DISMISSED') {
    throw { status: 400, message: 'Offre déjà refusée.' }
  }
  if (offer.status === 'ACCEPTED' && offer.habitId) {
    const habit = await db.habit.findUnique({
      where: { id: offer.habitId },
    })
    const u = await db.user.findUnique({
      where: { id: userId },
      select: { cristaux: true },
    })
    return {
      ok: true,
      habit,
      alreadyAccepted: true,
      cristaux: u?.cristaux ?? 0,
      grantedOffre: false,
    }
  }

  const logsToday = await db.habitLog.count({
    where: { userId, date: day },
  })
  if (logsToday === 0) {
    throw {
      status: 400,
      message:
        'Coche au moins une habitude aujourd’hui avant d’accepter l’offre du jour.',
    }
  }

  const maxRow = await db.habit.aggregate({
    where: { userId },
    _max: { order: true },
  })
  const nextOrder = (maxRow._max.order ?? 0) + 1

  const grantOffre = !offer.cristauxGranted

  const { habit, cristaux } = await db.$transaction(async (tx) => {
    const h = await tx.habit.create({
      data: {
        userId,
        name: offer.template.title,
        icon: offer.template.icon,
        xp: offer.template.xpTotal,
        origin: 'DAILY_OFFER',
        weekdaysMask: 127,
        order: nextOrder,
      },
    })

    let balance
    if (grantOffre) {
      const u = await tx.user.update({
        where: { id: userId },
        data: { cristaux: { increment: 1 } },
        select: { cristaux: true },
      })
      balance = u.cristaux
      await tx.dailyHabitOffer.update({
        where: { id: offer.id },
        data: {
          status: 'ACCEPTED',
          habitId: h.id,
          cristauxGranted: true,
        },
      })
    } else {
      await tx.dailyHabitOffer.update({
        where: { id: offer.id },
        data: { status: 'ACCEPTED', habitId: h.id },
      })
      const u = await tx.user.findUnique({
        where: { id: userId },
        select: { cristaux: true },
      })
      balance = u?.cristaux ?? 0
    }

    return { habit: h, cristaux: balance }
  })

  return {
    ok: true,
    habit,
    alreadyAccepted: false,
    cristaux,
    grantedOffre: grantOffre,
  }
}
