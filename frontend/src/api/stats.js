import { api } from './client.js'
import { localDateString } from '../lib/dateLocal.js'

export const statsApi = {
  getMyStats: () => {
    const q = new URLSearchParams({ clientToday: localDateString() })
    return api.get(`/stats/me?${q}`)
  },
  getEducatorOverview: () => api.get('/stats/educator-overview'),
  getMyProfile:        () => api.get('/stats/profile'),
  globalLeaderboard:   () => api.get('/stats/leaderboard'),
  getCalendar:       (year) => api.get(`/stats/calendar/${year}`),
  getInsights:       (days = 30) => api.get(`/stats/insights?days=${days}`),
}
