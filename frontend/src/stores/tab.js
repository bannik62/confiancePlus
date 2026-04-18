import { writable } from 'svelte/store'

// Tabs disponibles : 'home' | 'agenda' | 'groupe' | 'stats' | 'profil'
export const tab = writable('home')
