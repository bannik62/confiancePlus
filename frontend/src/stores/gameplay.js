import { writable } from 'svelte/store'
import { loadGameplayPublic } from '../api/content.js'

/** Config gameplay serveur (null tant que non chargée). */
export const gameplayStore = writable(null)

export async function loadGameplay() {
  try {
    const g = await loadGameplayPublic()
    gameplayStore.set(g)
  } catch {
    gameplayStore.set(null)
  }
}
