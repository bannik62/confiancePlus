import { api } from './client.js'

export const appointmentsApi = {
  calendar: (year) => api.get(`/appointments/calendar?year=${encodeURIComponent(year)}`),
  day: (date) => api.get(`/appointments/day?date=${encodeURIComponent(date)}`),
  managed: (groupId, year) =>
    api.get(
      `/appointments/managed?groupId=${encodeURIComponent(groupId)}&year=${encodeURIComponent(year)}`,
    ),
  create: (body) => api.post('/appointments', body),
  createForMember: (body) => api.post('/appointments/for-member', body),
  update: (id, body) => api.patch(`/appointments/${encodeURIComponent(id)}`, body),
  complete: (id, body) => api.post(`/appointments/${encodeURIComponent(id)}/complete`, body),
  /** Non fait le jour J — raison optionnelle (stats / heatmap uniquement). */
  notDone: (id, body) => api.post(`/appointments/${encodeURIComponent(id)}/not-done`, body),
  remove: (id) => api.delete(`/appointments/${encodeURIComponent(id)}`),
}
