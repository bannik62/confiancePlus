const BASE = '/api'

/** Pas d’auth requise — phrases du jour pour l’app. */
export const loadDayMessagesPublic = async () => {
  const res = await fetch(`${BASE}/content/day-messages`, { credentials: 'include' })
  if (!res.ok) return null
  return res.json()
}
