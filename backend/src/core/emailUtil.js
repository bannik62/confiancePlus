/** E-mail pour comparaisons / unicité (trim + minuscules). */
export const normalizeEmail = (s) => (typeof s === 'string' ? s.trim().toLowerCase() : '')

/**
 * Indice pour l’élève sans exposer l’adresse complète (ex. "l***@example.com").
 * @param {string} email — déjà normalisé de préférence
 */
export const maskEmailHint = (email) => {
  const e = normalizeEmail(email)
  const at = e.indexOf('@')
  if (at <= 0 || at === e.length - 1) return null
  const local = e.slice(0, at)
  const domain = e.slice(at + 1)
  const show = local.length <= 1 ? '*' : `${local[0]}***`
  return `${show}@${domain}`
}
