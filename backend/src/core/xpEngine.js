import { getGameConfigSync, GAME_DEFAULT } from './gameConfigRuntime.js'

// XP total requis pour atteindre un niveau donné
export const xpForLevel = (level) => {
  const GAME = getGameConfigSync()
  return Math.floor(GAME.levels.base * Math.pow(level, GAME.levels.exponent))
}

// Niveau correspondant à un total XP
export const levelFromXP = (totalXP) => {
  let level = 0
  while (xpForLevel(level + 1) <= totalXP) level++
  return level
}

// Progression dans le niveau actuel (pour la barre XP)
export const xpProgress = (totalXP) => {
  const level = levelFromXP(totalXP)
  const current = totalXP - xpForLevel(level)
  const required = xpForLevel(level + 1) - xpForLevel(level)
  return {
    level,
    current,
    required,
    percent: Math.round((current / required) * 100),
  }
}

// Titre et icône associés à un niveau (barème `GAME.titles` : défaut gameConfig.js, surcharge Admin).
// On prend le palier avec le plus grand `from` tel que `level >= from` — indépendant de l’ordre du
// tableau après merge JSON (l’ancien reverse().find() supposait un tri croissant par `from`).
export const titleForLevel = (level) => {
  const GAME = getGameConfigSync()
  const list = GAME.titles?.length ? GAME.titles : GAME_DEFAULT.titles
  if (!list?.length) return { from: 0, label: 'Débutant', icon: '🌱' }
  let best = null
  for (const t of list) {
    if (level < t.from) continue
    if (!best || t.from > best.from) best = t
  }
  if (best) return best
  const sorted = [...list].sort((a, b) => a.from - b.from)
  return sorted[0]
}

/**
 * Nombre max d’habitudes **actives** pour un niveau (plafonné).
 * Base → baseSlots ; ensuite +bonusPerLevel par niveau au-delà de levelAnchor.
 */
export const maxActiveHabitsForLevel = (level) => {
  const GAME = getGameConfigSync()
  const { baseSlots, levelAnchor, bonusPerLevel, absoluteMax } = GAME.habitSlots
  const n = Math.max(0, level - levelAnchor)
  const raw = baseSlots + bonusPerLevel * n
  return Math.min(absoluteMax, raw)
}

// XP gagné pour une journée donnée
// habits  : tableau des habitudes complétées ce jour ({xp})
// allDone : toutes les habitudes actives ont été cochées
// flags   : présence du check-in, journal, sommeil
export const computeDayXP = ({ habits, allDone, hasCheckin, hasJournal, hasSleep }) => {
  const GAME = getGameConfigSync()
  const habitXP = habits.reduce((sum, h) => sum + (h.xp ?? GAME.xp.habitBase), 0)
  const n = habits.length
  const mult =
    allDone && n > 0 ? Math.max(1, GAME.xp.bonusPerTask * n) : 1
  const habitTotal = habitXP * mult
  const extras =
    (hasCheckin ? GAME.xp.checkInBonus : 0) +
    (hasJournal ? GAME.xp.journalBonus : 0) +
    (hasSleep ? GAME.xp.sleepBonus : 0)
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
