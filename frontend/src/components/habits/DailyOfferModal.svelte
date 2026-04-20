<script>
  /** Catalogue épuisé (tous les titres proposés sont déjà dans tes habitudes, etc.) */
  export let exhausted = false
  export let onExhaustedOk = () => {}

  /** @type {{ title: string, icon: string, xpTotal: number } | null} */
  export let template = null
  export let loading = false
  /** Erreur API (réseau, refus, etc.) */
  export let errorMessage = ''
  /** Refus explicite uniquement (pas de fermeture au clic hors carte) */
  export let onDismiss = async () => {}
  export let onAccept = async () => {}
</script>

{#if exhausted}
  <div class="overlay" aria-hidden={false}>
    <div class="backdrop" aria-hidden="true"></div>
    <div class="modal-inner">
      <div
        class="card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-offer-exhausted-title"
        aria-describedby="daily-offer-exhausted-desc"
      >
        <p class="kicker">Habitude du jour</p>
        <h2 id="daily-offer-exhausted-title" class="title">Pas de nouvelle proposition</h2>
        <p id="daily-offer-exhausted-desc" class="sub exhausted-copy">
          Tu as déjà des habitudes qui reprennent tous les modèles disponibles pour l’instant, ou le
          catalogue est épuisé. De nouvelles idées arriveront dans une prochaine mise à jour.
        </p>
        <div class="actions exhausted-actions">
          <button type="button" class="btn primary" on:click={() => onExhaustedOk()}>OK</button>
        </div>
      </div>
    </div>
  </div>
{:else if template}
  <div class="overlay" aria-hidden={false}>
    <div class="backdrop" aria-hidden="true"></div>
    <div class="modal-inner">
      <div
        class="card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-offer-title"
        aria-describedby="daily-offer-desc"
      >
        <p class="kicker">Habitude du jour</p>
        <h2 id="daily-offer-title" class="title">
          <span class="ico" aria-hidden="true">{template.icon}</span>
          {template.title}
        </h2>
        <p id="daily-offer-desc" class="sub">
          +{template.xpTotal} XP si tu coches cette habitude aujourd’hui
          <span class="hint">(bonus par rapport au +10 habituel)</span>
        </p>
        {#if errorMessage}
          <p class="err" role="alert">{errorMessage}</p>
        {/if}
        <div class="actions">
          <button type="button" class="btn ghost" disabled={loading} on:click={() => onDismiss()}>
            {loading ? '…' : 'Je n’en veux pas'}
          </button>
          <button type="button" class="btn primary" disabled={loading} on:click={() => onAccept()}>
            {loading ? '…' : 'J’accepte'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 1200;
  }
  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(5, 5, 20, 0.65);
    /* Pas de clic = pas de refus accidentel ; seuls les boutons comptent */
    pointer-events: auto;
  }
  .modal-inner {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    pointer-events: none;
  }
  .card {
    pointer-events: auto;
    max-width: 22rem;
    width: 100%;
    background: var(--surface, #0e0e2a);
    border: 1px solid var(--border, #1e1b4b);
    border-radius: 16px;
    padding: 1.25rem 1.25rem 1rem;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
  }
  .kicker {
    margin: 0 0 0.35rem;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted, #94a3b8);
  }
  .title {
    margin: 0 0 0.5rem;
    font-size: 1.15rem;
    line-height: 1.3;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .ico {
    font-size: 1.5rem;
    line-height: 1;
  }
  .sub {
    margin: 0 0 1rem;
    font-size: 0.9rem;
    color: var(--text, #e2e8f0);
    line-height: 1.45;
  }
  .hint {
    display: block;
    margin-top: 0.35rem;
    font-size: 0.78rem;
    color: var(--muted, #94a3b8);
  }
  .err {
    margin: 0 0 0.75rem;
    padding: 0.5rem 0.65rem;
    border-radius: 8px;
    font-size: 0.85rem;
    line-height: 1.4;
    color: #fecaca;
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.35);
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: stretch;
  }
  .actions .btn {
    flex: 1 1 8rem;
  }
  .exhausted-copy {
    margin-bottom: 1.1rem;
  }
  .exhausted-actions {
    justify-content: center;
  }
  .exhausted-actions .btn {
    flex: 0 1 auto;
    min-width: 8rem;
  }
  .btn {
    border-radius: 10px;
    padding: 0.55rem 0.85rem;
    font-size: 0.9rem;
    cursor: pointer;
    border: 1px solid transparent;
  }
  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .btn.ghost {
    background: transparent;
    border-color: var(--border, #1e1b4b);
    color: var(--text, #e2e8f0);
  }
  .btn.primary {
    background: var(--accent, #7c3aed);
    color: #fff;
  }
</style>
