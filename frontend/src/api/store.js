import { api } from './client.js'

export const storeApi = {
  getCatalog: () => api.get('/store/catalog'),
  purchase:   (sku) => api.post('/store/purchase', { sku }),
}
