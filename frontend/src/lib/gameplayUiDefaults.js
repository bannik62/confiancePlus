/**
 * Durées d’animation UI (ms) — alignées sur `backend/src/core/gameConfig.js` → `ui.animations`.
 * Utilisées comme repli si le store gameplay n’est pas chargé ou une clé manque.
 */
export const DEFAULT_UI_ANIMATIONS = {
  countUpDefault: 1100,
  homeTotalXp: 1200,
  homeToday: 750,
  homeCombined: 900,
  statsCountUp: 850,
  statsBarsCss: 650,
  statsLeaderboardXp: 1000,
  statsLeaderboardTag: 700,
  insightsTitle: 900,
  insightsBody: 700,
  profilTotalXp: 1200,
}

/**
 * @param {null | { ui?: { animations?: Partial<typeof DEFAULT_UI_ANIMATIONS> } }} gameplay
 * @param {keyof typeof DEFAULT_UI_ANIMATIONS} key
 */
export function animMs(gameplay, key) {
  const v = gameplay?.ui?.animations?.[key]
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return v
  return DEFAULT_UI_ANIMATIONS[key] ?? DEFAULT_UI_ANIMATIONS.countUpDefault
}
