<script>
  import { onMount, onDestroy } from 'svelte'
  import { readPrefersReducedMotion, animateNumberRaf } from '../../lib/animateNumber.js'

  /** Valeur cible (nombre affiché arrondi) */
  export let value = 0
  /** Durée de l’animation (ms) */
  export let duration = 1100

  let className = ''
  export { className as class }

  let reduceMotion = false
  let display = 0
  let cancelAnim = () => {}
  let mounted = false
  let lastTarget = undefined

  $: target = Math.max(0, Math.round(Number(value) || 0))

  onDestroy(() => cancelAnim())

  onMount(() => {
    reduceMotion = readPrefersReducedMotion()
    mounted = true
  })

  $: if (mounted && target !== lastTarget) {
    cancelAnim()
    lastTarget = target
    if (reduceMotion) {
      display = target
    } else {
      const from = display
      const to = target
      if (from === to) {
        display = to
      } else {
        cancelAnim = animateNumberRaf({
          from,
          to,
          durationMs: duration,
          onFrame: (n) => {
            display = n
          },
        })
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
