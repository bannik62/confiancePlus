import { writable } from 'svelte/store'
import { checkinApi } from '../api/checkin.js'

export const dailyLog = writable(null)

export const resetDailyLog = () => dailyLog.set(null)

export const loadToday = async () => {
  const log = await checkinApi.getToday()
  dailyLog.set(log)
  return log
}

/** Plusieurs tentatives — après login le cookie JWT peut être pris en compte une fraction de seconde plus tard. */
export const loadTodayResilient = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 100 * i))
    try {
      return await loadToday()
    } catch {
      /* 401 / réseau : retenter avant de considérer « pas de log » */
    }
  }
  dailyLog.set(null)
  return null
}

export const saveDailyLog = async (data) => {
  const log = await checkinApi.save(data)
  dailyLog.set(log)
  return log
}
