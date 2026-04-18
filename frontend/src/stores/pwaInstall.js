import { writable } from 'svelte/store'
import { get } from 'svelte/store'

export const pwaDeferredPrompt = writable(null)

/**
 * À appeler une fois au chargement (ex. main.js).
 * Garde le contrôle sur l’invite système pour un bouton explicite (Profil).
 */
export function initPwaInstall() {
  if (typeof window === 'undefined') return

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    pwaDeferredPrompt.set(e)
  })

  window.addEventListener('appinstalled', () => {
    pwaDeferredPrompt.set(null)
  })
}

export function isStandalone() {
  if (typeof window === 'undefined') return false
  const nav = window.navigator
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    /** @type {{ standalone?: boolean }} */ (nav).standalone === true
  )
}

/** iPhone / iPad / iPod (pas d’événement beforeinstallprompt → consignes manuelles). */
export function isIosLike() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true
  return false
}

export async function triggerInstallPrompt() {
  const e = get(pwaDeferredPrompt)
  if (!e) return
  await e.prompt()
  await e.userChoice
  pwaDeferredPrompt.set(null)
}
