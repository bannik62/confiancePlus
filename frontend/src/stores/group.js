import { writable, derived } from 'svelte/store'
import { groupApi } from '../api/group.js'
import { statsApi } from '../api/stats.js'

export const groups           = writable([])   // groupes de l'user avec role inclus
export const groupLeaderboard = writable([])   // classement du groupe actif
export const globalLeaderboard= writable([])   // classement global tous users
export const activeGroup      = writable(null) // groupe actif sélectionné

// Groupe actif + rôle de l'user dedans
export const myRole = derived(activeGroup, ($g) => $g?.role ?? null)
// true si l'user est dans au moins un groupe
export const hasGroup = derived(groups, ($g) => $g.length > 0)

// ── Loaders ───────────────────────────────────────────────────────────────────

export const loadGroups = async () => {
  const data = await groupApi.getMyGroups()
  groups.set(data)
  if (data.length > 0) activeGroup.set(data[0])
  return data
}

export const loadGroupLeaderboard = async (groupId) => {
  const data = await groupApi.leaderboard(groupId)
  groupLeaderboard.set(data)
  return data
}

export const loadGlobalLeaderboard = async () => {
  const data = await statsApi.globalLeaderboard()
  globalLeaderboard.set(data)
  return data
}

// Charge tout en parallèle
export const loadGroupData = async () => {
  const grps = await loadGroups()
  await Promise.all([
    grps.length > 0 ? loadGroupLeaderboard(grps[0].id) : Promise.resolve(),
    loadGlobalLeaderboard(),
  ])
}
