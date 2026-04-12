<script>
  import { onMount }  from 'svelte'
  import { statsApi } from '../api/stats.js'
  import { authStore, clearAuth } from '../stores/auth.js'
  import Card  from '../components/ui/Card.svelte'
  import Tag   from '../components/ui/Tag.svelte'
  import XPBar from '../components/ui/XPBar.svelte'

  let profile = null

  onMount(async () => { profile = await statsApi.getMyProfile() })
</script>

<div class="view">
  {#if profile}
    <div class="hero">
      <div class="ava">{$authStore.user?.avatar ?? '🦊'}</div>
      <div class="uname">{profile.username}</div>
      <div class="tags">
        <Tag color="var(--gold)">LVL {profile.level}</Tag>
        <Tag color="var(--red)">🔥 {profile.streak} jours</Tag>
        <Tag color="var(--green)">{profile.title.icon} {profile.title.label}</Tag>
      </div>
    </div>

    <Card style="margin-bottom:12px">
      <XPBar current={profile.current} required={profile.required} label="NIVEAU {profile.level} → {profile.level + 1}" />
    </Card>

    <Card style="margin-bottom:12px">
      <div class="micro muted">XP TOTAL</div>
      <div class="total-xp">{profile.totalXP.toLocaleString()} XP</div>
    </Card>

    <button class="logout" on:click={clearAuth}>Se déconnecter</button>
  {:else}
    <div class="loading">Chargement…</div>
  {/if}
</div>

<style>
  .view   { display: flex; flex-direction: column; gap: 0; }
  .hero   { text-align: center; margin-bottom: 20px; }
  .ava    { width: 80px; height: 80px; border-radius: 20px; background: linear-gradient(135deg,var(--accent),var(--cyan)); display: flex; align-items: center; justify-content: center; font-size: 40px; margin: 0 auto 12px; box-shadow: 0 0 20px var(--accent)55; }
  .uname  { font-size: 22px; font-weight: 900; font-family: 'Rajdhani', sans-serif; background: linear-gradient(90deg,var(--accent),var(--gold)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .tags   { display: flex; gap: 8px; justify-content: center; margin-top: 8px; flex-wrap: wrap; }
  .micro  { font-size: 10px; letter-spacing: 2px; font-family: 'Rajdhani', sans-serif; margin-bottom: 4px; }
  .muted  { color: var(--muted); }
  .total-xp { font-size: 28px; font-weight: 900; color: var(--gold); }
  .logout { width: 100%; margin-top: 20px; background: transparent; border: 1px solid var(--red)44; border-radius: 12px; color: var(--red); font-size: 13px; padding: 12px; cursor: pointer; font-family: 'Rajdhani', sans-serif; letter-spacing: 1px; }
  .loading { color: var(--muted); text-align: center; padding: 40px; }
</style>
