import { computeDayXP } from './xpEngine.js'
import { isHabitDueOnYmd, ALL_WEEKDAYS_MASK } from '../lib/habitWeekdays.js'

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

export const ymdFromDbDate = (d) => {
  if (!d) return ''
  return d.toISOString().slice(0, 10)
}

/**
 * XP total jeu = Σ computeDayXP (jours avec activité, ≤ anchorYmd) + Σ xpEarned RDV.
 * Retourne aussi les dates pour le streak (habitudes + RDV).
 */
export function totalGameXpAndStreakDates({
  habits,
  habitLogs,
  dailyLogs,
  appointmentCompletions,
  anchorYmd,
}) {
  const anchor =
    typeof anchorYmd === 'string' && YMD_RE.test(anchorYmd)
      ? anchorYmd
      : new Date().toISOString().slice(0, 10)

  const apptXP = appointmentCompletions.reduce((s, c) => s + c.xpEarned, 0)
  const apptDates = appointmentCompletions.map((c) => ymdFromDbDate(c.date))

  const ymdSet = new Set()
  for (const l of habitLogs) ymdSet.add(ymdFromDbDate(l.date))
  for (const d of dailyLogs) ymdSet.add(ymdFromDbDate(d.date))

  const sortedYmds = [...ymdSet].filter((y) => y <= anchor).sort()

  let habitDailySum = 0
  for (const ymd of sortedYmds) {
    const dayLogs = habitLogs.filter((l) => ymdFromDbDate(l.date) === ymd)
    const activeHabits = habits.filter((h) => {
      const createdDate = ymdFromDbDate(h.createdAt)
      return (
        createdDate <= ymd &&
        h.isActive &&
        isHabitDueOnYmd(h.weekdaysMask ?? ALL_WEEKDAYS_MASK, ymd)
      )
    })
    const doneIds = new Set(dayLogs.map((l) => l.habitId))
    const allDone =
      activeHabits.length > 0 && activeHabits.every((h) => doneIds.has(h.id))

    const habitsPayload = dayLogs.map((l) => ({ xp: l.habit.xp }))
    const dl = dailyLogs.find((d) => ymdFromDbDate(d.date) === ymd)
    const moodN = dl?.mood != null ? Number(dl.mood) : NaN
    const hasCheckin = Number.isFinite(moodN) && moodN >= 1 && moodN <= 10
    const hasJournal = !!(dl?.journal && String(dl.journal).trim().length > 0)
    const hasSleep = dl?.sleepQuality != null && Number(dl.sleepQuality) > 0

    habitDailySum += computeDayXP({
      habits: habitsPayload,
      allDone,
      hasCheckin,
      hasJournal,
      hasSleep,
    })
  }

  const habitDates = [...new Set(habitLogs.map((l) => ymdFromDbDate(l.date)))]
  const streakDates = [...new Set([...habitDates, ...apptDates])]

  return {
    totalXP: habitDailySum + apptXP,
    streakDates,
  }
}
