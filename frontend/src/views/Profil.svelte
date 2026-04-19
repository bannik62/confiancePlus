<script>
  import { onMount }  from 'svelte'
  import { statsApi } from '../api/stats.js'
  import { authStore, clearAuth, isAppAdmin } from '../stores/auth.js'
  import { pushApi } from '../api/push.js'
  import { createPushSubscriptionJson } from '../lib/pushSubscribe.js'
  import { isStandalone, isIosLike, isAndroid, detectBrave } from '../lib/pwaUi.js'
  import Card  from '../components/ui/Card.svelte'
  import Tag   from '../components/ui/Tag.svelte'
  import XPBar from '../components/ui/XPBar.svelte'

  let profile = null
  let standalone = false
  /** Brave : souvent pas d’invite PWA tant que les Shields sont agressifs. */
  let isBraveBrowser = false
  /** Aide pas à pas (comme vitalinfo : pas de capture de beforeinstallprompt). */
  let showManualInstall = false

  let pushBusy = false
  let pushErr = ''
  let pushOk = ''
  let pushEnabled = false

  const refreshPushState = async () => {
    if (typeof window === 'undefined' || !('PushManager' in window)) return
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      pushEnabled = !!sub
    } catch {
      pushEnabled = false
    }
  }

  onMount(async () => {
    standalone = isStandalone()
    isBraveBrowser = await detectBrave()
    profile = await statsApi.getMyProfile()
    await refreshPushState()
  })

  const enablePush = async () => {
    pushErr = ''
    pushOk = ''
    pushBusy = true
    try {
      const { publicKey } = await pushApi.getVapidPublic()
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        pushErr = 'Permission de notification refusée.'
        return
      }
      const json = await createPushSubscriptionJson(publicKey)
      await pushApi.subscribe(json)
      pushOk = 'Rappels du jour activés sur cet appareil.'
      await refreshPushState()
    } catch (e) {
      pushErr = e.message || 'Activation impossible (VAPID ou navigateur).'
    } finally {
      pushBusy = false
    }
  }

  const disablePush = async () => {
    pushErr = ''
    pushOk = ''
    pushBusy = true
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await pushApi.unsubscribe({ endpoint: sub.endpoint })
        await sub.unsubscribe()
      } else {
        await pushApi.unsubscribe({})
      }
      pushOk = 'Rappels désactivés.'
      await refreshPushState()
    } catch (e) {
      pushErr = e.message || 'Erreur lors de la désactivation.'
    } finally {
      pushBusy = false
    }
  }

  function openInstallHelp() {
    showManualInstall = true
  }

  function closeManualInstall() {
    showManualInstall = false
  }

  function onKeydown(e) {
    if (!showManualInstall || e.key !== 'Escape') return
    closeManualInstall()
  }
</script>

<svelte:window on:keydown={onKeydown} />

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

    {#if !$isAppAdmin && typeof Notification !== 'undefined'}
      <Card style="margin-bottom:12px">
        <div class="micro muted">NOTIFICATIONS</div>
        <p class="pwa-lead" style="margin:8px 0">
          Rappel vers l’heure définie par l’équipe (défaut 14 h, fuseau Europe/Paris) si des habitudes du jour ne sont
          pas encore cochées.
        </p>
        {#if pushErr}<p class="err" style="color:var(--red);font-size:0.9rem">{pushErr}</p>{/if}
        {#if pushOk}<p class="ok" style="color:var(--green);font-size:0.9rem">{pushOk}</p>{/if}
        {#if pushEnabled}
          <button type="button" class="logout" disabled={pushBusy} on:click={disablePush}>
            {pushBusy ? '…' : 'Désactiver les rappels sur cet appareil'}
          </button>
        {:else}
          <button type="button" class="install-btn" disabled={pushBusy} on:click={enablePush}>
            {pushBusy ? '…' : 'Activer les rappels (navigateur)'}
          </button>
        {/if}
      </Card>
    {/if}

    {#if standalone}
      <Card style="margin-bottom:12px">
        <div class="micro muted">APPLICATION</div>
        <p class="pwa-ok">Application installée — accès direct depuis ton écran d’accueil.</p>
      </Card>
    {:else}
      <Card style="margin-bottom:12px">
        <div class="micro muted">INSTALLER L’APP</div>
        <p class="pwa-lead">
          {#if isBraveBrowser}
            Sous <strong>Brave</strong>, l’invite d’installation peut être absente tant que les
            <strong>Shields</strong> (icône lion) sont actifs pour ce site. Passe-les en
            <strong>réduit</strong> ou <strong>désactivés</strong> pour ce domaine, recharge la page, puis menu
            <strong>(⋮)</strong> → <strong>Installer l’application</strong> (ou équivalent).
          {:else}
            Le navigateur peut proposer l’installation dans la barre d’adresse ou le menu <strong>(⋮)</strong>.
          {/if}
        </p>
        <button type="button" class="install-btn" on:click={openInstallHelp}>
          📲 Voir comment installer
        </button>
        <p class="pwa-sub muted">Guide selon ton appareil (iPhone, Android, ordinateur).</p>
      </Card>
    {/if}

    <button class="logout" on:click={clearAuth}>Se déconnecter</button>
  {:else}
    <div class="loading">Chargement…</div>
  {/if}
</div>

{#if showManualInstall}
  <div class="install-overlay" role="presentation" on:click={closeManualInstall}></div>
  <div class="install-modal" role="dialog" aria-labelledby="install-manual-title" aria-modal="true">
    <h2 id="install-manual-title" class="install-modal-title">Installer Confiance+</h2>
    {#if isIosLike()}
      <ol class="install-steps">
        <li>Touche le bouton <strong>Partager</strong> en bas de Safari.</li>
        <li>Fais défiler et choisis <strong>Sur l’écran d’accueil</strong>.</li>
        <li>Valide avec <strong>Ajouter</strong>.</li>
      </ol>
    {:else if isAndroid()}
      <ol class="install-steps">
        <li>Ouvre le menu du navigateur <strong>(⋮)</strong> en haut à droite.</li>
        <li>Choisis <strong>Installer l’application</strong>, <strong>Ajouter à l’écran d’accueil</strong> ou <strong>Ajouter la page d’accueil</strong> (libellé selon Chrome / Brave).</li>
        <li>Valide l’installation.</li>
      </ol>
    {:else if isBraveBrowser}
      <ol class="install-steps">
        <li>
          Clique sur l’icône <strong>lion</strong> (Shields) à droite de la barre d’adresse et passe les protections en
          <strong>réduit</strong> ou <strong>désactivé</strong> pour ce site (confiance au domaine).
        </li>
        <li><strong>Recharge</strong> la page (F5).</li>
        <li>Menu <strong>(⋮)</strong> → cherche <strong>Installer l’application</strong>, <strong>Installer Confiance+</strong> ou <strong>Créer un raccourci…</strong></li>
      </ol>
      <p class="install-note muted">
        Brave privilégie la confidentialité : sans assouplir les Shields, le service worker / l’invite PWA peuvent rester invisibles alors que Firefox se comporte différemment.
      </p>
    {:else}
      <ol class="install-steps">
        <li>Ouvre le menu du navigateur <strong>(⋮)</strong> ou <strong>(⋯)</strong>.</li>
        <li>Cherche <strong>Installer Confiance+</strong>, <strong>Installer l’application</strong> ou <strong>Créer un raccourci…</strong></li>
        <li>L’entrée peut s’appeler « Application » ou « Raccourci » selon le navigateur.</li>
      </ol>
    {/if}
    {#if !isBraveBrowser || isIosLike() || isAndroid()}
      <p class="install-note muted">
        Certains navigateurs ne montrent pas l’invite automatique : l’installation reste souvent possible depuis le menu <strong>(⋮)</strong>.
      </p>
    {/if}
    <button type="button" class="install-modal-close" on:click={closeManualInstall}>OK</button>
  </div>
{/if}

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

  .pwa-ok   { margin: 8px 0 0; font-size: 14px; line-height: 1.45; color: var(--text); }
  .pwa-lead { margin: 8px 0 12px; font-size: 14px; line-height: 1.45; color: var(--text); }
  .install-btn {
    width: 100%;
    margin-top: 4px;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid var(--accent)66;
    background: linear-gradient(135deg, var(--accent)33, var(--cyan)22);
    color: var(--text);
    font-size: 14px;
    font-weight: 700;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.5px;
    cursor: pointer;
  }
  .install-btn:hover {
    border-color: var(--accent);
    box-shadow: 0 0 16px var(--accent)44;
  }
  .pwa-sub {
    margin: 12px 0 0;
    font-size: 12px;
    line-height: 1.45;
  }

  .install-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(4px);
  }
  .install-modal {
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 1001;
    width: min(92vw, 400px);
    max-height: min(85vh, 520px);
    overflow: auto;
    padding: 20px;
    border-radius: 18px;
    background: var(--surface-modal);
    border: 1px solid var(--border);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }
  .install-modal-title {
    margin: 0 0 14px;
    font-size: 18px;
    font-weight: 800;
    font-family: 'Rajdhani', sans-serif;
    color: var(--text);
  }
  .install-steps {
    margin: 0 0 12px;
    padding-left: 20px;
    font-size: 14px;
    line-height: 1.55;
    color: var(--text);
  }
  .install-steps li {
    margin-bottom: 8px;
  }
  .install-note {
    font-size: 12px;
    line-height: 1.45;
    margin: 0 0 16px;
  }
  .install-modal-close {
    width: 100%;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid var(--accent)44;
    background: var(--surface-modal);
    color: var(--text);
    font-size: 14px;
    font-weight: 700;
    font-family: 'Rajdhani', sans-serif;
    cursor: pointer;
  }
  .install-modal-close:hover {
    border-color: var(--accent);
  }
</style>
