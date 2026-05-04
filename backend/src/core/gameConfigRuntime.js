import { db } from './db.js'
import { GAME as GAME_DEFAULT } from './gameConfig.js'

const KEY = 'gameConfig'

const isPlainObject = (o) => o !== null && typeof o === 'object' && !Array.isArray(o)

/** Fusion profonde : tableaux et scalaires remplacent ; objets fusionnés. */
export const deepMerge = (base, override) => {
  if (override == null) return structuredClone(base)
  const out = structuredClone(base)
  for (const k of Object.keys(override)) {
    if (isPlainObject(out[k]) && isPlainObject(override[k])) {
      out[k] = deepMerge(out[k], override[k])
    } else {
      out[k] = override[k]
    }
  }
  return out
}

let activeConfig = structuredClone(GAME_DEFAULT)

export const getGameConfigSync = () => activeConfig

export const refreshGameConfigCache = async () => {
  try {
    const row = await db.appSetting.findUnique({ where: { key: KEY } })
    if (!row?.value?.trim()) {
      activeConfig = structuredClone(GAME_DEFAULT)
      return
    }
    const parsed = JSON.parse(row.value)
    activeConfig = deepMerge(structuredClone(GAME_DEFAULT), parsed)
    // Une surcharge DB peut contenir `titles: []` (ou absent puis mal sérialisé) : le deepMerge
    // remplace alors tout le tableau et titleForLevel retombe sur « Débutant ». On rétablit le fichier.
    if (!Array.isArray(activeConfig.titles) || activeConfig.titles.length === 0) {
      activeConfig.titles = structuredClone(GAME_DEFAULT.titles)
    }
    const rw = activeConfig.streak?.rewards
    if (!Array.isArray(rw) || rw.length === 0) {
      if (!activeConfig.streak) activeConfig.streak = structuredClone(GAME_DEFAULT.streak)
      else activeConfig.streak.rewards = structuredClone(GAME_DEFAULT.streak.rewards)
    }
    const bd = activeConfig.streak?.badgeShow
    if (!Array.isArray(bd) || !bd.length) {
      if (!activeConfig.streak) activeConfig.streak = structuredClone(GAME_DEFAULT.streak)
      else activeConfig.streak.badgeShow = structuredClone(GAME_DEFAULT.streak.badgeShow)
    }
  } catch {
    activeConfig = structuredClone(GAME_DEFAULT)
  }
}

export { GAME_DEFAULT }
