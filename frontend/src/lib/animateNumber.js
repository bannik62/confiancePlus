/**
 * Animation linéaire de nombre (requestAnimationFrame), avec annulation propre.
 * Utilisé par CountUpInline et réutilisable pour d’autres UI.
 */

/**
 * @param {boolean | undefined} [cached] — si fourni, retourne cette valeur (ex. SSR)
 */
export function readPrefersReducedMotion(cached) {
  if (cached !== undefined) return cached
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * @param {object} opts
 * @param {number} opts.from
 * @param {number} opts.to
 * @param {number} opts.durationMs
 * @param {(n: number) => void} opts.onFrame — reçoit la valeur arrondie à chaque frame
 * @param {() => void} [opts.onComplete]
 * @returns {() => void} cancel — appeler au destroy ou pour interrompre
 */
export function animateNumberRaf({ from, to, durationMs, onFrame, onComplete }) {
  const dur = Math.max(1, durationMs)
  let rafId = 0
  let start = 0

  function tick(ts) {
    if (!start) start = ts
    const p = Math.min(1, (ts - start) / dur)
    const v = from + (to - from) * p
    onFrame(Math.round(v))
    if (p < 1) {
      rafId = requestAnimationFrame(tick)
    } else {
      onFrame(to)
      onComplete?.()
    }
  }

  rafId = requestAnimationFrame(tick)

  return () => {
    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
  }
}
