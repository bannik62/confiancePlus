import { writable, derived } from 'svelte/store'
import { authApi }  from '../api/auth.js'
import { tab }      from './tab.js'
import { setRemoteDayMessages, resetDayMessageCache } from '../lib/dayMessage.js'

// Uniquement les infos d'affichage — jamais le JWT
// session : incrémenté à chaque nouvelle session (cookie ou login) pour forcer le bootstrap App (check-in du jour)
export const authStore = writable({ user: null, session: 0 })

/** Compte opérateur (back-office), hors parcours élève / éducateur */
export const isAppAdmin = derived(authStore, ($s) => $s.user?.isAdmin === true)

const bump = (u) =>
  authStore.update((s) => ({ user: u, session: s.session + 1 }))

// Vérifie si une session cookie existe au démarrage de l'app
export const checkSession = async () => {
  try {
    const user = await authApi.me()
    bump(user)
    return true
  } catch (e) {
    if (e?.status === 403 && e?.code === 'SUSPENDED') {
      try {
        sessionStorage.setItem(
          'authNotice',
          JSON.stringify({
            type: 'suspended',
            message: typeof e.message === 'string' && e.message.length ? e.message : 'Compte suspendu',
          }),
        )
      } catch {
        /* ignore */
      }
      await clearAuth()
      return false
    }
    authStore.set({ user: null, session: 0 })
    return false
  }
}

// Appelé après login/register — le csrfToken est déjà dans le cookie posé par le backend
export const setAuth = ({ user }) => bump(user)

// Déconnexion — demande au backend de supprimer JWT + csrfToken cookies
export const clearAuth = async () => {
  await authApi.logout().catch(() => {})
  tab.set('home')
  setRemoteDayMessages(null)
  resetDayMessageCache()
  authStore.set({ user: null, session: 0 })
}
