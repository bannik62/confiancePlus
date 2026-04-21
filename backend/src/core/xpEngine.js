import { GAME } from './gameConfig.js'

// XP total requis pour atteindre un niveau donné
export const xpForLevel = (level) =>
  Math.floor(GAME.levels.base * Math.pow(level, GAME.levels.exponent))

// Niveau correspondant à un total XP
export const levelFromXP = (totalXP) => {
  let level = 0
  while (xpForLevel(level + 1) <= totalXP) level++
  return level
}

// Progression dans le niveau actuel (pour la barre XP)
export const xpProgress = (totalXP) => {
  const level    = levelFromXP(totalXP)
  const current  = totalXP - xpForLevel(level)
  const required = xpForLevel(level + 1) - xpForLevel(level)
  return {
    level,
    current,
    required,
    percent: Math.round((current / required) * 100),
  }
}

// Titre et icône associés à un niveau
export const titleForLevel = (level) =>
  [...GAME.titles].reverse().find((t) => level >= t.from) ?? GAME.titles[0]

/**
 * Nombre max d’habitudes **actives** pour un niveau (plafonné).
 * Niveaux 0–5 → 10 ; ensuite +2 par niveau jusqu’à absoluteMax.
 */
export const maxActiveHabitsForLevel = (level) => {
  const { levelAnchor, bonusPerLevel, absoluteMax } = GAME.habitSlots
  const n = Math.max(0, level - levelAnchor)
  const raw = 10 + bonusPerLevel * n
  return Math.min(absoluteMax, raw)
}

// XP gagné pour une journée donnée
// habits  : tableau des habitudes complétées ce jour ({xp})
// allDone : toutes les habitudes actives ont été cochées
// flags   : présence du check-in, journal, sommeil
export const computeDayXP = ({ habits, allDone, hasCheckin, hasJournal, hasSleep }) => {
  const habitXP = habits.reduce((sum, h) => sum + (h.xp ?? GAME.xp.habitBase), 0)
  const n = habits.length
  const mult =
    allDone && n > 0
      ? Math.max(1, GAME.xp.bonusPerTask * n)
      : 1
  const habitTotal = habitXP * mult
  const extras  = (hasCheckin ? GAME.xp.checkInBonus : 0)
                + (hasJournal ? GAME.xp.journalBonus  : 0)
                + (hasSleep   ? GAME.xp.sleepBonus    : 0)
  return Math.round(habitTotal + extras)
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Streak : jours civils consécutifs se terminant à `anchorYmd` (souvent le jour local client).
 */
export const computeStreak = (logDates, anchorYmd) => {
  if (!logDates.length) return 0

  const sorted = [...new Set(logDates)].sort().reverse()
  const today =
    typeof anchorYmd === 'string' && YMD_RE.test(anchorYmd)
      ? anchorYmd
      : new Date().toISOString().slice(0, 10)

  let streak = 0
  let expected = today

  for (const date of sorted) {
    if (date === expected) {
      streak++
      const d = new Date(`${expected}T12:00:00.000Z`)
      d.setUTCDate(d.getUTCDate() - 1)
      expected = d.toISOString().slice(0, 10)
    } else {
      break
    }
  }

  return streak
}
