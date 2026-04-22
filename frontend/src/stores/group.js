import { writable, derived, get } from 'svelte/store'
import { groupApi } from '../api/group.js'
import { statsApi } from '../api/stats.js'

export const groups           = writable([])   // groupes de l'user avec role inclus
export const groupLeaderboard = writable([])   // classement du groupe actif
export const globalLeaderboard= writable([])   // classement global tous users
export const activeGroup      = writable(null) // groupe actif sélectionné

/** Après login « groupe avec code » : priorité sur le groupe correspondant au code */
const POST_LOGIN_GROUP_KEY = 'habitracks_postLoginGroupId'

export const rememberPostLoginActiveGroup = (groupId) => {
  try {
    if (groupId) sessionStorage.setItem(POST_LOGIN_GROUP_KEY, String(groupId))
  } catch {
    /* quota / navigation privée */
  }
}

// Groupe actif + rôle de l'user dedans
export const myRole = derived(activeGroup, ($g) => $g?.role ?? null)
// true si l'user est dans au moins un groupe
export const hasGroup = derived(groups, ($g) => $g.length > 0)

// ── Loaders ───────────────────────────────────────────────────────────────────

export const loadGroups = async () => {
  const data = await groupApi.getMyGroups()
  let pinId = null
  try {
    pinId = sessionStorage.getItem(POST_LOGIN_GROUP_KEY)
    if (pinId) sessionStorage.removeItem(POST_LOGIN_GROUP_KEY)
  } catch {
    /* ignore */
  }
  const previousId = get(activeGroup)?.id
  groups.set(data)
  if (data.length > 0) {
    const pinned = pinId ? data.find((g) => g.id === pinId) : null
    const keep = previousId ? data.find((g) => g.id === previousId) : null
    activeGroup.set(pinned || keep || data[0])
  } else {
    activeGroup.set(null)
  }
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
  const leaderboardGroupId =
    grps.find((g) => g.type === 'ASSOCIATION' && g.role === 'OWNER')?.id ??
    grps.find((g) => g.role === 'OWNER')?.id ??
    grps[0]?.id
  await Promise.all([
    leaderboardGroupId ? loadGroupLeaderboard(leaderboardGroupId) : Promise.resolve(),
    loadGlobalLeaderboard(),
  ])
}

/** Vide les stores groupe (déconnexion / autre utilisateur) */
export const resetGroupState = () => {
  groups.set([])
  activeGroup.set(null)
  groupLeaderboard.set([])
  globalLeaderboard.set([])
}

/** true si l’utilisateur est OWNER d’au moins un groupe ASSOCIATION (parcours éducateur) */
export const isAssociationOwner = (grps) =>
  Array.isArray(grps) && grps.some((g) => g.type === 'ASSOCIATION' && g.role === 'OWNER')

/** Store réactif — même critère que le skip check-in / garde-fous API */
export const isEducatorAssociation = derived(groups, ($g) => isAssociationOwner($g))

/** Groupe ASSO dont l’utilisateur est OWNER (suivi éducateur / classement aperçu). */
export const educatorAssociationGroupId = derived(groups, ($g) =>
  $g.find((x) => x.type === 'ASSOCIATION' && x.role === 'OWNER')?.id ?? null,
)
