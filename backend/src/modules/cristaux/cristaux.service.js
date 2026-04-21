import { Prisma } from '@prisma/client'
import { db } from '../../core/db.js'
import { getLocalYmd, addDaysToYmd } from '../../lib/timezoneLocal.js'
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
 * Toutes les habitudes actives dues ce jour-là ont un log (hors « impossibles »).
 */
const isJourneeParfaiteForYmd = async (userId, ymd) => {
  const habits = await db.habit.findMany({
    where: { userId, isActive: true },
    select: { id: true, weekdaysMask: true },
  })
  const due = habits.filter((h) =>
    isHabitDueOnYmd(h.weekdaysMask ?? ALL_WEEKDAYS_MASK, ymd),
  )
  if (due.length === 0) return false

  const day = dateFromYMD(ymd)
  const skippedRows = await db.habitDaySkip.findMany({
    where: { userId, date: day },
    select: { habitId: true },
  })
  const skipped = new Set(skippedRows.map((r) => r.habitId))
  const dueEffective = due.filter((h) => !skipped.has(h.id))
  if (dueEffective.length === 0) return false

  const logs = await db.habitLog.findMany({
    where: {
      userId,
      date: day,
      habitId: { in: dueEffective.map((h) => h.id) },
    },
    select: { habitId: true },
  })
  return logs.length === dueEffective.length
}

/**
 * 1 cristal par jour civil **clos** (strictement avant aujourd’hui local) où la journée était parfaite.
 * À appeler après connexion /me (et après toggle pour rafraîchir vite le solde).
 * @returns {{ cristaux: number, grantedJourneeParfaite: boolean }}
 */
export const tryGrantClosedDayJourneeParfaite = async (userId) => {
  if (await skipPersonalEconomy(userId)) {
    const u = await db.user.findUnique({
      where: { id: userId },
      select: { cristaux: true },
    })
    return { cristaux: u?.cristaux ?? 0, grantedJourneeParfaite: false }
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      cristaux: true,
      ianaTimezone: true,
      createdAt: true,
    },
  })
  if (!user) return { cristaux: 0, grantedJourneeParfaite: false }

  const tz = user.ianaTimezone
  const yesterday = addDaysToYmd(getLocalYmd(tz, new Date()), -1)

  const maxGrant = await db.cristalJourneeParfaiteGrant.findFirst({
    where: { userId },
    orderBy: { ymd: 'desc' },
    select: { ymd: true },
  })
  const startCandidate = maxGrant
    ? addDaysToYmd(maxGrant.ymd, 1)
    : getLocalYmd(tz, user.createdAt)

  if (startCandidate > yesterday) {
    return { cristaux: user.cristaux, grantedJourneeParfaite: false }
  }

  let cristauxBalance = user.cristaux
  let anyGranted = false

  let d = startCandidate
  while (d <= yesterday) {
    if (!(await isJourneeParfaiteForYmd(userId, d))) {
      d = addDaysToYmd(d, 1)
      continue
    }
    try {
      const updated = await db.$transaction(async (tx) => {
        await tx.cristalJourneeParfaiteGrant.create({
          data: { userId, ymd: d },
        })
        return tx.user.update({
          where: { id: userId },
          data: {
            cristaux: { increment: 1 },
            lastCristalJourneeParfaiteYmd: d,
          },
          select: { cristaux: true },
        })
      })
      cristauxBalance = updated.cristaux
      anyGranted = true
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        // Déjà crédité (course / requête concurrente)
      } else {
        throw e
      }
    }
    d = addDaysToYmd(d, 1)
  }

  return { cristaux: cristauxBalance, grantedJourneeParfaite: anyGranted }
}
