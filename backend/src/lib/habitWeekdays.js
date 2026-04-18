/**
 * Masque 7 bits : bit 0 = lundi … bit 6 = dimanche (aligné FR / stats lundi d’abord).
 * 127 = tous les jours.
 */
export const ALL_WEEKDAYS_MASK = 127

/** @param {string} ymd — YYYY-MM-DD (jour civil aligné logs @db.Date midi UTC) */
export const mondayFirstIndexFromYmd = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0))
  return (dt.getUTCDay() + 6) % 7
}

/** @param {number} weekdaysMask 1–127 */
export const isHabitDueOnYmd = (weekdaysMask, ymd) => {
  const mask = weekdaysMask == null ? ALL_WEEKDAYS_MASK : Number(weekdaysMask)
  if (!Number.isFinite(mask) || mask < 1 || mask > 127) return true
  const idx = mondayFirstIndexFromYmd(ymd)
  return (mask & (1 << idx)) !== 0
}

/** @param {unknown} raw */
export const normalizeWeekdaysMask = (raw) => {
  const n = raw === undefined || raw === null ? ALL_WEEKDAYS_MASK : Number(raw)
  if (!Number.isInteger(n) || n < 1 || n > 127) return ALL_WEEKDAYS_MASK
  return n
}
