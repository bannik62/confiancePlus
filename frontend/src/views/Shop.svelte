<script>
  import { onMount } from 'svelte'
  import { tab } from '../stores/tab.js'
  import { authStore, mergeUser } from '../stores/auth.js'
  import { storeApi } from '../api/store.js'

  /** @type {Array<{ sku: string, name: string, description: string, icon: string, priceCristaux: number }>} */
  let items = []
  let loadError = ''
  let purchasing = ''

  const loadCatalog = async () => {
    loadError = ''
    try {
      const r = await storeApi.getCatalog()
      items = Array.isArray(r?.items) ? r.items : []
    } catch {
      loadError = 'Impossible de charger la boutique.'
      items = []
    }
  }

  onMount(loadCatalog)

  /**
   * @param {string} sku
   */
  async function buy(sku) {
    purchasing = sku
    loadError = ''
    try {
      const r = await storeApi.purchase(sku)
      if (r && typeof r.cristaux === 'number') mergeUser({ cristaux: r.cristaux })
      if (r && typeof r.jokerStreak === 'number') mergeUser({ jokerStreak: r.jokerStreak })
    } catch (e) {
      loadError =
        typeof e?.message === 'string' && e.message.length
          ? e.message
          : 'Achat impossible pour le moment.'
    } finally {
      purchasing = ''
    }
  }

  $: balance = $authStore.user?.cristaux ?? 0
  $: jokers = $authStore.user?.jokerStreak ?? 0
</script>

<div class="view shop-view">
  <header class="shop-head">
    <button type="button" class="back" on:click={() => tab.set('home')}>← Accueil</button>
    <h1>Boutique</h1>
    <p class="sub">Dépense tes cristaux pour des objets utiles.</p>
  </header>

  <div class="wallet" aria-live="polite">
    <div class="wallet-chip cri">
      <span class="w-ico" aria-hidden="true">💎</span>
      <div class="w-body">
        <span class="w-val">{balance}</span>
        <span class="w-lbl">cristaux</span>
      </div>
    </div>
    <div class="wallet-chip jok">
      <span class="w-ico" aria-hidden="true">🃏</span>
      <div class="w-body">
        <span class="w-val">{jokers}</span>
        <span class="w-lbl">joker{jokers !== 1 ? 's' : ''} série</span>
      </div>
    </div>
  </div>

  {#if loadError && !items.length}
    <p class="banner-err" role="alert">{loadError}</p>
  {/if}

  <div class="shop-articles-block">
  <div class="section-label">Articles</div>

  <ul class="article-list">
    {#each items as item (item.sku)}
      <li class="article-card">
        <div class="art-ava" aria-hidden="true">{item.icon || '🛒'}</div>
        <div class="art-main">
          <div class="art-title">{item.name}</div>
          <p class="art-desc">{item.description}</p>
          <div class="art-meta">
            <span class="price-tag">💎 {item.priceCristaux}</span>
          </div>
        </div>
        <div class="art-action">
          <button
            type="button"
            class="buy-btn"
            disabled={purchasing === item.sku || balance < item.priceCristaux}
            on:click={() => buy(item.sku)}
          >
            {purchasing === item.sku ? '…' : 'Acheter'}
          </button>
        </div>
      </li>
    {/each}
  </ul>
  </div>

  {#if items.length === 0 && !loadError}
    <p class="muted center">Aucun article pour le moment.</p>
  {/if}

  {#if loadError && items.length}
    <p class="banner-err soft" role="alert">{loadError}</p>
  {/if}
</div>

<style>
  .shop-view {
    max-width: 560px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 22px;
    box-sizing: border-box;
  }
  .shop-head {
    margin-bottom: 0;
    padding: 14px 16px;
    border-radius: 16px;
    border: 1px solid var(--border);
    background: var(--surface);
    background-color: var(--surface);
    background-clip: padding-box;
    isolation: isolate;
    box-sizing: border-box;
  }
  .back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    margin: 0 0 8px -4px;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: var(--muted, #888);
    font: inherit;
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    cursor: pointer;
    transition: color 0.15s, background 0.15s;
  }
  .back:hover {
    color: var(--cyan);
    background: color-mix(in srgb, var(--cyan) 12%, var(--surface));
  }
  h1 {
    margin: 0 0 6px;
    font-size: 1.65rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: var(--text);
    font-family: 'Rajdhani', sans-serif;
  }
  .sub {
    margin: 0;
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    color: var(--text-label, #94a3b8);
    line-height: 1.45;
  }

  .wallet {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 0;
  }
  .wallet-chip {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: var(--surface);
    background-color: var(--surface);
    background-clip: padding-box;
    min-width: 0;
    flex: 1 1 200px;
    isolation: isolate;
    box-sizing: border-box;
  }
  .wallet-chip.cri {
    border-color: color-mix(in srgb, var(--cyan) 40%, transparent);
    box-shadow: 0 0 18px color-mix(in srgb, var(--cyan) 12%, transparent);
  }
  .wallet-chip.jok {
    border-color: color-mix(in srgb, var(--accent) 35%, transparent);
  }
  .w-ico {
    font-size: 1.35rem;
    line-height: 1;
  }
  .w-body {
    display: flex;
    flex-direction: column;
    gap: 0;
    min-width: 0;
  }
  .w-val {
    font-size: 1.35rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: var(--cyan);
    font-family: 'Rajdhani', sans-serif;
  }
  .wallet-chip.jok .w-val {
    color: var(--gold);
  }
  .w-lbl {
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
  }

  .shop-articles-block {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }

  .section-label {
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    letter-spacing: 0.14em;
    font-weight: 800;
    color: var(--muted);
    margin-bottom: 0;
    font-family: 'Rajdhani', sans-serif;
    width: fit-content;
    max-width: 100%;
    box-sizing: border-box;
    padding: 8px 12px;
    background: var(--surface);
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    isolation: isolate;
  }

  .article-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .article-card {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 14px;
    border-radius: 16px;
    border: 1px solid var(--border);
    background: var(--surface);
    background-color: var(--surface);
    background-clip: padding-box;
    transition: border-color 0.15s, box-shadow 0.15s;
    isolation: isolate;
    box-sizing: border-box;
  }
  .article-card:hover {
    border-color: color-mix(in srgb, var(--accent) 45%, transparent);
    box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 15%, transparent);
  }

  .art-ava {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    border: 2px solid color-mix(in srgb, var(--accent) 35%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    flex-shrink: 0;
  }

  .art-main {
    flex: 1;
    min-width: min(100%, 200px);
  }
  .art-title {
    font-weight: 900;
    font-size: 15px;
    margin-bottom: 4px;
    color: var(--text);
  }
  .art-desc {
    margin: 0 0 8px;
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    line-height: 1.5;
    color: var(--text-label, #94a3b8);
  }
  .art-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .price-tag {
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    font-weight: 800;
    font-family: 'Rajdhani', sans-serif;
    color: var(--cyan);
    padding: 4px 10px;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--cyan) 35%, transparent);
    background: var(--surface);
    background-color: var(--surface);
    isolation: isolate;
  }

  .art-action {
    flex-shrink: 0;
    margin-left: auto;
    align-self: center;
  }
  @media (max-width: 420px) {
    .art-action {
      width: 100%;
      margin-left: 0;
    }
    .buy-btn {
      width: 100%;
    }
  }

  .buy-btn {
    appearance: none;
    min-height: 44px;
    padding: 0 18px;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--accent) 55%, transparent);
    background: color-mix(in srgb, var(--accent) 22%, transparent);
    color: var(--text);
    font: inherit;
    font-weight: 800;
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.06em;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .buy-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent) 32%, transparent);
    border-color: color-mix(in srgb, var(--accent) 75%, transparent);
  }
  .buy-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .banner-err {
    padding: 10px 12px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--surface) 88%, rgba(220, 80, 80, 0.35));
    border: 1px solid rgba(220, 80, 80, 0.35);
    color: #f0a8a8;
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    margin-bottom: 0;
    isolation: isolate;
    box-sizing: border-box;
  }
  .banner-err.soft {
    margin-top: 0;
    margin-bottom: 0;
  }
  .muted.center {
    text-align: center;
    color: var(--muted);
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
  }
</style>
