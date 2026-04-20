import { api } from './client.js'
import { localDateString } from '../lib/dateLocal.js'

export const habitsApi = {
  /** Logs du jour civil local (aligné sur GET /checkin/today?date=…) */
  getAll:   ()           => api.get(`/habits?date=${encodeURIComponent(localDateString())}`),
  create:   (data)       => api.post('/habits', data),
  update:   (id, data)   => api.patch(`/habits/${id}`, data),
  delete:   (id)         => api.delete(`/habits/${id}`),
  toggle:   (id, date)   => api.patch(`/habits/${id}/toggle`, date ? { date } : {}),
  /** Proposition « habitude du jour » (fenêtre 7 jours sans doublon de modèle) */
  getDailyOffer: (date) => {
    const d = date ?? localDateString()
    return api.get(`/habits/daily-offer?date=${encodeURIComponent(d)}`)
  },
  dismissDailyOffer: (date) =>
    api.post('/habits/daily-offer/dismiss', { date: date ?? localDateString() }),
  acceptDailyOffer: (date) =>
    api.post('/habits/daily-offer/accept', { date: date ?? localDateString() }),
  /** Liste des habitudes actives d’un joueur (classement) */
  getPublicHabits: (userId) => api.get(`/habits/public/${encodeURIComponent(userId)}`),
  /** Réaction ❤️ / 🤔 sur une perf (habitude validée, YMD = jour civil du joueur cible) */
  setPerfReaction: (body) => api.post('/habits/perf-reactions', body),
}
