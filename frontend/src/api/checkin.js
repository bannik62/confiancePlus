import { api } from './client.js'
import { localDateString } from '../lib/dateLocal.js'

export const checkinApi = {
  getToday: () =>
    api.get(`/checkin/today?date=${encodeURIComponent(localDateString())}`),
  save: (data) => {
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      if (!data.has('date')) data.append('date', localDateString())
      return api.post('/checkin', data)
    }
    return api.post('/checkin', { ...data, date: data.date ?? localDateString() })
  },
}
