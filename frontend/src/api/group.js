import { api } from './client.js'
import { localDateString } from '../lib/dateLocal.js'

export const groupApi = {
  getMyGroups:    ()                         => api.get('/group'),
  create:         (data)                     => api.post('/group', data),
  join:           (inviteCode)               => api.post('/group/join', { inviteCode }),
  leaderboard:    (groupId) => {
    const q = new URLSearchParams({ clientToday: localDateString() })
    return api.get(`/group/${groupId}/leaderboard?${q}`)
  },
  createMember:   (groupId, data)            => api.post(`/group/${groupId}/members`, data),
  patchSensitiveSharing: (groupId, body)    => api.patch(`/group/${groupId}/membership/sensitive-sharing`, body),
}
