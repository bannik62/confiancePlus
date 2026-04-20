import { db } from './db.js'
import { isHabitDueOnYmd, ALL_WEEKDAYS_MASK } from '../lib/habitWeekdays.js'
import { ymdFromDbDate } from './xpAggregate.js'

/** Fenêtre chargée (jours civils) + pas max dans la chaîne — perf, aligné demande « 10 j ». */
export const STREAK_CHAIN_MAX_DAYS = 10

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

export const prevCalendarYmd = (ymd) => {
  const d = new Date(`${ymd}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/** `anchor` inclus : recule de `delta` jours (delta = 9 → 10 jours [anchor-9 .. anchor]). */
export const ymdMinusDays = (anchorYmd, delta) => {
  let y = anchorYmd
  for (let i = 0; i < delta; i++) y = prevCalendarYmd(y)
  return y
}

const createdYmd = (createdAt) => ymdFromDbDate(createdAt)

/** Au moins la moitié des habitudes dues ce jour (arrondi sup). */
export const passesHalfDueHabits = (habits, logsForDay, ymd) => {
  const due = habits.filter((h) => {
    if (!h.isActive) return false
    if (createdYmd(h.createdAt) > ymd) return false
    return isHabitDueOnYmd(h.weekdaysMask ?? ALL_WEEKDAYS_MASK, ymd)
  })
  if (due.length === 0) return true
  const doneIds = logsForDay ? new Set(logsForDay.map((l) => l.habitId)) : new Set()
  const done = due.filter((h) => doneIds.has(h.id)).length
  const need = Math.ceil(due.length / 2)
  return done >= need
}

/**
 * Streak « flamme » : visite le jour ; jours passés : ≥ 50 % des habitudes dues.
 * Aujourd’hui : visite suffit pour +1.
 */
export const computeEngagementStreak = ({
  anchorYmd,
  visitYmds,
  habits,
  habitLogsInWindow,
}) => {
  if (!YMD_RE.test(anchorYmd)) return 0
  const visits = new Set(visitYmds)
  const logsByYmd = new Map()
  for (const l of habitLogsInWindow) {
    const y = ymdFromDbDate(l.date)
    if (!logsByYmd.has(y)) logsByYmd.set(y, [])
    logsByYmd.get(y).push(l)
  }

  let d = anchorYmd
  let count = 0
  for (let step = 0; step < STREAK_CHAIN_MAX_DAYS; step++) {
    if (!visits.has(d)) break
    if (d < anchorYmd) {
      const logs = logsByYmd.get(d) || []
      if (!passesHalfDueHabits(habits, logs, d)) break
    }
    count++
    d = prevCalendarYmd(d)
  }
  return count
}

export const recordDailyVisit = async (userId, ymd) => {
  await db.dailyVisit.upsert({
    where: { userId_ymd: { userId, ymd } },
    create: { userId, ymd },
    update: {},
  })
}
