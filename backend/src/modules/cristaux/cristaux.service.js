import { db } from '../../core/db.js'
import { getLocalYmd } from '../../lib/timezoneLocal.js'
import {
  ALL_WEEKDAYS_MASK,
  isHabitDueOnYmd,
} from '../../lib/habitWeekdays.js'
import { userIsAssociationOwner } from '../group/educatorScope.js'
import { userIsAppAdmin } from '../admin/adminScope.js'

/** YYYY-MM-DD → Date midi UTC (@db.Date) — aligné habits / daily-offer */
const dateFromYMD = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0))
}

const skipPersonalEconomy = async (userId) =>
  (await userIsAssociationOwner(userId)) || (await userIsAppAdmin(userId))

/**
 * 1 cristal / jour civil local à la « connexion » (login, /me, etc.).
 * @returns {{ cristaux: number, grantedConnexion: boolean }}
 */
export const tryGrantConnexionQuotidienne = async (userId) => {
  if (await skipPersonalEconomy(userId)) {
    const u = await db.user.findUnique({
      where: { id: userId },
      select: { cristaux: true },
    })
    return { cristaux: u?.cristaux ?? 0, grantedConnexion: false }
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { ianaTimezone: true, lastCristalConnexionYmd: true, cristaux: true },
  })
  if (!user) return { cristaux: 0, grantedConnexion: false }

  const ymd = getLocalYmd(user.ianaTimezone, new Date())
  if (user.lastCristalConnexionYmd === ymd) {
    return { cristaux: user.cristaux, grantedConnexion: false }
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      cristaux: { increment: 1 },
      lastCristalConnexionYmd: ymd,
    },
    select: { cristaux: true },
  })
  return { cristaux: updated.cristaux, grantedConnexion: true }
}

/**
 * 1 cristal quand toutes les habitudes actives **dues** ce jour-là ont un log.
 * @returns {{ cristaux: number, grantedJourneeParfaite: boolean }}
 */
export const tryGrantJourneeParfaite = async (userId, ymd) => {
  if (await skipPersonalEconomy(userId)) {
    const u = await db.user.findUnique({
      where: { id: userId },
      select: { cristaux: true },
    })
    return { cristaux: u?.cristaux ?? 0, grantedJourneeParfaite: false }
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { cristaux: true, lastCristalJourneeParfaiteYmd: true, ianaTimezone: true },
  })
  if (!user) return { cristaux: 0, grantedJourneeParfaite: false }

  const localToday = getLocalYmd(user.ianaTimezone, new Date())
  if (ymd !== localToday) {
    return { cristaux: user.cristaux, grantedJourneeParfaite: false }
  }

  if (user.lastCristalJourneeParfaiteYmd === ymd) {
    return { cristaux: user.cristaux, grantedJourneeParfaite: false }
  }

  const habits = await db.habit.findMany({
    where: { userId, isActive: true },
    select: { id: true, weekdaysMask: true },
  })
  const due = habits.filter((h) =>
    isHabitDueOnYmd(h.weekdaysMask ?? ALL_WEEKDAYS_MASK, ymd),
  )
  if (due.length === 0) {
    return { cristaux: user.cristaux, grantedJourneeParfaite: false }
  }

  const day = dateFromYMD(ymd)
  const logs = await db.habitLog.findMany({
    where: {
      userId,
      date: day,
      habitId: { in: due.map((h) => h.id) },
    },
    select: { habitId: true },
  })
  if (logs.length !== due.length) {
    return { cristaux: user.cristaux, grantedJourneeParfaite: false }
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      cristaux: { increment: 1 },
      lastCristalJourneeParfaiteYmd: ymd,
    },
    select: { cristaux: true },
  })
  return { cristaux: updated.cristaux, grantedJourneeParfaite: true }
}
