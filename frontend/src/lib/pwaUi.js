/** Détection mode « app installée » (standalone). */
export function isStandalone() {
  if (typeof window === 'undefined') return false
  const nav = window.navigator
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    /** @type {{ standalone?: boolean }} */ (nav).standalone === true
  )
}

/** iPhone / iPad — pas de beforeinstallprompt ; aide manuelle utile. */
export function isIosLike() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true
  return false
}

export function isAndroid() {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
}
