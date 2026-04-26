import { api } from './client.js'
import { localDateString } from '../lib/dateLocal.js'

export const habitsApi = {
  /** Logs du jour civil local (aligné sur GET /checkin/today?date=…) */
  getAll:   ()           => api.get(`/habits?date=${encodeURIComponent(localDateString())}`),
  create:   (data) =>
    api.post('/habits', {
      ...data,
      date: data?.date ?? localDateString(),
    }),
  update:   (id, data)   => api.patch(`/habits/${id}`, data),
  delete:   (id, date) =>
    api.delete(
      `/habits/${encodeURIComponent(id)}?date=${encodeURIComponent(date ?? localDateString())}`,
    ),
  toggle:   (id, date)   => api.patch(`/habits/${id}/toggle`, date ? { date } : {}),
  /** Ne peut pas aujourd’hui : pas d’XP, pas de pénalité streak (jour civil local si omis). */
  skipDay: (id, date) =>
    api.post(`/habits/${encodeURIComponent(id)}/skip-day`, date ? { date } : {}),
  unskipDay: (id, date) => {
    const d = date ?? localDateString()
    return api.delete(
      `/habits/${encodeURIComponent(id)}/skip-day?date=${encodeURIComponent(d)}`,
    )
  },
  /** Proposition « habitude du jour » (titres normalisés vs habitudes ; `exhausted` si rien à proposer) */
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
  /** Plusieurs réactions — un seul e-mail côté serveur (ex. à la fermeture du modal) */
  setPerfReactionsBatch: (body) => api.post('/habits/perf-reactions/batch', body),
}
