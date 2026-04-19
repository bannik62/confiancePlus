import { db } from '../../core/db.js'
import { isHabitDueOnYmd, ALL_WEEKDAYS_MASK } from '../../lib/habitWeekdays.js'

const dateFromYMD = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0))
}

/**
 * @returns {Promise<boolean>} true s'il reste au moins une habitude due ce jour non cochée
 */
export const userHasPendingDueHabits = async (userId, clientTodayYmd) => {
  const habits = await db.habit.findMany({
    where: {
      userId,
      isActive: true,
      createdAt: { lte: dateFromYMD(clientTodayYmd) },
    },
    select: { id: true, weekdaysMask: true },
  })
  const due = habits.filter((h) =>
    isHabitDueOnYmd(h.weekdaysMask ?? ALL_WEEKDAYS_MASK, clientTodayYmd),
  )
  if (due.length === 0) return false

  const day = dateFromYMD(clientTodayYmd)
  const logs = await db.habitLog.findMany({
    where: { userId, date: day },
    select: { habitId: true },
  })
  const done = new Set(logs.map((l) => l.habitId))
  return due.some((h) => !done.has(h.id))
}
