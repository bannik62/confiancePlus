import { db } from './db.js'
import { isHabitDueOnYmd, ALL_WEEKDAYS_MASK } from '../lib/habitWeekdays.js'
import { ymdFromDbDate } from './xpAggregate.js'

/** Fenêtre chargée (jours civils) + pas max dans la chaîne — perf, aligné demande « 10 j ». */
export const STREAK_CHAIN_MAX_DAYS = 10

/** Coût sauvetage streak (M1 : cristaux uniquement). */
export const STREAK_RECOVER_CRISTAUX_COST = 5

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

const dateNoonUtc = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0))
}

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

/**
 * @param {Array<{ habitId: string, date: Date }>} rows
 * @returns {Map<string, Set<string>>} ymd → habitIds « passés » ce jour
 */
export const buildHabitSkipsByYmd = (rows) => {
  const m = new Map()
  for (const r of rows) {
    const y = ymdFromDbDate(r.date)
    if (!m.has(y)) m.set(y, new Set())
    m.get(y).add(r.habitId)
  }
  return m
}

/**
 * Au moins la moitié des habitudes dues ce jour (arrondi sup).
 * `habitSkipsByYmd` : habitudes exclues du quota « dues » (passage déclaré).
 */
export const passesHalfDueHabits = (habits, logsForDay, ymd, habitSkipsByYmd = null) => {
  const skipForDay = habitSkipsByYmd?.get(ymd) ?? new Set()
  const due = habits.filter((h) => {
    if (!h.isActive) return false
    if (createdYmd(h.createdAt) > ymd) return false
    if (skipForDay.has(h.id)) return false
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
  habitSkipsByYmd = null,
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
      if (!passesHalfDueHabits(habits, logs, d, habitSkipsByYmd)) break
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

/**
 * Premier jour (en remontant depuis hier) où la chaîne « visite + 50 % » casse — pour le message utilisateur.
 */
export const diagnoseStreakBreakReason = ({
  anchorYmd,
  visitYmds,
  habits,
  habitLogsInWindow,
  habitSkipsByYmd = null,
}) => {
  if (!YMD_RE.test(anchorYmd)) return 'unknown'
  const visits = new Set(visitYmds)
  const logsByYmd = new Map()
  for (const l of habitLogsInWindow) {
    const y = ymdFromDbDate(l.date)
    if (!logsByYmd.has(y)) logsByYmd.set(y, [])
    logsByYmd.get(y).push(l)
  }

  let d = prevCalendarYmd(anchorYmd)
  for (let i = 0; i < STREAK_CHAIN_MAX_DAYS; i++) {
    if (!visits.has(d)) return 'missed_visit'
    const logs = logsByYmd.get(d) || []
    if (!passesHalfDueHabits(habits, logs, d, habitSkipsByYmd)) return 'half_habits'
    d = prevCalendarYmd(d)
  }
  return 'unknown'
}

/**
 * Habitudes dues un jour donné (actives, créées avant ou ce jour).
 */
const habitsDueOnYmd = (habits, ymd) =>
  habits.filter((h) => {
    if (!h.isActive) return false
    if (createdYmd(h.createdAt) > ymd) return false
    return isHabitDueOnYmd(h.weekdaysMask ?? ALL_WEEKDAYS_MASK, ymd)
  })

/**
 * Identifiants d’habitudes à cocher en plus pour atteindre la moitié des dues (ordre stable).
 */
const minimalExtraHabitIdsForHalf = (dueHabits, doneIds) => {
  const need = Math.ceil(dueHabits.length / 2)
  const done = dueHabits.filter((h) => doneIds.has(h.id)).length
  if (done >= need) return []
  const missing = dueHabits
    .filter((h) => !doneIds.has(h.id))
    .sort((a, b) => a.id.localeCompare(b.id))
  return missing.slice(0, need - done).map((h) => h.id)
}

/**
 * Plan de sauvetage « au plus un jour civil » : uniquement **hier** (par rapport à `anchorYmd`).
 */
export const planYesterdayStreakRecovery = ({
  anchorYmd,
  visitYmds,
  habits,
  habitLogsInWindow,
  habitSkipsByYmd = null,
}) => {
  if (!YMD_RE.test(anchorYmd)) return null
  const recoverYmd = prevCalendarYmd(anchorYmd)
  const visits = new Set(visitYmds)

  const logsByYmd = new Map()
  for (const l of habitLogsInWindow) {
    const y = ymdFromDbDate(l.date)
    if (!logsByYmd.has(y)) logsByYmd.set(y, [])
    logsByYmd.get(y).push(l)
  }

  const logsY = logsByYmd.get(recoverYmd) || []
  const needVisit = !visits.has(recoverYmd)
  const skipRecover = habitSkipsByYmd?.get(recoverYmd) ?? new Set()
  const due = habitsDueOnYmd(habits, recoverYmd).filter((h) => !skipRecover.has(h.id))
  const doneIds = new Set(logsY.map((l) => l.habitId))
  const halfOk = passesHalfDueHabits(habits, logsY, recoverYmd, habitSkipsByYmd)

  if (!needVisit && halfOk) return null

  const extraHabitIds = minimalExtraHabitIdsForHalf(due, doneIds)

  const visitsSim = new Set(visits)
  if (needVisit) visitsSim.add(recoverYmd)

  const synthetic = extraHabitIds.map((habitId) => ({
    habitId,
    date: dateNoonUtc(recoverYmd),
  }))
  const logsSim = [...habitLogsInWindow, ...synthetic]

  const streakBefore = computeEngagementStreak({
    anchorYmd,
    visitYmds:         [...visits],
    habits,
    habitLogsInWindow,
    habitSkipsByYmd,
  })
  const streakAfter = computeEngagementStreak({
    anchorYmd,
    visitYmds:         [...visitsSim],
    habits,
    habitLogsInWindow: logsSim,
    habitSkipsByYmd,
  })

  if (streakAfter <= streakBefore) return null

  return {
    recoverYmd:   recoverYmd,
    needVisit,
    extraHabitIds,
    streakBefore,
    streakAfter,
  }
}
