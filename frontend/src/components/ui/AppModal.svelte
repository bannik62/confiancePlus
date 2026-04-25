<script>
  import { appModal, closeAppModal, runPrimaryAndClose, runSecondaryAndClose } from '../../stores/modal.js'
  import { onDestroy } from 'svelte'

  let elDialog

  const onKey = (e) => {
    if (!$appModal.open) return
    if (e.key === 'Escape') {
      e.preventDefault()
      closeAppModal()
    }
  }

  $: if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', onKey, true)
    if ($appModal.open) document.addEventListener('keydown', onKey, true)
  }

  onDestroy(() => {
    if (typeof document !== 'undefined') document.removeEventListener('keydown', onKey, true)
  })

  /** @param {string} v */
  const variantClass = (v) => {
    if (v === 'celebration') return 'var-celebration'
    if (v === 'success') return 'var-success'
    if (v === 'warning') return 'var-warning'
    return 'var-info'
  }

  const onPrimaryClick = () => void runPrimaryAndClose()
  const onSecondaryClick = () => void runSecondaryAndClose()
</script>

{#if $appModal.open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="app-modal-overlay" on:click|self={() => closeAppModal()} aria-hidden="true"></div>
  <div
    class="app-modal-wrap"
    role="dialog"
    aria-modal="true"
    aria-labelledby="app-modal-title"
    tabindex="-1"
    bind:this={elDialog}
  >
    <div class="app-modal {variantClass($appModal.variant)}">
      <button type="button" class="app-modal-x" on:click={() => closeAppModal()} aria-label="Fermer">
        ×
      </button>
      {#if $appModal.heroImage}
        <div class="app-modal-hero" aria-hidden="true">
          <img src={$appModal.heroImage} alt="" class="app-modal-hero-img" />
        </div>
      {:else}
        <div class="app-modal-icon" aria-hidden="true">{$appModal.icon}</div>
      {/if}
      <h2 id="app-modal-title" class="app-modal-title">{$appModal.title}</h2>
      <p class="app-modal-body">{$appModal.body}</p>
      <div class="app-modal-actions">
        {#if $appModal.secondaryLabel}
          <button type="button" class="app-modal-btn secondary" on:click={onSecondaryClick}>
            {$appModal.secondaryLabel}
          </button>
        {/if}
        <button type="button" class="app-modal-btn primary" on:click={onPrimaryClick}>
          {$appModal.primaryLabel}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .app-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 240;
    background: rgba(6, 8, 18, 0.72);
    backdrop-filter: blur(4px);
  }
  .app-modal-wrap {
    position: fixed;
    inset: 0;
    z-index: 241;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    pointer-events: none;
  }
  .app-modal {
    pointer-events: auto;
    position: relative;
    width: min(420px, 100%);
    border-radius: 16px;
    padding: 22px 20px 18px;
    border: 1.5px solid var(--modal-border, rgba(255, 255, 255, 0.14));
    background: var(--modal-bg, var(--surface, #151522));
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
  }
  .var-celebration {
    --modal-border: color-mix(in srgb, var(--gold, #fbbf24) 55%, transparent);
    --modal-glow: color-mix(in srgb, var(--gold) 22%, transparent);
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--gold) 35%, transparent),
      0 18px 48px rgba(0, 0, 0, 0.45);
    background: linear-gradient(
      165deg,
      color-mix(in srgb, var(--gold) 12%, var(--surface, #151522)),
      var(--surface, #151522)
    );
  }
  .var-success {
    --modal-border: color-mix(in srgb, var(--green, #4ade80) 50%, transparent);
  }
  .var-info {
    --modal-border: color-mix(in srgb, var(--cyan, #22d3ee) 50%, transparent);
  }
  .var-warning {
    --modal-border: color-mix(in srgb, var(--red, #f87171) 55%, transparent);
  }
  .app-modal-x {
    position: absolute;
    top: 8px;
    right: 10px;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--muted, #888);
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
  }
  .app-modal-x:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.06);
  }
  .app-modal-icon {
    font-size: 2.5rem;
    line-height: 1;
    text-align: center;
    margin-bottom: 10px;
  }
  .app-modal-hero {
    display: flex;
    justify-content: center;
    margin-bottom: 12px;
  }
  .app-modal-hero-img {
    width: min(140px, 52vw);
    height: auto;
    object-fit: contain;
    filter: drop-shadow(0 6px 18px rgba(0, 0, 0, 0.35));
  }
  .app-modal-title {
    margin: 0 0 10px;
    font-size: 1.15rem;
    font-weight: 800;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.04em;
    text-align: center;
    color: var(--text);
  }
  .app-modal-body {
    margin: 0 0 18px;
    font-size: 0.95rem;
    line-height: 1.5;
    text-align: center;
    color: var(--muted, #b8b8c8);
  }
  .app-modal-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
  }
  .app-modal-btn {
    font: inherit;
    cursor: pointer;
    border-radius: 10px;
    padding: 10px 18px;
    font-weight: 700;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.06em;
    border: 1px solid transparent;
  }
  .app-modal-btn.primary {
    background: var(--cyan, #22d3ee);
    color: #0a0a12;
  }
  .app-modal-btn.secondary {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.14);
    color: var(--text);
  }
</style>
