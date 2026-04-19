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

/**
 * Brave annonce souvent l’absence d’invite PWA si les Shields bloquent trop de choses.
 * L’UA peut ne pas contenir « Brave » — utiliser `navigator.brave.isBrave()` quand c’est dispo.
 */
export async function detectBrave() {
  if (typeof navigator === 'undefined') return false
  try {
    const brave = /** @type {{ isBrave?: () => Promise<boolean> } | undefined} */ (navigator).brave
    if (brave?.isBrave) {
      return await brave.isBrave()
    }
  } catch {
    /* ignore */
  }
  return /Brave/i.test(navigator.userAgent)
}
