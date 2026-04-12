import { writable } from 'svelte/store'

// Tabs disponibles : 'home' | 'groupe' | 'stats' | 'profil'
export const tab = writable('home')
