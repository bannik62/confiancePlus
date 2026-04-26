<script>
  import { itemsModalStore, closeItemsModal } from '../../stores/itemsModal.js'

  /** Affiche au plus N tuiles trophée (collection) ; le reste est indiqué en texte. */
  const TROPHY_TILE_CAP = 40

  $: s = $itemsModalStore
  $: trophyTotal = Math.max(0, Math.floor(Number(s.streak7TrophyCount) || 0))
  $: trophyTiles = Math.min(trophyTotal, TROPHY_TILE_CAP)
  $: trophyExtra = trophyTotal > TROPHY_TILE_CAP ? trophyTotal - TROPHY_TILE_CAP : 0

  const close = () => closeItemsModal()
</script>

{#if s.open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="backdrop" on:click={close} role="presentation" aria-hidden="true"></div>
  <div
    class="panel"
    role="dialog"
    aria-modal="true"
    aria-labelledby="user-items-title"
  >
    <header class="head">
      <div class="head-main">
        {#if s.avatar}
          <span class="ava" aria-hidden="true">{s.avatar}</span>
        {/if}
        <div class="head-text">
          <h2 id="user-items-title" class="title">{s.title}</h2>
          {#if s.username && !(typeof s.title === 'string' && s.title.includes(s.username))}
            <p class="sub muted">{s.username}</p>
          {/if}
        </div>
      </div>
      <button type="button" class="btn-close" on:click={close} aria-label="Fermer">×</button>
    </header>

    <div class="body">
      <section class="block">
        <h3 class="block-title">Monnaie</h3>
        <p class="block-line">
          <span class="big-ico" aria-hidden="true">💎</span>
          <span><strong>{s.cristaux}</strong> cristaux</span>
        </p>
      </section>

      <section class="block">
        <h3 class="block-title">Jokers de série</h3>
        <p class="block-line">
          <span class="big-ico" aria-hidden="true">🃏</span>
          {#if s.jokerStreak > 0}
            <span><strong>{s.jokerStreak}</strong> en stock — utilisables au sauvetage de flamme.</span>
          {:else}
            <span class="muted">Aucun pour l’instant (boutique).</span>
          {/if}
        </p>
      </section>

      <section class="block">
        <h3 class="block-title">Trophées série</h3>
        {#if trophyTotal > 0}
          <p class="muted intro">Collection ({trophyTotal}) — même palier peut être gagné plusieurs fois après une coupure de série.</p>
          <div class="trophy-grid" role="list" aria-label="Trophées obtenus">
            {#each Array.from({ length: trophyTiles }) as _, tileIdx (tileIdx)}
              <div class="trophy-tile" role="listitem">
                <img src={s.trophyImageSrc} alt="" class="trophy-img" />
              </div>
            {/each}
          </div>
          {#if trophyExtra > 0}
            <p class="muted extra">
              + {trophyExtra}
              {trophyExtra > 1 ? ' autres trophées' : ' autre trophée'}
            </p>
          {/if}
        {:else}
          <p class="muted">Aucun trophée série pour l’instant.</p>
        {/if}
      </section>
    </div>

    <footer class="foot">
      <button type="button" class="btn-done" on:click={close}>Fermer</button>
    </footer>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 225;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(2px);
  }

  .panel {
    position: fixed;
    z-index: 226;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(100% - 24px, 420px);
    max-height: min(88dvh, 620px);
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
    padding: 0;
    overflow: hidden;
  }

  @media (max-width: 520px) {
    .panel {
      left: 0;
      right: 0;
      top: auto;
      bottom: 0;
      transform: none;
      width: 100%;
      max-height: min(88dvh, 100%);
      border-radius: 16px 16px 0 0;
      padding-bottom: env(safe-area-inset-bottom, 0);
    }
  }

  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    padding: 14px 14px 10px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .head-main {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex: 1;
  }

  .ava {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: var(--accent)22;
    border: 2px solid var(--accent)44;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
  }

  .head-text {
    min-width: 0;
  }

  .title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 900;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.5px;
    line-height: 1.2;
    word-break: break-word;
  }

  .sub {
    margin: 4px 0 0;
    font-size: max(15px, 0.82rem);
  }

  .muted {
    color: var(--muted);
  }

  .btn-close {
    min-width: 44px;
    min-height: 44px;
    margin: -6px -6px 0 0;
    border: none;
    background: transparent;
    color: var(--muted);
    font-size: 26px;
    line-height: 1;
    cursor: pointer;
    border-radius: 10px;
    flex-shrink: 0;
  }

  .btn-close:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.06);
  }

  .body {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 12px 14px 8px;
    flex: 1;
    min-height: 0;
  }

  .block {
    margin-bottom: 16px;
  }

  .block-title {
    margin: 0 0 8px;
    font-size: max(15px, 0.72rem);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 800;
    color: var(--muted);
  }

  .block-line {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.95rem;
    line-height: 1.4;
  }

  .big-ico {
    font-size: 1.35rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .intro {
    font-size: max(15px, 0.82rem);
    margin: 0 0 10px;
    line-height: 1.4;
  }

  .trophy-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .trophy-tile {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--gold) 35%, var(--border));
    background: rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .trophy-img {
    width: 40px;
    height: 40px;
    object-fit: contain;
    display: block;
  }

  .extra {
    margin: 10px 0 0;
    font-size: max(15px, 0.85rem);
  }

  .foot {
    flex-shrink: 0;
    padding: 10px 14px calc(12px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
  }

  .btn-done {
    font: inherit;
    cursor: pointer;
    border-radius: 10px;
    padding: 10px 20px;
    font-weight: 800;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.06em;
    border: 1px solid transparent;
    background: var(--cyan, #22d3ee);
    color: #0a0a12;
  }

  .btn-done:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
