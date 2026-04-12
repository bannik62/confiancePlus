<script>
  export let current  = 0
  export let required = 100
  export let label    = ''
  $: percent = Math.min(100, Math.round((current / required) * 100))
</script>

{#if label}
  <div class="meta">
    <span>{label}</span>
    <span>{current}/{required} XP</span>
  </div>
{/if}

<div class="track">
  <div class="fill" style="width: {percent}%" />
</div>

<style>
  .meta {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: var(--muted);
    margin-bottom: 4px;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 1px;
  }
  .track {
    height: 7px;
    background: var(--border);
    border-radius: 4px;
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--grad-xp);
    border-radius: 4px;
    box-shadow: 0 0 14px var(--gold)88;
    transition: width 0.8s ease;
  }
</style>
