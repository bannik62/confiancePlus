<script>
  export let glow = false
  export let style = ''
  /** Fond bien opaque + stacking (ex. aurora derrière l’onglet Stats) */
  export let solid = false
</script>

<div class="card" class:glow class:solid {style}>
  <slot />
</div>

<style>
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 16px;
  }
  .solid {
    isolation: isolate;
    background-color: var(--surface);
    background-clip: padding-box;
  }
  .glow {
    border-color: var(--accent)88;
    box-shadow: 0 0 20px var(--accent)55, 0 0 40px var(--accent)22;
  }
</style>
