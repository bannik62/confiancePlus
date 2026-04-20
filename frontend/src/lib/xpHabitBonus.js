/**
 * Bonus « toutes les habitudes du jour » — aligné sur `backend/src/core/gameConfig.js` + `computeDayXP`.
 * multiplicateur = max(1, bonusPerTask × nombre d’habitudes dues), appliqué à l’XP des habitudes cochées.
 */
export const HABIT_BONUS_PER_TASK = 0.2

export const habitDayMultiplier = (allDone, totalDue) =>
  allDone && totalDue > 0
    ? Math.max(1, HABIT_BONUS_PER_TASK * totalDue)
    : 1
