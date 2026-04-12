import { api } from './client.js'

export const statsApi = {
  getMyStats:        () => api.get('/stats/me'),
  getMyProfile:      () => api.get('/stats/profile'),
  globalLeaderboard: () => api.get('/stats/leaderboard'),
}
