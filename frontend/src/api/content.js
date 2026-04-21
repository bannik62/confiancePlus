const BASE = '/api'

/** Pas d’auth requise — phrases du jour pour l’app. */
export const loadDayMessagesPublic = async () => {
  const res = await fetch(`${BASE}/content/day-messages`, { credentials: 'include' })
  if (!res.ok) return null
  return res.json()
}

/** Paramètres gameplay effectifs (alignement aperçu XP, etc.). */
export const loadGameplayPublic = async () => {
  const res = await fetch(`${BASE}/content/gameplay`, { credentials: 'include' })
  if (!res.ok) throw new Error('gameplay')
  return res.json()
}
