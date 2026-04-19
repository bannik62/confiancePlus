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
  getMyProfile: () => {
    const q = new URLSearchParams({ clientToday: localDateString() })
    return api.get(`/stats/profile?${q}`)
  },
  globalLeaderboard: () => {
    const q = new URLSearchParams({ clientToday: localDateString() })
    return api.get(`/stats/leaderboard?${q}`)
  },
  getCalendar:       (year) => api.get(`/stats/calendar/${year}`),
  getInsights:       (days = 30) => api.get(`/stats/insights?days=${days}`),
}
