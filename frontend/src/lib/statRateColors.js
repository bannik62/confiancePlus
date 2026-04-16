/**
 * Stats « taux sur la globalité des tâches » (0–100 %).
 * 5 paliers : 0–19, 20–39, 40–59, 60–79, 80–100.
 * Dégradés « lever de soleil » et labels dans `theme.css` (--stat-global-bar-*, -fill-*, -text-*).
 */

/** @param {number} rate */
export const globalTaskRateBand = (rate) => {
  const r = Math.max(0, Math.min(100, Number(rate) || 0))
  if (r < 20) return 0
  if (r < 40) return 1
  if (r < 60) return 2
  if (r < 80) return 3
  return 4
}

/** Dégradé barres verticales (7 jours) */
/** @param {number} rate */
export const globalTaskRateBarBg = (rate) => `var(--stat-global-bar-${globalTaskRateBand(rate)})`

/** Dégradé barres horizontales (par habitude) */
/** @param {number} rate */
export const globalTaskRateFillBg = (rate) => `var(--stat-global-fill-${globalTaskRateBand(rate)})`

/** Couleur du pourcentage (lisible, assortie au palier) */
/** @param {number} rate */
export const globalTaskRateLabelColor = (rate) => `var(--stat-global-text-${globalTaskRateBand(rate)})`
