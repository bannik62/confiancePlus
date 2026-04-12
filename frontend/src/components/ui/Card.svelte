<script>
  export let glow = false
  export let style = ''
</script>

<div class="card" class:glow {style}>
  <slot />
</div>

<style>
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 16px;
  }
  .glow {
    border-color: var(--accent)88;
    box-shadow: 0 0 20px var(--accent)55, 0 0 40px var(--accent)22;
  }
</style>
