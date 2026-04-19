import { api } from './client.js'

const BASE = '/api'

export const pushApi = {
  /** @returns {Promise<{ publicKey: string }>} */
  getVapidPublic: async () => {
    const res = await fetch(`${BASE}/push/vapid-public`, { credentials: 'include' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw {
        status: res.status,
        message: typeof err.error === 'string' ? err.error : 'Clé VAPID indisponible',
      }
    }
    return res.json()
  },
  subscribe: (body) => api.post('/push/subscribe', body),
  /** @param {{ endpoint?: string }} [body] */
  unsubscribe: (body) => api.delete('/push/subscribe', body),
}
