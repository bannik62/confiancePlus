import { writable } from 'svelte/store'
import { statsApi }  from '../api/stats.js'

// Données de profil XP/niveau/streak affichées dans la Topbar et la vue Profil
// Initialisées à des valeurs neutres pour éviter des flash d'affichage
const DEFAULT = {
  level:    0,
  current:  0,
  required: 100,
  percent:  0,
  totalXP:  0,
  streak:   0,
  title:    null,
}

export const profileStore = writable(DEFAULT)

// Charge le profil depuis l'API et met à jour le store
// À appeler : au démarrage (après checkSession) + après un check-in
export const loadProfile = async () => {
  try {
    const data = await statsApi.getMyProfile()
    profileStore.set(data)
    return data
  } catch {
    // Silencieux — le profil reste aux valeurs précédentes
    return null
  }
}

// Remet le store aux valeurs par défaut (déconnexion)
export const resetProfile = () => profileStore.set(DEFAULT)
