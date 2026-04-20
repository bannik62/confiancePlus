import { writable } from 'svelte/store'

// Tabs barre du bas : 'home' | 'agenda' | 'groupe' | 'stats' | 'profil'
// Hors barre : 'shop' (boutique depuis l’accueil)
export const tab = writable('home')
