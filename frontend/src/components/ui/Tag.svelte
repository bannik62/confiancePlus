<script>
  export let color = 'var(--accent)'
</script>

<span class="tag" style="--c: {color}">
  <slot />
</span>

<style>
  .tag {
    background: color-mix(in srgb, var(--c) 20%, transparent);
    border: 1px solid color-mix(in srgb, var(--c) 40%, transparent);
    color: var(--c);
    border-radius: 6px;
    padding: 2px 8px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1px;
    font-family: 'Rajdhani', sans-serif;
  }
</style>
