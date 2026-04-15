import { api } from './client.js'

export const statsApi = {
  getMyStats:          () => api.get('/stats/me'),
  getEducatorOverview: () => api.get('/stats/educator-overview'),
  getMyProfile:        () => api.get('/stats/profile'),
  globalLeaderboard:   () => api.get('/stats/leaderboard'),
  getCalendar:       (year) => api.get(`/stats/calendar/${year}`),
  getInsights:       (days = 30) => api.get(`/stats/insights?days=${days}`),
}
