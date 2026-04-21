import { db } from '../../core/db.js'
import { userIsAssociationOwner } from '../group/educatorScope.js'
import { userIsAppAdmin } from '../admin/adminScope.js'
import { assertActiveHabitSlotAvailable, getHabitSlotInfo } from './habitSlotGuard.js'

/** YYYY-MM-DD → Date midi UTC (@db.Date) */
const dateFromYMD = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0))
}

/** Même normalisation pour titre de modèle et nom d’habitude (dédup) */
export const normalizeDailyOfferTitle = (s) =>
  String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

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
 * Parmi les templates actifs, exclut ceux dont le titre normalisé = nom d’habitude déjà présent.
 * Pas de repli sur tout le catalogue si le pool est vide.
 */
export const pickTemplateForUser = async (userId) => {
  const templates = await db.dailyHabitTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  })
  if (!templates.length) return { template: null, reason: 'no_templates' }

  const habits = await db.habit.findMany({
    where: { userId, isActive: true },
    select: { name: true },
  })
  const taken = new Set(habits.map((h) => normalizeDailyOfferTitle(h.name)))

  const pool = templates.filter(
    (t) => !taken.has(normalizeDailyOfferTitle(t.title)),
  )
  if (!pool.length) return { template: null, reason: 'exhausted' }

  const template = pool[Math.floor(Math.random() * pool.length)]
  return { template, reason: null }
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

  const slotInfo = await getHabitSlotInfo(userId, ymd)
  const slotFull = slotInfo.activeHabitCount >= slotInfo.maxActiveHabits

  if (existing) {
    return { eligible: true, offer: formatOffer(existing), slotFull }
  }

  if (slotFull) {
    return { eligible: true, slotFull: true, offer: null }
  }

  const pick = await pickTemplateForUser(userId)
  if (!pick.template) {
    if (pick.reason === 'exhausted') {
      return { eligible: true, exhausted: true, offer: null, slotFull: false }
    }
    return { eligible: false, reason: 'no_templates' }
  }

  const created = await db.dailyHabitOffer.create({
    data: {
      userId,
      offerDate: day,
      templateId: pick.template.id,
      status: 'PENDING',
    },
    include: {
      template: true,
      habit: { select: { id: true, name: true, icon: true, xp: true } },
    },
  })

  return { eligible: true, offer: formatOffer(created), slotFull: false }
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

  await assertActiveHabitSlotAvailable(userId, ymd)

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
