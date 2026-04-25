import { writable, get } from 'svelte/store'
import { gameplayStore } from './gameplay.js'

const initial = () => ({
  open: false,
  title: 'Objets',
  username: null,
  avatar: null,
  cristaux: 0,
  jokerStreak: 0,
  streak7TrophyCount: 0,
  trophyImageSrc: '/badges/fireStreackBadge/1000002186.png',
})

export const itemsModalStore = writable(initial())

const defaultTrophyImage = () => {
  const g = get(gameplayStore)
  const rw = g?.streak?.rewards
  if (!Array.isArray(rw) || !rw.length) return '/badges/fireStreackBadge/1000002186.png'
  const img = rw[0]?.heroImage
  return typeof img === 'string' && img.trim() ? img.trim() : '/badges/fireStreackBadge/1000002186.png'
}

/**
 * @param {{
 *   title?: string
 *   username?: string | null
 *   avatar?: string | null
 *   cristaux?: number
 *   jokerStreak?: number
 *   streak7TrophyCount?: number
 *   trophyImageSrc?: string | null
 * }} opts
 */
export const openItemsModal = (opts = {}) => {
  itemsModalStore.set({
    ...initial(),
    open: true,
    title: opts.title ?? 'Objets',
    username: opts.username ?? null,
    avatar: opts.avatar ?? null,
    cristaux: Number(opts.cristaux) || 0,
    jokerStreak: Number(opts.jokerStreak) || 0,
    streak7TrophyCount: Number(opts.streak7TrophyCount) || 0,
    trophyImageSrc:
      typeof opts.trophyImageSrc === 'string' && opts.trophyImageSrc.trim()
        ? opts.trophyImageSrc.trim()
        : defaultTrophyImage(),
  })
}

export const closeItemsModal = () => {
  itemsModalStore.set(initial())
}

export const resetItemsModal = () => {
  closeItemsModal()
}
