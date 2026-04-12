import { api } from './client.js'
import { localDateString } from '../lib/dateLocal.js'

export const checkinApi = {
  getToday: () =>
    api.get(`/checkin/today?date=${encodeURIComponent(localDateString())}`),
  save: (data) =>
    api.post('/checkin', { ...data, date: data.date ?? localDateString() }),
}
