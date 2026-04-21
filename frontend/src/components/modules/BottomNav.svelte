<script>
  import { tab } from '../../stores/tab.js'
  export let TABS = []
</script>

<nav>
  {#each TABS as t}
    <button class:active={$tab === t.key} on:click={() => tab.set(t.key)}>
      <span class="ico">{t.ico}</span>
      <span class="lbl">{t.label}</span>
    </button>
  {/each}
</nav>

<style>
  nav {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    background: linear-gradient(180deg, transparent, var(--bg)dd);
    backdrop-filter: blur(12px);
    border-top: 1px solid var(--accent)33;
    display: flex;
    justify-content: space-around;
    padding: 8px var(--app-gutter-x) 12px;
    z-index: 100;
  }
  button {
    background: transparent;
    border: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    cursor: pointer;
    opacity: 0.4;
    transition: opacity 0.2s;
  }
  button.active { opacity: 1; }
  .ico { font-size: 22px; }
  .lbl {
    font-size: 9px;
    color: var(--muted);
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 1px;
    font-weight: 700;
  }
  button.active .lbl { color: var(--accent); }
  button.active .ico { filter: drop-shadow(0 0 8px var(--accent)); }
</style>
