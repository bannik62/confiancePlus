<script>
  import { formatActiveDaysLabel } from '../../lib/habitWeekdays.js'

  /** @type {boolean} */
  export let open = false
  /** @type {string} */
  export let title = 'Habitudes'
  /** @type {{
   *   username?: string,
   *   avatar?: string,
   *   habits?: Array<Record<string, unknown>>,
   *   yesterdayHabits?: Array<Record<string, unknown> & { done?: boolean }>,
   *   todayHabits?: Array<Record<string, unknown> & { done?: boolean }>,
   *   peerYesterdayYmd?: string,
   *   peerTodayYmd?: string,
   * } | null} */
  export let data = null
  /** @type {boolean} */
  export let loading = false
  /** @type {string} */
  export let error = ''
  export let onClose = () => {}

  /** @type {'yesterday' | 'today'} */
  let tab = 'today'
  let wasOpen = false
  $: {
    if (open && !wasOpen) tab = 'today'
    wasOpen = open
  }

  const close = () => onClose()
</script>

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="backdrop" on:click={close} role="presentation" aria-hidden="true"></div>
  <div
    class="panel"
    role="dialog"
    aria-modal="true"
    aria-labelledby="peer-habits-title"
  >
    <header class="head">
      <div class="head-main">
        {#if data?.avatar}
          <span class="ava" aria-hidden="true">{data.avatar}</span>
        {/if}
        <div class="head-text">
          <h2 id="peer-habits-title" class="title">{title}</h2>
          {#if data?.username}
            <p class="sub muted">@{data.username}</p>
          {/if}
        </div>
      </div>
      <button type="button" class="btn-close" on:click={close} aria-label="Fermer">×</button>
    </header>

    <div class="tabs" role="tablist" aria-label="Période">
      <button
        type="button"
        role="tab"
        class="tab"
        class:active={tab === 'today'}
        aria-selected={tab === 'today'}
        id="tab-today"
        tabindex={tab === 'today' ? 0 : -1}
        on:click={() => (tab = 'today')}
      >
        Aujourd’hui
      </button>
      <button
        type="button"
        role="tab"
        class="tab"
        class:active={tab === 'yesterday'}
        aria-selected={tab === 'yesterday'}
        id="tab-yesterday"
        tabindex={tab === 'yesterday' ? 0 : -1}
        on:click={() => (tab = 'yesterday')}
      >
        Hier
      </button>
    </div>

    <div class="body" role="tabpanel" aria-labelledby={tab === 'today' ? 'tab-today' : 'tab-yesterday'}>
      {#if loading}
        <p class="muted center-pad">Chargement…</p>
      {:else if error}
        <p class="err center-pad">{error}</p>
      {:else if tab === 'today'}
        {#if data?.todayHabits?.length}
          <ul class="list">
            {#each data.todayHabits as h (h.id)}
              <li class="habit-row" class:done={h.done}>
                <span class="habit-ico" aria-hidden="true">{h.icon}</span>
                <div class="habit-info">
                  <div class="habit-name">{h.name}</div>
                  <div class="habit-meta muted">
                    {formatActiveDaysLabel(h.weekdaysMask)} · {h.xp ?? 0} XP
                  </div>
                </div>
                <span class="status" class:ok={h.done} aria-label={h.done ? 'Fait' : 'Pas encore fait'}>
                  {h.done ? 'Fait' : 'Pas encore'}
                </span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="muted center-pad">Aucune habitude prévue aujourd’hui (chez ce joueur).</p>
        {/if}
      {:else if tab === 'yesterday'}
        {#if data?.yesterdayHabits?.length}
          <ul class="list">
            {#each data.yesterdayHabits as h (h.id)}
              <li class="habit-row" class:done={h.done}>
                <span class="habit-ico" aria-hidden="true">{h.icon}</span>
                <div class="habit-info">
                  <div class="habit-name">{h.name}</div>
                  <div class="habit-meta muted">
                    {formatActiveDaysLabel(h.weekdaysMask)} · {h.xp ?? 0} XP
                  </div>
                </div>
                <span class="status" class:ok={h.done} aria-label={h.done ? 'Fait' : 'Non fait'}>
                  {h.done ? 'Fait' : 'Non fait'}
                </span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="muted center-pad">Aucune habitude prévue hier (chez ce joueur).</p>
        {/if}
      {/if}
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(2px);
  }

  .panel {
    position: fixed;
    z-index: 201;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(100% - 24px, 420px);
    max-height: min(85dvh, 560px);
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
    margin: 2px 0 0;
    font-size: 0.8rem;
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

  .tabs {
    display: flex;
    gap: 0;
    padding: 0 10px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .tab {
    flex: 1 1 0;
    min-height: 44px;
    padding: 10px 8px;
    border: none;
    background: transparent;
    color: var(--muted);
    font-size: 0.82rem;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    line-height: 1.2;
  }

  @media (max-width: 360px) {
    .tab {
      font-size: 0.76rem;
      padding: 10px 4px;
    }
  }

  .tab.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }

  .tab:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  .body {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 10px 12px 16px;
    flex: 1;
    min-height: 0;
  }

  .center-pad {
    text-align: center;
    padding: 20px 8px;
    margin: 0;
  }

  .err {
    color: #f87171;
  }

  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .habit-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 12px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 12px;
  }

  .habit-row.done {
    border-color: color-mix(in srgb, var(--cyan) 45%, var(--border));
  }

  .habit-ico {
    font-size: 22px;
    line-height: 1;
    flex-shrink: 0;
  }

  .habit-info {
    min-width: 0;
    flex: 1;
  }

  .habit-name {
    font-weight: 700;
    font-size: 0.95rem;
    word-break: break-word;
  }

  .habit-meta {
    font-size: 0.78rem;
    margin-top: 4px;
    line-height: 1.35;
  }

  .status {
    flex-shrink: 0;
    align-self: center;
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 6px 8px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.06);
    color: var(--muted);
    max-width: 38%;
    text-align: center;
    line-height: 1.2;
  }

  .status.ok {
    background: color-mix(in srgb, var(--cyan) 22%, transparent);
    color: var(--cyan);
  }

  @media (max-width: 340px) {
    .status {
      font-size: 0.65rem;
      padding: 6px 6px;
    }
  }
</style>
