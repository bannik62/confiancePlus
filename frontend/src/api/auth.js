import { api } from './client.js'

export const authApi = {
  register:  (data) => api.post('/auth/register',   data),
  login:     (data) => api.post('/auth/login',      data),
  logout:    ()     => api.post('/auth/logout'),
  me:        ()     => api.get('/auth/me'),
  checkCode: (data) => api.post('/auth/check-code', data),
  activate:  (data) => api.post('/auth/activate',   data),
}
