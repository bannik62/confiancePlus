<script>
  import { authStore }    from '../../stores/auth.js'
  import { profileStore } from '../../stores/profile.js'
  import { tab }          from '../../stores/tab.js'
  import XPBar            from '../ui/XPBar.svelte'
  import Tag              from '../ui/Tag.svelte'
</script>

<header>
  <div class="brand">
    <div class="label">CONFIANCE+</div>
    <div class="name">⚡ {$authStore.user?.username ?? ''}</div>
  </div>

  <div class="right">
    <div class="tags">
      <Tag color="var(--gold)">LVL {$profileStore.level}</Tag>
      {#if $profileStore.title}
        <Tag color="var(--cyan)">{$profileStore.title.icon}</Tag>
      {/if}
      <span class="cristaux" title="Cristaux">💎 {$authStore.user?.cristaux ?? 0}</span>
      <span class="streak">🔥 {$profileStore.streak}</span>
      <button class="avatar" on:click={() => tab.set('profil')}>
        {$authStore.user?.avatar ?? '🦊'}
      </button>
    </div>
    <XPBar current={$profileStore.current} required={$profileStore.required} />
  </div>
</header>

<style>
  header {
    background: var(--grad-topbar);
    border-bottom: 1px solid var(--accent)44;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 2px 20px var(--accent)33;
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
  .right { text-align: right; min-width: 160px; }
  .tags  { display: flex; gap: 8px; align-items: center; justify-content: flex-end; margin-bottom: 5px; }
  .cristaux { font-size: 12px; color: var(--cyan); font-weight: 700; }
  .streak { font-size: 12px; color: var(--gold); }
  .avatar {
    width: 34px; height: 34px;
    border-radius: 10px;
    background: var(--grad-avatar);
    border: none; cursor: pointer; font-size: 18px;
    box-shadow: 0 0 20px var(--accent)55;
  }
</style>
