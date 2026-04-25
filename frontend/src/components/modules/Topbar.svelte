<script>
  import { authStore }    from '../../stores/auth.js'
  import { profileStore } from '../../stores/profile.js'
  import { tab }          from '../../stores/tab.js'
  import XPBar            from '../ui/XPBar.svelte'
  import Tag              from '../ui/Tag.svelte'
</script>

<header>
  <div class="brand">
    <div class="label">HABITRACKS</div>
    <div class="name">⚡ {$authStore.user?.username ?? ''}</div>
  </div>

  <div class="right">
    <div class="tags">
      {#if $profileStore.title}
        <Tag color="var(--cyan)">{$profileStore.title.icon}</Tag>
      {/if}
      <span class="cristaux" title="Cristaux">💎 {$authStore.user?.cristaux ?? 0}</span>
      {#if ($authStore.user?.jokerStreak ?? 0) > 0}
        <span
          class="joker-badge"
          title="Joker de série × {$authStore.user?.jokerStreak} — protège ta flamme au sauvetage"
        >
          🃏 {$authStore.user?.jokerStreak}
        </span>
      {/if}
      <span class="streak">🔥 {$profileStore.streak}</span>
      <button class="avatar" on:click={() => tab.set('profil')}>
        {$authStore.user?.avatar ?? '🦊'}
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
    font-size: 10px;
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
  .cristaux { font-size: 12px; color: var(--cyan); font-weight: 700; }
  .joker-badge {
    font-size: 12px;
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
  .streak { font-size: 12px; color: var(--gold); }
  .avatar {
    width: 34px; height: 34px;
    border-radius: 10px;
    background: var(--grad-avatar);
    border: none; cursor: pointer; font-size: 18px;
    box-shadow: 0 0 20px var(--accent)55;
  }
</style>
