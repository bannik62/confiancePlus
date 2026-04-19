import { writable } from 'svelte/store'
import { habitsApi } from '../api/habits.js'

export const habits  = writable([])
export const loading = writable(false)

export const loadHabits = async () => {
  loading.set(true)
  try   { habits.set(await habitsApi.getAll()) }
  finally { loading.set(false) }
}
