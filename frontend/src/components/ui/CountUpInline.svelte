<script>
  import { onMount, onDestroy } from 'svelte'

  /** Valeur cible (nombre affiché arrondi) */
  export let value = 0
  /** Durée de l’animation (ms) */
  export let duration = 1100

  let className = ''
  export { className as class }

  let reduceMotion = false
  /** Valeur affichée (animation locale, nettoyée au destroy — pas de fuite comme svelte-countup) */
  let display = 0
  let rafId = 0
  let mounted = false
  /** Dernière cible traitée (évite les boucles / doubles animations) */
  let lastTarget = undefined

  $: target = Math.max(0, Math.round(Number(value) || 0))

  function cancelAnim() {
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
  }

  onDestroy(() => cancelAnim())

  onMount(() => {
    reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
    mounted = true
  })

  function runAnim(from, to) {
    const dur = Math.max(1, duration)
    let start = 0
    function frame(ts) {
      if (!start) start = ts
      const p = Math.min(1, (ts - start) / dur)
      display = Math.round(from + (to - from) * p)
      if (p < 1) {
        rafId = requestAnimationFrame(frame)
      } else {
        display = to
        rafId = 0
      }
    }
    rafId = requestAnimationFrame(frame)
  }

  $: if (mounted && target !== lastTarget) {
    lastTarget = target
    cancelAnim()
    if (reduceMotion) {
      display = target
    } else {
      const from = display
      const to = target
      if (from === to) {
        display = to
      } else {
        runAnim(from, to)
      }
    }
  }
</script>

<span class="countup-inline {className}">{display.toLocaleString('fr-FR')}</span>

<style>
  .countup-inline {
    font-variant-numeric: tabular-nums;
  }
</style>
