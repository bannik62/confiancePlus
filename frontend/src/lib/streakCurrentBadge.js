/**
 * Badge de série « actuelle » : un seul visuel = plus grand palier tel que streak >= at
 * (perte de flamme → streak 0 → aucun badge ; à 14 j le visuel 14 remplace 7).
 */

/** @type {{ at: number, src: string }[]} */
export const DEFAULT_STREAK_BADGE_SHOW = [
  { at: 7, src: '/badges/fireStreackBadge/1000002186.png' },
  { at: 14, src: '/badges/fireStreackBadge/badge14Days.png' },
]

/**
 * @param {number | string | null | undefined} streak
 * @param {any} [gameplay] valeur du store gameplay (GET /content/gameplay)
 * @returns {string | null}
 */
export function currentStreakBadgeSrc(streak, gameplay) {
  const n = Math.max(0, Math.floor(Number(streak) || 0))
  const raw = gameplay?.streak?.badgeShow
  const list =
    Array.isArray(raw) && raw.length > 0
      ? [...raw].sort((a, b) => Number(a.at) - Number(b.at))
      : DEFAULT_STREAK_BADGE_SHOW
  /** @type {string | null} */
  let best = null
  for (const row of list) {
    const at = Number(row?.at)
    const src = typeof row?.src === 'string' ? row.src.trim() : ''
    if (!Number.isFinite(at) || at < 1 || !src) continue
    if (n >= at) best = src
  }
  return best
}
