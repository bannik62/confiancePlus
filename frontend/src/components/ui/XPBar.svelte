<script>
  export let current = 0
  export let required = 100
  export let label = ''
  /** Si défini (nombre, ex. niveau courant), jauge « riche » : LVL + XP dans la barre (topbar). */
  export let embedLevel = null

  $: percent = Math.min(100, Math.round((current / required) * 100))
  $: richBar = typeof embedLevel === 'number'
</script>

{#if label}
  <div class="meta">
    <span>{label}</span>
    <span>{current}/{required} XP</span>
  </div>
{/if}

{#if richBar}
  <div
    class="embed-wrap"
    role="progressbar"
    aria-valuenow={percent}
    aria-valuemin="0"
    aria-valuemax="100"
    aria-label="Niveau {embedLevel}, {current} XP sur {required} pour le niveau suivant"
  >
    <div class="embed-track">
      <div class="embed-fill" style="width: {percent}%" />
      <div class="embed-labels">
        <span class="embed-lvl">LVL {embedLevel}</span>
        <span class="embed-xp">{current} / {required} XP</span>
      </div>
    </div>
  </div>
{:else}
  <div class="track">
    <div class="fill" style="width: {percent}%" />
  </div>
{/if}

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

  .embed-wrap {
    width: 100%;
    min-width: 0;
  }
  .embed-track {
    position: relative;
    height: 24px;
    border-radius: 12px;
    background: var(--border);
    overflow: hidden;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }
  .embed-fill {
    position: absolute;
    inset: 0 auto 0 0;
    width: 0;
    max-width: 100%;
    background: var(--grad-xp);
    border-radius: 12px;
    box-shadow: 0 0 16px var(--gold)66;
    transition: width 0.8s ease;
  }
  .embed-labels {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    height: 100%;
    padding: 0 10px;
    min-width: 0;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 800;
    font-size: 11px;
    letter-spacing: 0.06em;
    color: #f4f4ff;
    text-shadow:
      0 1px 2px rgba(0, 0, 0, 0.92),
      0 0 12px rgba(0, 0, 0, 0.55);
    pointer-events: none;
    white-space: nowrap;
  }
  .embed-lvl {
    color: #fff6e0;
    flex-shrink: 0;
  }
  .embed-xp {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    opacity: 0.95;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* Petits téléphones (ex. 390×844) : jauge plus fine */
  @media (max-width: 390px) {
    .embed-track {
      height: 16px;
      border-radius: 8px;
    }
    .embed-fill {
      border-radius: 8px;
    }
    .embed-labels {
      font-size: 9px;
      padding: 0 6px;
      letter-spacing: 0.04em;
    }
    .embed-xp {
      display: none;
    }
  }
  @media (max-width: 380px) {
    .embed-labels {
      justify-content: center;
      padding: 0 8px;
    }
  }
</style>
