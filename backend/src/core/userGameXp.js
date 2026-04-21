import { db } from './db.js'
import {
  totalGameXpAndStreakDates,
  aggregationWindowDateWhere,
} from './xpAggregate.js'
import { buildHabitSkipsByYmd } from './streakService.js'

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

const utcCalendarYmd = () => new Date().toISOString().slice(0, 10)

/**
 * XP totale jeu (même agrégation que le profil / classement).
 * @param {string} userId
 * @param {string} [clientToday] — YYYY-MM-DD anchor (fuseau client idéal)
 */
export const getUserTotalGameXp = async (userId, clientToday) => {
  const anchor =
    clientToday && YMD_RE.test(clientToday) ? clientToday : utcCalendarYmd()
  const dateWhere = aggregationWindowDateWhere(anchor)

  const habits = await db.habit.findMany({
    where: { userId },
    select: { id: true, weekdaysMask: true, createdAt: true, isActive: true },
  })

  const logs = await db.habitLog.findMany({
    where: { userId, date: dateWhere },
    include: { habit: { select: { xp: true } } },
  })

  const dailyLogs = await db.dailyLog.findMany({ where: { userId, date: dateWhere } })

  const apptDone = await db.appointmentCompletion.findMany({
    where: { userId, date: dateWhere },
    select: { date: true, xpEarned: true },
  })

  const skipRows = await db.habitDaySkip.findMany({
    where: { userId, date: dateWhere },
    select: { habitId: true, date: true },
  })
  const habitSkipsByYmd = buildHabitSkipsByYmd(skipRows)

  const { totalXP } = totalGameXpAndStreakDates({
    habits,
    habitLogs: logs,
    dailyLogs,
    appointmentCompletions: apptDone,
    anchorYmd: anchor,
    habitSkipsByYmd,
  })

  return totalXP
}
