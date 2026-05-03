import { api } from './client.js'

export const broadcastApi = {
  /** @returns {Promise<{ broadcast: null | { id: string, title: string, body: string } }>} */
  getMine: () => api.get('/broadcast/me'),
  /** @returns {Promise<{ ok: boolean }>} */
  dismiss: (broadcastId) => api.post('/broadcast/me/dismiss', { broadcastId }),
}
