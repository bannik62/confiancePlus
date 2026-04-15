<script>
  import { authApi } from '../api/auth.js'
  import { setAuth } from '../stores/auth.js'
  import { tab as navTab } from '../stores/tab.js'
  import { UserLogin }           from '../models/UserLogin.js'
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

  // Étape du flux code association : 'enter-code' | 'set-password'
  let codeStep     = 'enter-code'
  let pendingUser  = null   // réponse /check-code (username, avatar, emailHint, ok)

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
  const switchTab = (t) => {
    tab = t
    error = ''
    codeStep = 'enter-code'
    pendingUser = null
    activateModel = new UserActivate()
    profileModel = new UserCompleteProfile()
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
      const { user } = await authApi.login(loginModel.toPayload())
      finishAuth(user)
    } catch (e) {
      error = e.message ?? 'Erreur de connexion'
    } finally {
      loading = false
    }
  }

  // ── Handlers Register ──────────────────────────────────────────────────────
  const handleRegister = async () => {
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
      <h1>Confiance<span class="plus">+</span></h1>
    </div>

    <!-- ── Onglets ─────────────────────────────────────────────────────── -->
    <div class="tabs">
      <button class:active={tab === 'login'}    on:click={() => switchTab('login')}>Connexion</button>
      <button class:active={tab === 'register'} on:click={() => switchTab('register')}>S'inscrire</button>
      <button class:active={tab === 'code'}     on:click={() => switchTab('code')}>Code asso</button>
    </div>

    {#if error}
      <p class="error">{error}</p>
    {/if}

    <!-- ════════════════════════════════════════════════════════════════════ -->
    <!-- Onglet LOGIN -->
    <!-- ════════════════════════════════════════════════════════════════════ -->
    {#if tab === 'login'}
      <form on:submit|preventDefault={handleLogin}>
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

        <label>
          Mot de passe
          <input
            type="password"
            bind:value={loginModel.password}
            on:input={() => { loginModel.password = loginModel.password; loginModel = loginModel }}
            placeholder="••••••••"
          />
          {#if loginModel.errors.password}<span class="field-error">{loginModel.errors.password}</span>{/if}
        </label>

        <button type="submit" class="btn-primary" disabled={loading}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

    <!-- ════════════════════════════════════════════════════════════════════ -->
    <!-- Onglet REGISTER -->
    <!-- ════════════════════════════════════════════════════════════════════ -->
    {:else if tab === 'register'}
      <form on:submit|preventDefault={handleRegister}>

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

        <label>
          Mot de passe
          <input type="password" bind:value={registerModel.password}
            on:input={() => { registerModel.password = registerModel.password; registerModel = registerModel }}
            placeholder="••••••••" />
          {#if registerModel.errors.password}<span class="field-error">{registerModel.errors.password}</span>{/if}
        </label>

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

        <button type="submit" class="btn-primary" disabled={loading}>
          {loading ? 'Inscription…' : 'Créer mon compte'}
        </button>
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

          <label>
            Mot de passe
            <input type="password" bind:value={profileModel.password}
              on:input={() => { profileModel.password = profileModel.password; profileModel = profileModel }}
              placeholder="••••••••" autocomplete="new-password" />
            {#if profileModel.errors.password}<span class="field-error">{profileModel.errors.password}</span>{/if}
          </label>
          <label>
            Confirmer
            <input type="password" bind:value={profileModel.passwordConfirm}
              on:input={() => { profileModel.passwordConfirm = profileModel.passwordConfirm; profileModel = profileModel }}
              placeholder="••••••••" autocomplete="new-password" />
            {#if profileModel.errors.passwordConfirm}<span class="field-error">{profileModel.errors.passwordConfirm}</span>{/if}
          </label>
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
    font-size: .85rem;
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
    font-size: .85rem;
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
  .context-picker legend { color: var(--muted); font-size: .8rem; padding: 0 4px; }
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
  .error       { color: var(--red-light); font-size: .85rem; text-align: center; }
  .field-error { color: var(--red-light); font-size: .78rem; }

  /* Hint */
  .hint { color: var(--muted); font-size: .85rem; text-align: center; }

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
  .welcome-banner small { color: var(--muted); font-size: .82rem; }

  /* Picker avatar inscription */
  .avatar-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .avatar-field-label {
    font-size: 0.85rem;
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
    font-size: 0.78rem;
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
