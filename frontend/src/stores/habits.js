import { writable } from 'svelte/store'
import { habitsApi } from '../api/habits.js'

export const habits  = writable([])
export const loading = writable(false)

export const loadHabits = async () => {
  loading.set(true)
  try   { habits.set(await habitsApi.getAll()) }
  finally { loading.set(false) }
}

export const toggleHabit = async (id) => {
  const { checked } = await habitsApi.toggle(id)
  habits.update((list) =>
    list.map((h) =>
      h.id === id
        ? { ...h, logs: checked ? [{ date: new Date() }] : [] }
        : h
    )
  )
}
