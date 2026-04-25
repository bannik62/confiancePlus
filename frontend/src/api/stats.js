import { api } from './client.js'
import { localDateString } from '../lib/dateLocal.js'

export const statsApi = {
  getMyStats: () => {
    const q = new URLSearchParams({ clientToday: localDateString() })
    return api.get(`/stats/me?${q}`)
  },
  getEducatorOverview: () => {
    const q = new URLSearchParams({ clientToday: localDateString() })
    return api.get(`/stats/educator-overview?${q}`)
  },
  getMyProfile: (opts = {}) => {
    const q = new URLSearchParams({ clientToday: localDateString() })
    if (opts.streakBanner) q.set('streakBanner', '1')
    return api.get(`/stats/profile?${q}`)
  },
  globalLeaderboard: () => {
    const q = new URLSearchParams({ clientToday: localDateString() })
    return api.get(`/stats/leaderboard?${q}`)
  },
  getCalendar:       (year) => api.get(`/stats/calendar/${year}`),
  getInsights:       (days = 30) => api.get(`/stats/insights?days=${days}`),
  /** Sauvetage streak : 1 joker de série. Réponse = profil à jour. */
  postStreakRecover: (opts = {}) =>
    api.post('/stats/streak-recover', {
      clientToday: localDateString(),
      payment:       opts.payment ?? 'JOKER',
    }),
  /** Réclame un trophée palier série (ex. key streak_7). Réponse = profil à jour. */
  postStreakMilestoneClaim: (body = {}) =>
    api.post('/stats/streak-milestone-claim', {
      clientToday: localDateString(),
      key:           body.key,
    }),
}
