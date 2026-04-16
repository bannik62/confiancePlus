import data from '../data/dayMessages.json'

/** Données API `/api/content/day-messages` (même forme que le JSON local) ; `null` = fallback fichier. */
let remote = null

export const setRemoteDayMessages = (payload) => {
  remote = payload && typeof payload === 'object' ? payload : null
}

/** 1–3 encouragement, 4–7 maintien, 8–10 félicitation */
export const categoryForMood = (mood) => {
  const m = Number(mood)
  if (m <= 3) return 'encouragement'
  if (m <= 7) return 'maintien'
  return 'felicitation'
}

const phrasesFor = (cat) => {
  const fromApi = remote?.[cat]?.phrases
  if (Array.isArray(fromApi) && fromApi.length > 0) return fromApi
  return data[cat]?.phrases ?? []
}

/** Tirage aléatoire dans la catégorie */
export const randomPhraseForMood = (mood) => {
  const list = phrasesFor(categoryForMood(mood))
  if (!list.length) return ''
  return list[Math.floor(Math.random() * list.length)]
}

/** Même phrase tant que la clé (date + humeur) ne change pas */
let cache = { key: '', text: '' }

export const dayMessageFor = (mood, dateKey) => {
  const m = Number(mood) || 5
  const key = `${dateKey}-${m}`
  if (cache.key !== key) {
    cache.key = key
    cache.text = randomPhraseForMood(m)
  }
  return cache.text
}

export const resetDayMessageCache = () => {
  cache = { key: '', text: '' }
}
