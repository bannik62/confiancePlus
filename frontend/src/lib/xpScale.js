/**
 * Formules alignées sur `backend/src/core/xpEngine.js` (lecture depuis la config gameplay publique).
 */

const DEFAULT_TITLES = [
  { from: 0, label: 'Semeur d’habitudes', icon: '🌱' },
  { from: 5, label: 'Cultivateur de constance', icon: '⚡' },
  { from: 10, label: 'Jardinier de gestes', icon: '🔥' },
  { from: 20, label: 'Récolteur des saisons', icon: '🛡️' },
  { from: 35, label: 'Gardien du verger', icon: '🏆' },
  { from: 50, label: 'Ce qui est en haut est en bas', icon: '💎' },
]

/**
 * @param {Record<string, unknown> | null | undefined} g
 * @param {number} level
 */
export const xpForLevelFromConfig = (g, level) => {
  const base = Number(g?.levels?.base) > 0 ? Number(g.levels.base) : 100
  const exponent =
    Number(g?.levels?.exponent) > 0 && Number.isFinite(Number(g?.levels?.exponent))
      ? Number(g.levels.exponent)
      : 1.8
  const L = Math.max(0, Math.floor(Number(level) || 0))
  return Math.floor(base * Math.pow(L, exponent))
}

/**
 * @param {Record<string, unknown> | null | undefined} g
 * @param {number} level
 */
export const maxActiveHabitsFromConfig = (g, level) => {
  const hs = g?.habitSlots ?? {}
  const baseSlots = Number(hs.baseSlots) > 0 ? Number(hs.baseSlots) : 10
  const levelAnchor = Number.isFinite(Number(hs.levelAnchor)) ? Number(hs.levelAnchor) : 5
  const bonusPerLevel = Number(hs.bonusPerLevel) >= 0 ? Number(hs.bonusPerLevel) : 2
  const absoluteMax = Number(hs.absoluteMax) > 0 ? Number(hs.absoluteMax) : 20
  const lv = Math.max(0, Math.floor(Number(level) || 0))
  const n = Math.max(0, lv - levelAnchor)
  const raw = baseSlots + bonusPerLevel * n
  return Math.min(absoluteMax, raw)
}

/**
 * @param {Record<string, unknown> | null | undefined} g
 * @param {number} level
 */
export const titleForLevelFromConfig = (g, level) => {
  const list = Array.isArray(g?.titles) && g.titles.length ? g.titles : DEFAULT_TITLES
  if (!list?.length) return { from: 0, label: 'Débutant', icon: '🌱' }
  const lv = Math.floor(Number(level) || 0)
  let best = null
  for (const t of list) {
    const from = Number(t?.from)
    if (!Number.isFinite(from) || lv < from) continue
    if (!best || from > Number(best.from)) best = t
  }
  if (best) return { ...best, from: Number(best.from) }
  const sorted = [...list].sort((a, b) => Number(a.from) - Number(b.from))
  return sorted[0] ?? { from: 0, label: 'Débutant', icon: '🌱' }
}

/**
 * Titres triés par palier `from` (frise).
 * @param {Record<string, unknown> | null | undefined} g
 */
export const sortedTitleMilestones = (g) => {
  const list = Array.isArray(g?.titles) && g.titles.length ? g.titles : DEFAULT_TITLES
  const out = []
  for (const t of list) {
    const from = Math.floor(Number(t?.from))
    if (!Number.isFinite(from)) continue
    const label = String(t?.label ?? '').trim() || '—'
    const icon = String(t?.icon ?? '🌱').trim().slice(0, 16) || '🌱'
    out.push({ from, label, icon })
  }
  out.sort((a, b) => a.from - b.from)
  const seen = new Set()
  return out.filter((x) => {
    if (seen.has(x.from)) return false
    seen.add(x.from)
    return true
  })
}
