import { computeDayXP } from './xpEngine.js'
import { isHabitDueOnYmd, ALL_WEEKDAYS_MASK } from '../lib/habitWeekdays.js'

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

/** Fenêtre glissante pour XP + streak (perf) — mois calendaires via setUTCMonth */
export const AGGREGATION_HISTORY_MONTHS = 5

export const ymdFromDbDate = (d) => {
  if (!d) return ''
  return d.toISOString().slice(0, 10)
}

/** Midi UTC aligné sur les @db.Date du schéma */
export const dateFromYmdUtcNoon = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0))
}

/**
 * Borne basse YMD : N mois avant anchor (même jour quand possible).
 */
export const aggregationMinYmd = (anchorYmd, months = AGGREGATION_HISTORY_MONTHS) => {
  const [y, m, d] = anchorYmd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0))
  dt.setUTCMonth(dt.getUTCMonth() - months)
  return dt.toISOString().slice(0, 10)
}

/**
 * Filtre Prisma sur `date` (@db.Date) : [minYmd, anchorYmd] inclus.
 */
export const aggregationWindowDateWhere = (anchorYmd) => {
  const minYmd = aggregationMinYmd(anchorYmd)
  return {
    gte: dateFromYmdUtcNoon(minYmd),
    lte: dateFromYmdUtcNoon(anchorYmd),
  }
}

/**
 * XP total jeu = Σ computeDayXP (jours avec activité dans la fenêtre, ≤ anchorYmd)
 * + Σ xpEarned RDV dans la fenêtre.
 *
 * Streak : jours où au moins une habitude a été cochée (pas les seuls RDV ni seul check-in).
 * Données limitées à la même fenêtre glissante (cohérent avec le tri / perf).
 */
export function totalGameXpAndStreakDates({
  habits,
  habitLogs,
  dailyLogs,
  appointmentCompletions,
  anchorYmd,
  /** @type {Map<string, Set<string>> | null} */ habitSkipsByYmd = null,
}) {
  const anchor =
    typeof anchorYmd === 'string' && YMD_RE.test(anchorYmd)
      ? anchorYmd
      : new Date().toISOString().slice(0, 10)

  const minYmd = aggregationMinYmd(anchor)

  const inWindow = (ymd) => ymd >= minYmd && ymd <= anchor

  const habitLogsF = habitLogs.filter((l) => inWindow(ymdFromDbDate(l.date)))
  const dailyLogsF = dailyLogs.filter((d) => inWindow(ymdFromDbDate(d.date)))
  const appointmentCompletionsF = appointmentCompletions.filter((c) =>
    inWindow(ymdFromDbDate(c.date)),
  )

  const apptXP = appointmentCompletionsF.reduce((s, c) => s + c.xpEarned, 0)

  const ymdSet = new Set()
  for (const l of habitLogsF) ymdSet.add(ymdFromDbDate(l.date))
  for (const d of dailyLogsF) ymdSet.add(ymdFromDbDate(d.date))

  const sortedYmds = [...ymdSet].filter((y) => y <= anchor).sort()

  let habitDailySum = 0
  for (const ymd of sortedYmds) {
    const dayLogs = habitLogsF.filter((l) => ymdFromDbDate(l.date) === ymd)
    const skipSet = habitSkipsByYmd?.get(ymd) ?? new Set()
    const activeHabits = habits.filter((h) => {
      const createdDate = ymdFromDbDate(h.createdAt)
      return (
        createdDate <= ymd &&
        h.isActive &&
        !skipSet.has(h.id) &&
        isHabitDueOnYmd(h.weekdaysMask ?? ALL_WEEKDAYS_MASK, ymd)
      )
    })
    const doneIds = new Set(dayLogs.map((l) => l.habitId))
    const allDone =
      activeHabits.length > 0 && activeHabits.every((h) => doneIds.has(h.id))

    const habitsPayload = dayLogs.map((l) => ({ xp: l.habit.xp }))
    const dl = dailyLogsF.find((d) => ymdFromDbDate(d.date) === ymd)
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

  const habitDates = [...new Set(habitLogsF.map((l) => ymdFromDbDate(l.date)))]
  const streakDates = habitDates.filter((y) => y <= anchor)

  return {
    totalXP: habitDailySum + apptXP,
    streakDates,
  }
}
