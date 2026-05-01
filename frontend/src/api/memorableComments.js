import { api } from './client.js'

export const memorableCommentsApi = {
  list: (dailyLogId) => {
    const q = new URLSearchParams({ dailyLogId })
    return api.get(`/memorable-comments?${q}`)
  },
  create: (dailyLogId, body) => api.post('/memorable-comments', { dailyLogId, body }),
  remove: (commentId) => api.delete(`/memorable-comments/${commentId}`),
}
