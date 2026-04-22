import { api } from './client.js'

export const adminApi = {
  users: (params = {}) => {
    const q = new URLSearchParams()
    if (params.page != null) q.set('page', String(params.page))
    if (params.limit != null) q.set('limit', String(params.limit))
    const qs = q.toString()
    return api.get(`/admin/users${qs ? `?${qs}` : ''}`)
  },
  deleteUser: (id) => api.delete(`/admin/users/${encodeURIComponent(id)}`),
  patchUserSuspension: (id, suspended) =>
    api.patch(`/admin/users/${encodeURIComponent(id)}/suspension`, { suspended }),
  /** @param {{ amount: number }} body */
  postGrantCristaux: (id, body) =>
    api.post(`/admin/users/${encodeURIComponent(id)}/cristaux/grant`, body),
  audit: (params = {}) => {
    const q = new URLSearchParams()
    if (params.limit != null) q.set('limit', String(params.limit))
    const qs = q.toString()
    return api.get(`/admin/audit${qs ? `?${qs}` : ''}`)
  },
  groups: () => api.get('/admin/groups'),
  getDayMessages: () => api.get('/admin/day-messages'),
  putDayMessages: (body) => api.put('/admin/day-messages', body),
  getDailyHabitTemplates: () => api.get('/admin/daily-habit-templates'),
  putDailyHabitTemplates: (body) => api.put('/admin/daily-habit-templates', body),
  getPushSettings: () => api.get('/admin/push-settings'),
  putPushSettings: (body) => api.put('/admin/push-settings', body),
  /** @param {{ message: string }} body */
  postPushTest: (body) => api.post('/admin/push/test', body),

  getEmailDefaults: () => api.get('/admin/email/defaults'),
  putEmailDefaults: (body) => api.put('/admin/email/defaults', body),
  getEmailRecipients: () => api.get('/admin/email/recipients'),
  /** @param {{ mode: 'all' | 'one', userId?: string, subject: string, body: string }} body */
  postEmailSend: (body) => api.post('/admin/email/send', body),

  getGameplay: () => api.get('/admin/gameplay'),
  putGameplay: (body) => api.put('/admin/gameplay', body),
  resetGameplay: () => api.delete('/admin/gameplay'),
}
