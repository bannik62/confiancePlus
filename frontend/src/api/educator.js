import { api } from './client.js'

export const educatorApi = {
  memberOverview: (groupId, memberId, { year, habitsDate, clientToday } = {}) => {
    const q = new URLSearchParams()
    if (year != null) q.set('year', String(year))
    if (habitsDate) q.set('habitsDate', habitsDate)
    if (clientToday) q.set('clientToday', clientToday)
    const qs = q.toString()
    return api.get(
      `/educator/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberId)}/overview${qs ? `?${qs}` : ''}`,
    )
  },
}
