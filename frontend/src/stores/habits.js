import { writable } from 'svelte/store'
import { habitsApi } from '../api/habits.js'

export const habits = writable([])
/** Plafond habitudes actives (niveau) — rempli par GET /habits */
export const habitSlots = writable({
  maxActiveHabits: 20,
  activeHabitCount: 0,
  level: 0,
})
export const loading = writable(false)

export const loadHabits = async () => {
  loading.set(true)
  try {
    const res = await habitsApi.getAll()
    if (res && Array.isArray(res.habits)) {
      habits.set(res.habits)
      habitSlots.set({
        maxActiveHabits: res.maxActiveHabits,
        activeHabitCount: res.activeHabitCount,
        level: res.level,
      })
    } else {
      habits.set(Array.isArray(res) ? res : [])
    }
  } finally {
    loading.set(false)
  }
}
