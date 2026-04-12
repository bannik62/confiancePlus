import { api } from './client.js'
import { localDateString } from '../lib/dateLocal.js'

export const habitsApi = {
  /** Logs du jour civil local (aligné sur GET /checkin/today?date=…) */
  getAll:   ()           => api.get(`/habits?date=${encodeURIComponent(localDateString())}`),
  create:   (data)       => api.post('/habits', data),
  update:   (id, data)   => api.patch(`/habits/${id}`, data),
  delete:   (id)         => api.delete(`/habits/${id}`),
  toggle:   (id, date)   => api.patch(`/habits/${id}/toggle`, date ? { date } : {}),
}
