import { db } from '../../core/db.js'
import { getGameConfigSync } from '../../core/gameConfigRuntime.js'

const CATEGORIES = ['encouragement', 'maintien', 'felicitation']

/** Format attendu par le front (même forme que dayMessages.json). */
export const getDayMessagesPublic = async () => {
  const rows = await db.motivationalPhrase.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
  })
  const out = {}
  for (const cat of CATEGORIES) {
    out[cat] = { phrases: rows.filter((r) => r.category === cat).map((r) => r.text) }
  }
  return out
}

/** Paramètres gameplay effectifs (lecture seule, sans auth). */
export const getGameplayPublic = async () => getGameConfigSync()
