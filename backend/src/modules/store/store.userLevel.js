import { db } from '../../core/db.js'
import { levelFromXP } from '../../core/xpEngine.js'
import { totalGameXpAndStreakDates, aggregationWindowDateWhere } from '../../core/xpAggregate.js'
import { buildHabitSkipsByYmd } from '../../core/streakService.js'

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/
const utcCalendarYmd = () => new Date().toISOString().slice(0, 10)

/**
 * Niveau joueur pour la boutique (sans recordDailyVisit ni effets de bord profil).
 * @param {string} userId
 * @param {string} [clientToday]
 */
export async function getUserLevelForAnchor(userId, clientToday) {
  const anchor = clientToday && YMD_RE.test(clientToday) ? clientToday : utcCalendarYmd()
  const dateWhere = aggregationWindowDateWhere(anchor)
  const [habits, logs, dailyLogs, apptDone, skipRows] = await Promise.all([
    db.habit.findMany({
      where: { userId },
      select: { id: true, weekdaysMask: true, createdAt: true, isActive: true },
    }),
    db.habitLog.findMany({
      where: { userId, date: dateWhere },
      include: { habit: { select: { xp: true } } },
    }),
    db.dailyLog.findMany({ where: { userId, date: dateWhere } }),
    db.appointmentCompletion.findMany({
      where: { userId, date: dateWhere },
      select: { date: true, xpEarned: true },
    }),
    db.habitDaySkip.findMany({
      where: { userId, date: dateWhere },
      select: { habitId: true, date: true },
    }),
  ])
  const habitSkipsByYmd = buildHabitSkipsByYmd(skipRows)
  const { totalXP } = totalGameXpAndStreakDates({
    habits,
    habitLogs: logs,
    dailyLogs,
    appointmentCompletions: apptDone,
    anchorYmd: anchor,
    habitSkipsByYmd,
  })
  return levelFromXP(totalXP)
}
