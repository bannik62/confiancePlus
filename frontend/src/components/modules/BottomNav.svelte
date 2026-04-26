<script>
  import { tab } from '../../stores/tab.js'
  import { authStore } from '../../stores/auth.js'

  export let TABS = []

  const tabIcon = (t) =>
    t.key === 'profil' ? ($authStore.user?.avatar ?? t.ico) : t.ico
</script>

<nav>
  {#each TABS as t}
    <button class:active={$tab === t.key} on:click={() => tab.set(t.key)}>
      <span class="ico">{tabIcon(t)}</span>
      <span class="lbl">{t.label}</span>
    </button>
  {/each}
</nav>

<style>
  nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    /* Fond lisible (évite l’effet « barre invisible » sur fond sombre / emulateur) */
    background: linear-gradient(180deg, rgba(7, 7, 26, 0.55), var(--bg) 42%, var(--bg) 100%);
    backdrop-filter: blur(14px);
    border-top: 1px solid var(--accent)44;
    box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.45);
    display: flex;
    justify-content: space-around;
    padding: 8px var(--app-gutter-x) max(12px, env(safe-area-inset-bottom, 0px));
    /* Au-dessus du contenu ; sous AppModal (240+) et modales plein écran (1000+) */
    z-index: 230;
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
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    color: var(--muted);
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 1px;
    font-weight: 700;
  }
  button.active .lbl { color: var(--accent); }
  button.active .ico { filter: drop-shadow(0 0 8px var(--accent)); }
</style>
