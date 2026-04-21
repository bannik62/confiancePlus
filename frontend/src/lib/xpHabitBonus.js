/**
 * Bonus « toutes les habitudes du jour » — aligné sur le serveur (`computeDayXP`).
 * multiplicateur = max(1, bonusPerTask × nombre d’habitudes dues), appliqué à l’XP des habitudes cochées.
 * Passe `bonusPerTask` depuis `gameplayStore` quand chargé.
 */
export const HABIT_BONUS_PER_TASK = 0.2

export const habitDayMultiplier = (allDone, totalDue, bonusPerTask = HABIT_BONUS_PER_TASK) =>
  allDone && totalDue > 0 ? Math.max(1, bonusPerTask * totalDue) : 1
