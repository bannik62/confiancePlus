import { api } from './client.js'

export const authApi = {
  getRegisterStatus: () => api.get('/auth/register-status'),
  register:  (data) => api.post('/auth/register',   data),
  login:     (data) => api.post('/auth/login',      data),
  logout:    ()     => api.post('/auth/logout'),
  me:        ()     => api.get('/auth/me'),
  checkCode: (data) => api.post('/auth/check-code', data),
  activate:  (data) => api.post('/auth/activate',   data),
  changeEmail:    (data) => api.patch('/auth/me/email', data),
  changePassword: (data) => api.patch('/auth/me/password', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  checkResetPasswordToken: (token) =>
    api.get(`/auth/reset-password/check?token=${encodeURIComponent(token)}`),
  resetPasswordWithToken: (data) => api.post('/auth/reset-password', data),
}
