/**
 * Heure et date civiles dans un fuseau IANA (sans dépendance lourde).
 */

/** @param {string} iana */
const safeTimeZone = (iana) => {
  const z = typeof iana === 'string' && iana.trim() ? iana.trim() : 'Europe/Paris'
  try {
    new Intl.DateTimeFormat('en', { timeZone: z }).format(new Date())
    return z
  } catch {
    return 'Europe/Paris'
  }
}

/** @param {string} iana @param {Date} [d] */
export const getLocalYmd = (iana, d = new Date()) => {
  const tz = safeTimeZone(iana)
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = f.formatToParts(d)
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value
  if (!y || !m || !day) return d.toISOString().slice(0, 10)
  return `${y}-${m}-${day}`
}

/** Heure locale 0–23 */
export const getLocalHour = (iana, d = new Date()) => {
  const tz = safeTimeZone(iana)
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(d)
  const h = parts.find((p) => p.type === 'hour')?.value
  const n = h != null ? parseInt(h, 10) : NaN
  return Number.isFinite(n) ? n : 12
}

/** Minute locale 0–59 */
export const getLocalMinute = (iana, d = new Date()) => {
  const tz = safeTimeZone(iana)
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    minute: 'numeric',
  }).formatToParts(d)
  const m = parts.find((p) => p.type === 'minute')?.value
  const n = m != null ? parseInt(m, 10) : NaN
  return Number.isFinite(n) ? n : 0
}
