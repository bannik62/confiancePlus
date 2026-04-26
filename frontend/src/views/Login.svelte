<script>
  import { onMount } from 'svelte'
  import { authApi } from '../api/auth.js'
  import { setAuth } from '../stores/auth.js'
  import { rememberPostLoginActiveGroup } from '../stores/group.js'
  import { tab as navTab } from '../stores/tab.js'
  import { UserLogin, LOGIN_MODE } from '../models/UserLogin.js'
  import { UserRegister, REGISTER_CONTEXT } from '../models/UserRegister.js'
  import { UserActivate }        from '../models/UserActivate.js'
  import { UserCompleteProfile } from '../models/UserCompleteProfile.js'

  // ── Onglet actif : 'login' | 'register' | 'code' ──────────────────────────
  let tab = 'login'

  // ── Modèles ────────────────────────────────────────────────────────────────
  let loginModel    = new UserLogin()
  let registerModel = new UserRegister()
  let activateModel = new UserActivate()
  let profileModel  = new UserCompleteProfile()

  // ── States UI ──────────────────────────────────────────────────────────────
  let error    = ''
  let loading  = false
  /** Inscription libre `POST /auth/register` (flux « Code asso » reste actif si fermé). */
  let registerOpen = true

  // Étape du flux code association : 'enter-code' | 'set-password'
  let codeStep     = 'enter-code'
  let pendingUser  = null   // réponse /check-code (username, avatar, emailHint, ok)

  /** Affichage clair du mot de passe (toggle œil) */
  let showLoginPw = false
  let showRegisterPw = false
  let showActivatePw = false
  let showActivatePwConfirm = false

  // Contexte d'inscription : 'solo' | 'create' | 'join'
  let registerContext = REGISTER_CONTEXT.SOLO

  /** Raccourcis avatar — même idée que le picker d’habitudes */
  const AVATAR_SUGGESTIONS = [
    '🦊', '🦁', '🐺', '🐱', '🐻', '🐼', '🦄', '🐸', '🦉', '🐧',
    '🐯', '🐰', '🦝', '🐨', '🐮', '👤', '😎', '🤖', '👽', '🎮',
  ]

  const pickRegisterAvatar = (emoji) => {
    registerModel.avatar = emoji
    registerModel = registerModel
  }

  const pickProfileAvatar = (emoji) => {
    profileModel.avatar = emoji
    profileModel = profileModel
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  onMount(() => {
    try {
      const raw = sessionStorage.getItem('authNotice')
      if (!raw) return
      sessionStorage.removeItem('authNotice')
      const o = JSON.parse(raw)
      if (o?.type === 'suspended' && typeof o.message === 'string' && o.message.length)
        error = o.message
    } catch {
      /* ignore */
    }
  })

  const refreshRegisterStatus = async () => {
    try {
      const r = await authApi.getRegisterStatus()
      registerOpen = r?.registerOpen !== false
    } catch {
      registerOpen = true
    }
  }

  const switchTab = async (t) => {
    tab = t
    error = ''
    codeStep = 'enter-code'
    pendingUser = null
    activateModel = new UserActivate()
    profileModel = new UserCompleteProfile()
    showLoginPw = false
    showRegisterPw = false
    showActivatePw = false
    showActivatePwConfirm = false
    if (t === 'register') await refreshRegisterStatus()
  }

  const finishAuth = (user) => {
    navTab.set('home')
    setAuth({ user })
  }

  // ── Handlers Login ─────────────────────────────────────────────────────────
  const handleLogin = async () => {
    loginModel = loginModel   // force la réactivité Svelte
    if (!loginModel.validate()) return

    loading = true
    error   = ''
    try {
      const res = await authApi.login(loginModel.toPayload())
      if (res.matchedGroupId) rememberPostLoginActiveGroup(res.matchedGroupId)
      finishAuth(res.user)
    } catch (e) {
      error = e.message ?? 'Erreur de connexion'
    } finally {
      loading = false
    }
  }

  // ── Handlers Register ──────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!registerOpen) return
    registerModel = registerModel
    if (!registerModel.validate()) return

    loading = true
    error   = ''
    try {
      const { user } = await authApi.register(registerModel.toPayload())
      finishAuth(user)
    } catch (e) {
      error = e.message ?? 'Erreur lors de l\'inscription'
    } finally {
      loading = false
    }
  }

  // ── Handlers Code Association (étape 1) ────────────────────────────────────
  const handleCheckCode = async () => {
    activateModel = activateModel
    if (!activateModel.validate()) return

    loading = true
    error   = ''
    try {
      pendingUser = await authApi.checkCode(activateModel.toPayload())
      profileModel.prefillActivateStep(
        activateModel.code,
        pendingUser.username,
        pendingUser.avatar,
      )
      profileModel = profileModel
      codeStep = 'set-password'
    } catch (e) {
      error = e.message ?? 'Code invalide'
    } finally {
      loading = false
    }
  }

  // ── Handlers Code Association (étape 2) ────────────────────────────────────
  const handleActivate = async () => {
    profileModel = profileModel
    if (!profileModel.validate()) return

    loading = true
    error   = ''
    try {
      const { user } = await authApi.activate(profileModel.toPayload())
      finishAuth(user)
    } catch (e) {
      error = e.message ?? 'Erreur lors de l\'activation'
    } finally {
      loading = false
    }
  }
</script>

<div class="login-page">
  <div class="card">

    <div class="brand">
      <span class="logo">★</span>
      <h1>Habi<span class="plus">Tracks</span></h1>
    </div>

    <!-- ── Onglets ─────────────────────────────────────────────────────── -->
    <div class="tabs">
      <button class:active={tab === 'login'}    on:click={() => void switchTab('login')}>Connexion</button>
      <button class:active={tab === 'register'} on:click={() => void switchTab('register')}>S'inscrire</button>
      <button class:active={tab === 'code'}     on:click={() => void switchTab('code')}>Code asso</button>
    </div>

    {#if error}
      <p class="error">{error}</p>
    {/if}

    <!-- ════════════════════════════════════════════════════════════════════ -->
    <!-- Onglet LOGIN -->
    <!-- ════════════════════════════════════════════════════════════════════ -->
    {#if tab === 'login'}
      <form on:submit|preventDefault={handleLogin}>
        <fieldset class="context-picker">
          <legend>Je me connecte pour…</legend>
          <label class="radio">
            <input
              type="radio"
              name="loginMode"
              value={LOGIN_MODE.SOLO}
              checked={loginModel.loginMode === LOGIN_MODE.SOLO}
              on:change={() => {
                loginModel.loginMode = LOGIN_MODE.SOLO
                loginModel = loginModel
              }}
            />
            Mon suivi perso (habitudes & check-in)
          </label>
          <label class="radio">
            <input
              type="radio"
              name="loginMode"
              value={LOGIN_MODE.EDUCATOR}
              checked={loginModel.loginMode === LOGIN_MODE.EDUCATOR}
              on:change={() => {
                loginModel.loginMode = LOGIN_MODE.EDUCATOR
                loginModel = loginModel
              }}
            />
            Gérer mon association (éducateur)
          </label>
          <label class="radio">
            <input
              type="radio"
              name="loginMode"
              value={LOGIN_MODE.FRIENDS}
              checked={loginModel.loginMode === LOGIN_MODE.FRIENDS}
              on:change={() => {
                loginModel.loginMode = LOGIN_MODE.FRIENDS
                loginModel = loginModel
              }}
            />
            Accéder à un groupe (code d’invitation)
          </label>
        </fieldset>

        {#if loginModel.loginMode === LOGIN_MODE.FRIENDS}
          <label>
            Code d’invitation du groupe
            <input
              type="text"
              value={loginModel.inviteCode}
              on:input={(ev) => {
                loginModel.inviteCode = ev.currentTarget.value
                loginModel = loginModel
              }}
              placeholder="ex. code copié depuis l’invite"
              autocomplete="off"
            />
            {#if loginModel.errors.inviteCode}<span class="field-error">{loginModel.errors.inviteCode}</span>{/if}
          </label>
        {/if}

        <label>
          Email
          <input
            type="email"
            bind:value={loginModel.email}
            on:input={() => { loginModel.email = loginModel.email; loginModel = loginModel }}
            placeholder="ton@email.fr"
          />
          {#if loginModel.errors.email}<span class="field-error">{loginModel.errors.email}</span>{/if}
        </label>

        <div class="field-col">
          <label for="login-password">Mot de passe</label>
          <div class="password-wrap">
            <input
              id="login-password"
              type={showLoginPw ? 'text' : 'password'}
              value={loginModel.password}
              on:input={(e) => {
                loginModel.password = e.currentTarget.value
                loginModel = loginModel
              }}
              placeholder="••••••••"
              autocomplete="current-password"
            />
            <button
              type="button"
              class="toggle-pw"
              aria-label={showLoginPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              aria-pressed={showLoginPw}
              on:click={() => (showLoginPw = !showLoginPw)}
            >
              {#if showLoginPw}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              {/if}
            </button>
          </div>
          {#if loginModel.errors.password}<span class="field-error">{loginModel.errors.password}</span>{/if}
        </div>

        <button type="submit" class="btn-primary" disabled={loading}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

    <!-- ════════════════════════════════════════════════════════════════════ -->
    <!-- Onglet REGISTER -->
    <!-- ════════════════════════════════════════════════════════════════════ -->
    {:else if tab === 'register'}
      {#if !registerOpen}
        <p class="hint register-closed">
          Les inscriptions libres sont fermées pour l’instant. Utilise l’onglet « Code asso » si tu as reçu un code, ou connecte-toi.
        </p>
      {/if}
      <form on:submit|preventDefault={handleRegister}>
        <fieldset class="register-fields" disabled={!registerOpen}>

        <!-- Contexte -->
        <fieldset class="context-picker">
          <legend>Je veux…</legend>
          <label class="radio">
            <input type="radio" bind:group={registerContext} value={REGISTER_CONTEXT.SOLO}
              on:change={() => { registerModel.context = registerContext; registerModel = registerModel }} />
            M'inscrire seul
          </label>
          <label class="radio">
            <input type="radio" bind:group={registerContext} value={REGISTER_CONTEXT.CREATE}
              on:change={() => { registerModel.context = registerContext; registerModel = registerModel }} />
            Créer un groupe
          </label>
          <label class="radio">
            <input type="radio" bind:group={registerContext} value={REGISTER_CONTEXT.JOIN}
              on:change={() => { registerModel.context = registerContext; registerModel = registerModel }} />
            Rejoindre un groupe
          </label>
        </fieldset>

        <!-- Champs communs -->
        <label>
          Email
          <input type="email" bind:value={registerModel.email}
            on:input={() => { registerModel.email = registerModel.email; registerModel = registerModel }}
            placeholder="ton@email.fr" />
          {#if registerModel.errors.email}<span class="field-error">{registerModel.errors.email}</span>{/if}
        </label>

        <label>
          Pseudo
          <input type="text" bind:value={registerModel.username}
            on:input={() => { registerModel.username = registerModel.username; registerModel = registerModel }}
            placeholder="Lucas_42" />
          {#if registerModel.errors.username}<span class="field-error">{registerModel.errors.username}</span>{/if}
        </label>

        <div class="field-col">
          <label for="register-password">Mot de passe</label>
          <div class="password-wrap">
            <input
              id="register-password"
              type={showRegisterPw ? 'text' : 'password'}
              value={registerModel.password}
              on:input={(e) => {
                registerModel.password = e.currentTarget.value
                registerModel = registerModel
              }}
              placeholder="••••••••"
              autocomplete="new-password"
            />
            <button
              type="button"
              class="toggle-pw"
              aria-label={showRegisterPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              aria-pressed={showRegisterPw}
              on:click={() => (showRegisterPw = !showRegisterPw)}
            >
              {#if showRegisterPw}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              {/if}
            </button>
          </div>
          {#if registerModel.errors.password}<span class="field-error">{registerModel.errors.password}</span>{/if}
        </div>

        <!-- Avatar : grille + saisie libre -->
        <div class="avatar-field">
          <span class="avatar-field-label">Avatar</span>
          <div class="avatar-preview" aria-hidden="true">{registerModel.avatar || '🦊'}</div>
          <div class="emoji-suggestions" role="group" aria-label="Choisir un emoji">
            {#each AVATAR_SUGGESTIONS as emoji}
              <button
                type="button"
                class="emoji-btn"
                class:selected={registerModel.avatar === emoji}
                title={emoji}
                on:click={() => pickRegisterAvatar(emoji)}
              >{emoji}</button>
            {/each}
          </div>
          <label class="avatar-input-label">
            <span class="sr-only">Ou saisir un emoji</span>
            <span class="muted-inline">Ou autre :</span>
            <input
              type="text"
              bind:value={registerModel.avatar}
              on:input={() => { registerModel.avatar = registerModel.avatar; registerModel = registerModel }}
              maxlength="8"
              placeholder="🦊"
              autocomplete="off"
            />
          </label>
          {#if registerModel.errors.avatar}<span class="field-error">{registerModel.errors.avatar}</span>{/if}
        </div>

        <!-- Champs contextuels -->
        {#if registerContext === REGISTER_CONTEXT.CREATE}
          <label>
            Nom du groupe
            <input type="text" bind:value={registerModel.groupName}
              on:input={() => { registerModel.groupName = registerModel.groupName; registerModel = registerModel }}
              placeholder="Mon équipe" />
            {#if registerModel.errors.groupName}<span class="field-error">{registerModel.errors.groupName}</span>{/if}
          </label>
          <label>
            Type de groupe
            <select bind:value={registerModel.groupType}
              on:change={() => { registerModel.groupType = registerModel.groupType; registerModel = registerModel }}>
              <option value="FRIENDS">Amis / Entre pairs</option>
              <option value="ASSOCIATION">Association (avec éducateur)</option>
            </select>
          </label>
        {/if}

        {#if registerContext === REGISTER_CONTEXT.JOIN}
          <label>
            Code d'invitation du groupe
            <input type="text" bind:value={registerModel.inviteCode}
              on:input={() => { registerModel.inviteCode = registerModel.inviteCode; registerModel = registerModel }}
              placeholder="ex : clmzk4abc…" />
            {#if registerModel.errors.inviteCode}<span class="field-error">{registerModel.errors.inviteCode}</span>{/if}
          </label>
        {/if}

        <button type="submit" class="btn-primary" disabled={loading || !registerOpen}>
          {loading ? 'Inscription…' : 'Créer mon compte'}
        </button>
        </fieldset>
      </form>

    <!-- ════════════════════════════════════════════════════════════════════ -->
    <!-- Onglet CODE ASSOCIATION -->
    <!-- ════════════════════════════════════════════════════════════════════ -->
    {:else if tab === 'code'}

      {#if codeStep === 'enter-code'}
        <p class="hint">L'éducateur t'a remis un code à 6 caractères.</p>
        <form on:submit|preventDefault={handleCheckCode}>
          <label>
            Code d'activation
            <input type="text" bind:value={activateModel.code}
              on:input={() => { activateModel.code = activateModel.code; activateModel = activateModel }}
              placeholder="AB12CD" maxlength="6" class="code-input" />
            {#if activateModel.errors.code}<span class="field-error">{activateModel.errors.code}</span>{/if}
          </label>
          <button type="submit" class="btn-primary" disabled={loading}>
            {loading ? 'Vérification…' : 'Vérifier le code'}
          </button>
        </form>

      {:else}
        <!-- Étape 2 : bienvenue + choix du mot de passe -->
        <div class="welcome-banner">
          <span class="avatar-big">{pendingUser?.avatar}</span>
          <p>Bonjour <strong>{pendingUser?.username}</strong> !</p>
          <small>
            {#if pendingUser?.emailHint}
              Saisis l’e-mail utilisé pour ton invitation (indice : <strong>{pendingUser.emailHint}</strong>), puis ton pseudo, avatar et mot de passe.
            {:else}
              Saisis l’e-mail de ton invitation, puis ton pseudo, avatar et mot de passe.
            {/if}
          </small>
        </div>

        <form on:submit|preventDefault={handleActivate}>
          <label>
            E-mail (invitation)
            <input type="email" bind:value={profileModel.email}
              on:input={() => { profileModel.email = profileModel.email; profileModel = profileModel }}
              placeholder="ton@email.fr" autocomplete="email" />
            {#if profileModel.errors.email}<span class="field-error">{profileModel.errors.email}</span>{/if}
          </label>

          <label>
            Pseudo
            <input type="text" bind:value={profileModel.username}
              on:input={() => { profileModel.username = profileModel.username; profileModel = profileModel }}
              placeholder="Lucas_42" />
            {#if profileModel.errors.username}<span class="field-error">{profileModel.errors.username}</span>{/if}
          </label>

          <div class="avatar-field">
            <span class="avatar-field-label">Avatar</span>
            <div class="avatar-preview" aria-hidden="true">{profileModel.avatar || '🦊'}</div>
            <div class="emoji-suggestions" role="group" aria-label="Choisir un emoji">
              {#each AVATAR_SUGGESTIONS as emoji}
                <button
                  type="button"
                  class="emoji-btn"
                  class:selected={profileModel.avatar === emoji}
                  title={emoji}
                  on:click={() => pickProfileAvatar(emoji)}
                >{emoji}</button>
              {/each}
            </div>
            <label class="avatar-input-label">
              <span class="sr-only">Ou saisir un emoji</span>
              <span class="muted-inline">Ou autre :</span>
              <input
                type="text"
                bind:value={profileModel.avatar}
                on:input={() => { profileModel.avatar = profileModel.avatar; profileModel = profileModel }}
                maxlength="8"
                placeholder="🦊"
                autocomplete="off"
              />
            </label>
            {#if profileModel.errors.avatar}<span class="field-error">{profileModel.errors.avatar}</span>{/if}
          </div>

          <div class="field-col">
            <label for="activate-password">Mot de passe</label>
            <div class="password-wrap">
              <input
                id="activate-password"
                type={showActivatePw ? 'text' : 'password'}
                value={profileModel.password}
                on:input={(e) => {
                  profileModel.password = e.currentTarget.value
                  profileModel = profileModel
                }}
                placeholder="••••••••"
                autocomplete="new-password"
              />
              <button
                type="button"
                class="toggle-pw"
                aria-label={showActivatePw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                aria-pressed={showActivatePw}
                on:click={() => (showActivatePw = !showActivatePw)}
              >
                {#if showActivatePw}
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                {:else}
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                {/if}
              </button>
            </div>
            {#if profileModel.errors.password}<span class="field-error">{profileModel.errors.password}</span>{/if}
          </div>
          <div class="field-col">
            <label for="activate-password-confirm">Confirmer</label>
            <div class="password-wrap">
              <input
                id="activate-password-confirm"
                type={showActivatePwConfirm ? 'text' : 'password'}
                value={profileModel.passwordConfirm}
                on:input={(e) => {
                  profileModel.passwordConfirm = e.currentTarget.value
                  profileModel = profileModel
                }}
                placeholder="••••••••"
                autocomplete="new-password"
              />
              <button
                type="button"
                class="toggle-pw"
                aria-label={showActivatePwConfirm ? 'Masquer la confirmation' : 'Afficher la confirmation'}
                aria-pressed={showActivatePwConfirm}
                on:click={() => (showActivatePwConfirm = !showActivatePwConfirm)}
              >
                {#if showActivatePwConfirm}
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                {:else}
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                {/if}
              </button>
            </div>
            {#if profileModel.errors.passwordConfirm}<span class="field-error">{profileModel.errors.passwordConfirm}</span>{/if}
          </div>
          <button type="submit" class="btn-primary" disabled={loading}>
            {loading ? 'Activation…' : 'Activer mon compte'}
          </button>
        </form>
      {/if}

    {/if}
  </div>
</div>

<style>
  .login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: var(--bg);
  }

  .card {
    width: 100%;
    max-width: 420px;
    background: var(--surface-modal);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 32px 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* Brand */
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .logo { font-size: 2rem; color: var(--accent); }
  h1 { font-family: 'Rajdhani', sans-serif; font-size: 1.8rem; color: var(--text); }
  .plus { color: var(--accent); }

  /* Onglets */
  .tabs {
    display: flex;
    gap: 4px;
    background: var(--bg);
    border-radius: 10px;
    padding: 4px;
  }
  .tabs button {
    flex: 1;
    padding: 8px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--muted);
    font-size: max(15px, .85rem);
    cursor: pointer;
    transition: all .2s;
  }
  .tabs button.active {
    background: var(--accent);
    color: #fff;
    font-weight: 600;
  }

  /* Formulaires */
  form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: max(15px, .85rem);
    color: var(--text-label);
  }
  .field-col {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .field-col > label {
    font-size: max(15px, .85rem);
    color: var(--text-label);
  }
  input, select {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 12px;
    color: var(--text);
    font-size: .95rem;
    outline: none;
    transition: border-color .2s;
  }
  input:focus, select:focus { border-color: var(--accent); }

  .password-wrap {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
  }
  .password-wrap input {
    width: 100%;
    padding-right: 44px;
  }
  .toggle-pw {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    transition: color 0.15s, background 0.15s;
  }
  .toggle-pw:hover {
    color: var(--text);
    background: var(--surface);
  }

  .code-input {
    text-transform: uppercase;
    letter-spacing: 4px;
    font-size: 1.4rem;
    text-align: center;
    font-family: 'Rajdhani', sans-serif;
  }

  /* Contexte radio */
  .context-picker {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .context-picker legend { color: var(--muted); font-size: max(15px, .8rem); padding: 0 4px; }
  .radio { flex-direction: row; align-items: center; gap: 8px; color: var(--text); cursor: pointer; }

  /* Bouton */
  .btn-primary {
    padding: 12px;
    background: var(--accent);
    border: none;
    border-radius: 10px;
    color: #fff;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition: background .2s;
    margin-top: 4px;
  }
  .btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
  .btn-primary:disabled { opacity: .5; cursor: not-allowed; }

  /* Erreurs */
  .error       { color: var(--red-light); font-size: max(15px, .85rem); text-align: center; }
  .field-error { color: var(--red-light); font-size: max(15px, .78rem); }

  /* Hint */
  .hint { color: var(--muted); font-size: max(15px, .85rem); text-align: center; }
  .register-closed {
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px 12px;
    background: var(--bg);
    color: var(--text);
  }
  .register-fields:disabled {
    opacity: 0.55;
    pointer-events: none;
  }

  /* Bienvenue asso */
  .welcome-banner {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
  .avatar-big { font-size: 3.5rem; }
  .welcome-banner p { font-size: 1.1rem; color: var(--text); }
  .welcome-banner small { color: var(--muted); font-size: max(15px, .82rem); }

  /* Picker avatar inscription */
  .avatar-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .avatar-field-label {
    font-size: max(15px, 0.85rem);
    color: var(--text-label);
  }
  .avatar-preview {
    font-size: 2.75rem;
    line-height: 1;
    text-align: center;
    padding: 6px 0;
  }
  .emoji-suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
  }
  .emoji-btn {
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    font-size: 1.15rem;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, transform 0.12s;
  }
  .emoji-btn:hover {
    border-color: var(--accent);
    background: var(--surface);
    transform: scale(1.06);
  }
  .emoji-btn.selected {
    border-color: var(--accent);
    background: var(--accent);
    box-shadow: 0 0 12px var(--accent)55;
  }
  .avatar-input-label {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-top: 2px;
  }
  .muted-inline {
    font-size: max(15px, 0.78rem);
    color: var(--muted);
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
