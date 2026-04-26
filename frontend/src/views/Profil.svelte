<script>
  import { onMount }  from 'svelte'
  import { statsApi } from '../api/stats.js'
  import { authStore, clearAuth, mergeUser } from '../stores/auth.js'
  import { authApi } from '../api/auth.js'
  import { pushApi } from '../api/push.js'
  import { createPushSubscriptionJson } from '../lib/pushSubscribe.js'
  import { isStandalone, isIosLike, isAndroid, detectBrave } from '../lib/pwaUi.js'
  import Card  from '../components/ui/Card.svelte'
  import Tag   from '../components/ui/Tag.svelte'
  import XPBar from '../components/ui/XPBar.svelte'
  import CountUpInline from '../components/ui/CountUpInline.svelte'
  import { gameplayStore } from '../stores/gameplay.js'
  import { animMs } from '../lib/gameplayUiDefaults.js'
  import { autocompleteSignIn, autocompleteSignUp } from '../lib/htmlInputTokens.js'

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

  let emailBusy = false
  let emailErr = ''
  let emailOk = ''
  let emailNew = ''
  let emailConfirm = ''
  let emailCurrentPw = ''

  let pwBusy = false
  let pwErr = ''
  let pwOk = ''
  let pwCurrent = ''
  let pwNew = ''
  let pwConfirm = ''
  /** @type {NotificationPermission | 'unsupported'} */
  let notifPerm = 'default'

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

  const syncNotifPerm = () => {
    if (typeof Notification === 'undefined') notifPerm = 'unsupported'
    else notifPerm = Notification.permission
  }

  onMount(async () => {
    standalone = isStandalone()
    isBraveBrowser = await detectBrave()
    syncNotifPerm()
    profile = await statsApi.getMyProfile()
    await refreshPushState()
  })

  const enablePush = async () => {
    pushErr = ''
    pushOk = ''
    pushBusy = true
    try {
      const { publicKey } = await pushApi.getVapidPublic()

      let perm = Notification.permission
      if (perm === 'denied') {
        pushErr =
          'Les notifications sont bloquées pour ce site. Ouvre les paramètres du navigateur : icône à gauche de l’URL (cadenas ou « i ») → paramètres du site → Notifications → Autoriser, puis recharge la page et réessaie. Si tu avais déjà refusé, le navigateur ne redemande pas : il faut débloquer à la main.'
        syncNotifPerm()
        return
      }
      if (perm === 'default') {
        perm = await Notification.requestPermission()
      }
      syncNotifPerm()
      if (perm !== 'granted') {
        pushErr =
          perm === 'denied'
            ? 'Permission refusée. Débloque les notifications pour ce domaine dans les paramètres du site (voir message ci-dessus après rechargement).'
            : 'Permission de notification non accordée.'
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

  const fieldErr = (errors, key) =>
    errors && errors[key] && errors[key][0] ? errors[key][0] : ''

  const submitEmail = async () => {
    emailErr = ''
    emailOk = ''
    emailBusy = true
    try {
      const user = await authApi.changeEmail({
        email: emailNew.trim(),
        confirmEmail: emailConfirm.trim(),
        currentPassword: emailCurrentPw,
      })
      mergeUser({ email: user.email })
      emailOk = 'Adresse e-mail mise à jour.'
      emailNew = ''
      emailConfirm = ''
      emailCurrentPw = ''
    } catch (e) {
      emailErr =
        fieldErr(e.errors, 'email') ||
        fieldErr(e.errors, 'confirmEmail') ||
        fieldErr(e.errors, 'currentPassword') ||
        e.message ||
        'Erreur'
    } finally {
      emailBusy = false
    }
  }

  const submitPassword = async () => {
    pwErr = ''
    pwOk = ''
    pwBusy = true
    try {
      await authApi.changePassword({
        currentPassword: pwCurrent,
        newPassword: pwNew,
        confirmNewPassword: pwConfirm,
      })
      pwOk = 'Mot de passe mis à jour.'
      pwCurrent = ''
      pwNew = ''
      pwConfirm = ''
    } catch (e) {
      pwErr =
        fieldErr(e.errors, 'newPassword') ||
        fieldErr(e.errors, 'confirmNewPassword') ||
        fieldErr(e.errors, 'currentPassword') ||
        e.message ||
        'Erreur'
    } finally {
      pwBusy = false
    }
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
      <button type="button" class="logout logout--hero" on:click={clearAuth}>Se déconnecter</button>
    </div>

    <Card solid>
      <XPBar current={profile.current} required={profile.required} label="NIVEAU {profile.level} → {profile.level + 1}" />
    </Card>

    <Card solid>
      <div class="micro muted">XP TOTAL</div>
      <div class="total-xp">
        <CountUpInline value={profile.totalXP} duration={animMs($gameplayStore, 'profilTotalXp')} /> XP
      </div>
    </Card>

    <Card solid>
      <div class="micro muted">COMPTE</div>
      <p class="acct-hint">
        E-mail de connexion : <strong>{$authStore.user?.email ?? '—'}</strong>
      </p>

      <div class="acct-block">
        <div class="acct-sub">Changer l’e-mail</div>
        <label class="acct-label" for="profil-email-new">Nouvelle adresse</label>
        <input
          id="profil-email-new"
          class="acct-input"
          type="email"
          autocomplete="email"
          bind:value={emailNew}
          disabled={emailBusy}
        />
        <label class="acct-label" for="profil-email-confirm">Confirmer l’e-mail</label>
        <input
          id="profil-email-confirm"
          class="acct-input"
          type="email"
          autocomplete="email"
          bind:value={emailConfirm}
          disabled={emailBusy}
        />
        <label class="acct-label" for="profil-email-pw">Mot de passe actuel</label>
        <input
          id="profil-email-pw"
          class="acct-input"
          type="password"
          autocomplete={autocompleteSignIn}
          bind:value={emailCurrentPw}
          disabled={emailBusy}
        />
        {#if emailErr}<p class="acct-err">{emailErr}</p>{/if}
        {#if emailOk}<p class="acct-ok">{emailOk}</p>{/if}
        <button type="button" class="acct-btn" disabled={emailBusy} on:click={submitEmail}>
          {emailBusy ? '…' : 'Enregistrer l’e-mail'}
        </button>
      </div>

      <div class="acct-block acct-block--pwd">
        <div class="acct-sub">Changer le mot de passe</div>
        <label class="acct-label" for="profil-pw-current">Mot de passe actuel</label>
        <input
          id="profil-pw-current"
          class="acct-input"
          type="password"
          autocomplete={autocompleteSignIn}
          bind:value={pwCurrent}
          disabled={pwBusy}
        />
        <label class="acct-label" for="profil-pw-new">Nouveau mot de passe</label>
        <input
          id="profil-pw-new"
          class="acct-input"
          type="password"
          autocomplete={autocompleteSignUp}
          bind:value={pwNew}
          disabled={pwBusy}
        />
        <label class="acct-label" for="profil-pw-confirm">Confirmer le nouveau</label>
        <input
          id="profil-pw-confirm"
          class="acct-input"
          type="password"
          autocomplete={autocompleteSignUp}
          bind:value={pwConfirm}
          disabled={pwBusy}
        />
        {#if pwErr}<p class="acct-err">{pwErr}</p>{/if}
        {#if pwOk}<p class="acct-ok">{pwOk}</p>{/if}
        <button type="button" class="acct-btn" disabled={pwBusy} on:click={submitPassword}>
          {pwBusy ? '…' : 'Enregistrer le mot de passe'}
        </button>
      </div>
    </Card>

    {#if typeof Notification !== 'undefined'}
      <Card solid>
        <div class="micro muted">NOTIFICATIONS</div>
        <p class="pwa-lead" style="margin:8px 0">
          Rappel vers l’heure définie par l’équipe (défaut 14 h, fuseau Europe/Paris) si des habitudes du jour ne sont
          pas encore cochées. Sur <strong>iPhone</strong>, le push Web nécessite souvent l’app ajoutée à l’écran d’accueil
          (Safari → Partager → sur l’écran d’accueil).
        </p>
        {#if notifPerm === 'denied'}
          <p class="pwa-lead" style="color:var(--gold);font-size: max(15px, 0.88rem);margin:6px 0">
            État : notifications <strong>bloquées</strong> pour ce site. Utilise les paramètres du navigateur pour les
            autoriser, puis recharge la page.
          </p>
        {/if}
        {#if pushErr}<p class="err" style="color:var(--red);font-size: max(15px, 0.9rem);white-space:pre-wrap">{pushErr}</p>{/if}
        {#if pushOk}<p class="ok" style="color:var(--green);font-size: max(15px, 0.9rem)">{pushOk}</p>{/if}
        {#if pushEnabled}
          <button type="button" class="logout" disabled={pushBusy} on:click={disablePush}>
            {pushBusy ? '…' : 'Désactiver les rappels sur cet appareil'}
          </button>
        {:else}
          <button type="button" class="install-btn" disabled={pushBusy} on:click={enablePush}>
            {pushBusy ? '…' : notifPerm === 'denied' ? 'Voir comment débloquer (cliquer)' : 'Activer les rappels (navigateur)'}
          </button>
        {/if}
      </Card>
    {/if}

    {#if standalone}
      <Card solid>
        <div class="micro muted">APPLICATION</div>
        <p class="pwa-ok">Application installée — accès direct depuis ton écran d’accueil.</p>
      </Card>
    {:else}
      <Card solid>
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
  {:else}
    <div class="loading">Chargement…</div>
  {/if}
</div>

{#if showManualInstall}
  <div class="install-overlay" role="presentation" on:click={closeManualInstall}></div>
  <div class="install-modal" role="dialog" aria-labelledby="install-manual-title" aria-modal="true">
    <h2 id="install-manual-title" class="install-modal-title">Installer HabiTracks</h2>
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
        <li>Menu <strong>(⋮)</strong> → cherche <strong>Installer l’application</strong>, <strong>Installer HabiTracks</strong> ou <strong>Créer un raccourci…</strong></li>
      </ol>
      <p class="install-note muted">
        Brave privilégie la confidentialité : sans assouplir les Shields, le service worker / l’invite PWA peuvent rester invisibles alors que Firefox se comporte différemment.
      </p>
    {:else}
      <ol class="install-steps">
        <li>Ouvre le menu du navigateur <strong>(⋮)</strong> ou <strong>(⋯)</strong>.</li>
        <li>Cherche <strong>Installer HabiTracks</strong>, <strong>Installer l’application</strong> ou <strong>Créer un raccourci…</strong></li>
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
  .view {
    display: flex;
    flex-direction: column;
    gap: 18px;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
  .hero {
    position: relative;
    text-align: center;
    margin-bottom: 0;
    padding: 18px 16px 52px;
    border-radius: 16px;
    border: 1px solid var(--border);
    background: var(--surface);
    background-color: var(--surface);
    background-clip: padding-box;
    isolation: isolate;
    box-sizing: border-box;
  }
  .ava {
    width: 80px;
    height: 80px;
    border-radius: 20px;
    background: linear-gradient(135deg, var(--accent), var(--cyan));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    margin: 0 auto 12px;
    box-shadow: 0 0 20px var(--accent)55;
  }
  .uname  { font-size: 22px; font-weight: 900; font-family: 'Rajdhani', sans-serif; background: linear-gradient(90deg,var(--accent),var(--gold)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .tags   { display: flex; gap: 8px; justify-content: center; margin-top: 8px; flex-wrap: wrap; }
  .micro  { font-size: clamp(15px, 0.72rem + 0.28vw, 17px); letter-spacing: 2px; font-family: 'Rajdhani', sans-serif; margin-bottom: 4px; }
  .muted  { color: var(--muted); }
  .total-xp { font-size: 28px; font-weight: 900; color: var(--gold); }
  .logout {
    width: 100%;
    margin-top: 0;
    background: var(--surface);
    background-color: var(--surface);
    border: 1px solid color-mix(in srgb, var(--red) 50%, var(--border));
    border-radius: 12px;
    color: var(--red);
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    padding: 12px;
    cursor: pointer;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 1px;
    isolation: isolate;
    box-sizing: border-box;
  }
  .logout:hover {
    border-color: color-mix(in srgb, var(--red) 65%, var(--border));
    box-shadow: 0 0 14px color-mix(in srgb, var(--red) 25%, transparent);
  }
  .logout--hero {
    position: absolute;
    right: 10px;
    bottom: 10px;
    width: auto;
    margin-top: 0;
    padding: 8px 12px;
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    letter-spacing: 0.06em;
    white-space: nowrap;
  }
  .loading {
    color: var(--muted);
    text-align: center;
    padding: 28px 16px;
    border-radius: 16px;
    border: 1px solid var(--border);
    background: var(--surface);
    background-color: var(--surface);
    isolation: isolate;
    box-sizing: border-box;
  }

  .pwa-ok   { margin: 8px 0 0; font-size: clamp(15px, 0.72rem + 0.28vw, 17px); line-height: 1.45; color: var(--text); }
  .pwa-lead { margin: 8px 0 12px; font-size: clamp(15px, 0.72rem + 0.28vw, 17px); line-height: 1.45; color: var(--text); }
  .install-btn {
    width: 100%;
    margin-top: 4px;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid var(--accent)66;
    background: linear-gradient(135deg, var(--accent)33, var(--cyan)22);
    color: var(--text);
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
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
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
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
    background-color: var(--surface-modal);
    background-clip: padding-box;
    border: 1px solid var(--border);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    isolation: isolate;
    box-sizing: border-box;
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
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    line-height: 1.55;
    color: var(--text);
  }
  .install-steps li {
    margin-bottom: 8px;
  }
  .install-note {
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
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
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    font-weight: 700;
    font-family: 'Rajdhani', sans-serif;
    cursor: pointer;
  }
  .install-modal-close:hover {
    border-color: var(--accent);
  }

  .acct-hint {
    margin: 8px 0 14px;
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    line-height: 1.45;
    color: var(--text);
  }
  .acct-block {
    padding-top: 12px;
    margin-top: 12px;
    border-top: 1px solid var(--border);
  }
  .acct-block--pwd {
    margin-top: 18px;
  }
  .acct-sub {
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    font-weight: 800;
    font-family: 'Rajdhani', sans-serif;
    color: var(--gold);
    margin-bottom: 10px;
    letter-spacing: 0.5px;
  }
  .acct-label {
    display: block;
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    color: var(--muted);
    margin-bottom: 4px;
    letter-spacing: 0.5px;
  }
  .acct-input {
    width: 100%;
    box-sizing: border-box;
    margin-bottom: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--input-bg);
    background-color: var(--input-bg);
    color: var(--text);
    font-size: 15px;
  }
  .acct-input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent)44;
  }
  .acct-input:disabled {
    opacity: 0.6;
  }
  .acct-btn {
    width: 100%;
    margin-top: 6px;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid var(--accent)66;
    background: linear-gradient(135deg, var(--accent)33, var(--cyan)22);
    color: var(--text);
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    font-weight: 700;
    font-family: 'Rajdhani', sans-serif;
    cursor: pointer;
  }
  .acct-btn:hover:not(:disabled) {
    border-color: var(--accent);
    box-shadow: 0 0 16px var(--accent)44;
  }
  .acct-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .acct-err {
    color: var(--red);
    font-size: max(15px, 0.88rem);
    margin: 0 0 8px;
    white-space: pre-wrap;
  }
  .acct-ok {
    color: var(--green);
    font-size: max(15px, 0.88rem);
    margin: 0 0 8px;
  }
</style>
