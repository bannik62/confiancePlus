<script>
  /** Une seule case : icône + petit chevron (grille au clic). Pas de second emoji sur la ligne. */
  export let value = ''
  export let maxlength = 16
  export let placeholder = '🙂'
  export let ariaLabel = 'Icône'
  /** true = largeur type palier gameplay, false = habitude du jour */
  export let wide = false

  let open = false
  let root

  const EMOJIS = [
    '📝', '💧', '🚶', '🧘', '📵', '😴', '🥗', '🧹', '☀️', '📖', '🏃', '💪', '🎯', '🌱', '⚡', '🔥',
    '🛡️', '🏆', '💎', '🙂', '❤️', '🤔', '🎉', '✨', '🌙', '🍎', '🦷', '📱', '🚴', '⭐', '🧠', '💊',
    '🎵', '🌿', '🏠', '💼', '🤝', '☕', '🍽️', '🚿', '🧴', '🛏️', '📊', '🔔', '🎁', '🏃‍♀️', '🧗', '⚽',
    '🎮', '📚', '✍️', '🗓️', '⏰', '🔋', '💤', '🌈', '🫶', '👍', '💡', '🧩', '🎨', '🐕', '🌸',
  ]

  function pick(emoji) {
    value = emoji.slice(0, maxlength)
    open = false
  }

  function toggle(e) {
    e.stopPropagation()
    open = !open
  }

  function onDocClick(e) {
    if (!open || !root) return
    if (!root.contains(e.target)) open = false
  }
</script>

<svelte:window on:click={onDocClick} />

<div class="cell" class:wide bind:this={root} class:open>
  <input
    type="text"
    class="ico-input"
    bind:value
    {maxlength}
    {placeholder}
    aria-label={ariaLabel}
    title="Saisie ou collage ; le chevron ouvre une grille"
    autocomplete="off"
    spellcheck="false"
  />
  <button
    type="button"
    class="pick"
    aria-label="Ouvrir la grille d’emojis"
    aria-expanded={open}
    title="Grille d’emojis"
    on:click={toggle}
  >▾</button>
  {#if open}
    <div class="panel" role="listbox" aria-label="Emojis">
      {#each EMOJIS as em}
        <button type="button" class="em" on:click|stopPropagation={() => pick(em)}>{em}</button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .cell {
    position: relative;
    display: inline-flex;
    align-items: stretch;
    box-sizing: border-box;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    vertical-align: middle;
    overflow: visible;
  }
  .cell:not(.wide) {
    width: 3.35rem;
  }
  .cell.wide {
    width: 3.85rem;
  }
  .cell.open {
    border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
  }
  .ico-input {
    flex: 1 1 auto;
    min-width: 0;
    width: 0;
    box-sizing: border-box;
    margin: 0;
    padding: 6px 2px 6px 6px;
    border: none;
    border-radius: 8px 0 0 8px;
    background: transparent;
    color: var(--text);
    font-size: 1.1rem;
    font-family: inherit;
    text-align: center;
  }
  .ico-input:focus {
    outline: none;
  }
  .cell:focus-within:not(.open) {
    border-color: var(--accent);
  }
  .pick {
    flex: 0 0 1.1rem;
    margin: 0;
    padding: 0 2px 0 0;
    border: none;
    border-left: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
    border-radius: 0 8px 8px 0;
    background: transparent;
    color: var(--muted);
    font-size: max(15px, 0.65rem);
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pick:hover,
  .pick:focus-visible {
    color: var(--text);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
  }
  .panel {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 80;
    display: grid;
    grid-template-columns: repeat(8, 1.85rem);
    gap: 4px;
    padding: 10px;
    max-height: 220px;
    overflow-y: auto;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--bg);
    box-shadow: 0 10px 36px rgba(0, 0, 0, 0.35);
  }
  .em {
    width: 1.85rem;
    height: 1.85rem;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    font-size: 1.15rem;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .em:hover {
    background: color-mix(in srgb, var(--accent) 18%, transparent);
  }
</style>
