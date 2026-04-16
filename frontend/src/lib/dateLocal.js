const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

/** Date calendaire locale de l'utilisateur (YYYY-MM-DD) */
export const localDateString = (d = new Date()) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Parse une chaîne YYYY-MM-DD comme jour civil **local** (minuit local).
 * Évite `new Date('YYYY-MM-DD')` (interprété en UTC → `getDay()` peut décaler).
 * @returns {Date | null}
 */
export const parseYmdLocal = (ymd) => {
  if (!ymd || !YMD_RE.test(ymd)) return null
  const [y, m, d] = ymd.split('-').map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  const dt = new Date(y, m - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null
  return dt
}

/** Index 0 = lundi … 6 = dimanche (semaine ISO / usage FR courant) */
export const mondayFirstWeekdayIndex = (date) => (date.getDay() + 6) % 7

const WEEKDAY_LETTERS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** Initiale du jour (L…D) pour une date YYYY-MM-DD interprétée en calendrier local */
export const weekdayLetterMonFirst = (ymd) => {
  const dt = parseYmdLocal(ymd)
  if (!dt) return '?'
  return WEEKDAY_LETTERS_FR[mondayFirstWeekdayIndex(dt)]
}
