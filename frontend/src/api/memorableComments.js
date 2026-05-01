import { api } from './client.js'

export const memorableCommentsApi = {
  list: (dailyLogId) => {
    const q = new URLSearchParams({ dailyLogId })
    return api.get(`/memorable-comments?${q}`)
  },
  mentionSuggestions: (q) => {
    const sp = new URLSearchParams({ q: q ?? '' })
    return api.get(`/memorable-comments/mention-suggestions?${sp}`)
  },
  create: (dailyLogId, body) => api.post('/memorable-comments', { dailyLogId, body }),
  remove: (commentId) => api.delete(`/memorable-comments/${commentId}`),
  setReaction: (commentId, kind) =>
    api.put(`/memorable-comments/${commentId}/reaction`, { kind }),
}
