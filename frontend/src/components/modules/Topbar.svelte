<script>
  import { authStore }    from '../../stores/auth.js'
  import { profileStore } from '../../stores/profile.js'
  import { gameplayStore } from '../../stores/gameplay.js'
  import { openItemsModal } from '../../stores/itemsModal.js'
  import { openLevelGuideModal } from '../../stores/levelGuideModal.js'
  import XPBar            from '../ui/XPBar.svelte'
  import { currentStreakBadgeSrc } from '../../lib/streakCurrentBadge.js'

  $: streakTrophyImg = (() => {
    const rw = $gameplayStore?.streak?.rewards
    const h = Array.isArray(rw) && rw[0] ? rw[0].heroImage : null
    return typeof h === 'string' && h.trim() ? h.trim() : '/badges/fireStreackBadge/1000002186.png'
  })()

  $: streakTierImg = currentStreakBadgeSrc($profileStore.streak, $gameplayStore)

  const openMyItems = () => {
    const u = $authStore.user
    if (!u) return
    openItemsModal({
      title: 'Tes objets',
      username: u.username,
      avatar: u.avatar,
      cristaux: u.cristaux ?? 0,
      jokerStreak: u.jokerStreak ?? 0,
      streak7TrophyCount: u.streak7TrophyCount ?? 0,
      trophyImageSrc: streakTrophyImg,
    })
  }
</script>

<header>
  <div class="brand">
    <div class="label">HABITRACKS</div>
    <div class="name">⚡ {$authStore.user?.username ?? ''}</div>
  </div>

  <div class="right">
    <div class="tags">
      <button
        type="button"
        class="niveaux-entry"
        on:click|stopPropagation={openLevelGuideModal}
        aria-haspopup="dialog"
        aria-label="Voir l’échelle des niveaux et des titres"
      >
        <span class="niveaux-lbl">niveaux :</span>
        <span class="niveaux-ico" aria-hidden="true">{$profileStore.title?.icon ?? '🌱'}</span>
      </button>
      <button
        type="button"
        class="topbar-items-trigger"
        on:click|stopPropagation={openMyItems}
        aria-haspopup="dialog"
        aria-label="Voir tes objets et ta série : {$profileStore.streak} jours, cristaux, jokers, trophées série"
      >
        <span class="items-lbl" aria-hidden="true">Items</span>
        <span class="streak-inline" title="Série (jours consécutifs)">🔥 {$profileStore.streak}</span>
        <span class="cristaux" title="Cristaux">💎 {$authStore.user?.cristaux ?? 0}</span>
        {#if ($authStore.user?.jokerStreak ?? 0) > 0}
          <span
            class="joker-badge"
            title="Joker de série × {$authStore.user?.jokerStreak} — protège ta flamme au sauvetage"
          >
            🃏 {$authStore.user?.jokerStreak}
          </span>
        {/if}
        {#if streakTierImg}
          <span class="streak-tier-badge" title="Palier de série actuel">
            <img src={streakTierImg} alt="" class="streak-tier-ico" />
          </span>
        {/if}
      </button>
    </div>
    <XPBar
      current={$profileStore.current}
      required={$profileStore.required}
      embedLevel={$profileStore.level}
    />
  </div>
</header>

<style>
  header {
    background: var(--grad-topbar);
    border-bottom: 1px solid var(--accent)44;
    padding: 10px var(--app-gutter-x);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 2px 20px var(--accent)33;
  }
  .brand {
    flex-shrink: 0;
    min-width: 0;
  }
  .label {
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    color: var(--accent);
    letter-spacing: 3px;
    font-family: 'Rajdhani', sans-serif;
  }
  .name {
    font-size: 17px;
    font-weight: 900;
    font-family: 'Rajdhani', sans-serif;
    background: var(--grad-player);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .right {
    text-align: right;
    min-width: 0;
    flex: 1;
    max-width: min(420px, 100%);
    margin-left: 12px;
  }
  .tags {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: flex-end;
    margin-bottom: 6px;
    flex-wrap: wrap;
    min-width: 0;
  }
  .niveaux-entry {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
    padding: 4px 10px 4px 8px;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--cyan) 45%, var(--border));
    background: rgba(255, 255, 255, 0.04);
    cursor: pointer;
    font: inherit;
    color: inherit;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }
  .niveaux-entry:hover {
    background: color-mix(in srgb, var(--cyan) 12%, transparent);
    border-color: color-mix(in srgb, var(--cyan) 58%, var(--border));
  }
  .niveaux-entry:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .niveaux-lbl {
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    font-weight: 800;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.04em;
    color: var(--muted);
  }
  .niveaux-ico {
    font-size: 1.2rem;
    line-height: 1;
  }
  .topbar-items-trigger {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    max-width: 100%;
    padding: 4px 10px 4px 8px;
    border-radius: 11px;
    border: 1px solid color-mix(in srgb, var(--cyan) 38%, var(--border));
    background: linear-gradient(
      148deg,
      color-mix(in srgb, var(--accent) 18%, transparent),
      color-mix(in srgb, var(--cyan) 12%, transparent)
    );
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
    cursor: pointer;
    font: inherit;
    color: inherit;
    text-align: left;
  }
  .topbar-items-trigger:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .items-lbl {
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 800;
    color: color-mix(in srgb, var(--text) 55%, transparent);
    flex-shrink: 0;
  }
  .streak-inline {
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: var(--gold);
    font-family: 'Rajdhani', sans-serif;
    flex-shrink: 0;
    white-space: nowrap;
  }
  .cristaux { font-size: clamp(15px, 0.72rem + 0.28vw, 17px); color: var(--cyan); font-weight: 700; }
  .streak-tier-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    font-weight: 800;
    color: var(--gold);
    font-family: 'Rajdhani', sans-serif;
  }
  .streak-tier-ico {
    width: 24px;
    height: 24px;
    object-fit: contain;
    display: block;
  }
  .joker-badge {
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    font-weight: 800;
    color: #f0abfc;
    text-shadow:
      0 0 8px rgba(168, 85, 247, 0.95),
      0 0 14px rgba(236, 72, 153, 0.65);
    animation: jokerGlow 2.4s ease-in-out infinite;
  }
  @keyframes jokerGlow {
    0%,
    100% {
      text-shadow:
        0 0 6px rgba(168, 85, 247, 0.85),
        0 0 12px rgba(236, 72, 153, 0.45);
      filter: drop-shadow(0 0 3px rgba(192, 132, 252, 0.7));
    }
    50% {
      text-shadow:
        0 0 10px rgba(236, 72, 153, 0.95),
        0 0 18px rgba(168, 85, 247, 0.75);
      filter: drop-shadow(0 0 8px rgba(244, 114, 182, 0.85));
    }
  }
</style>
