<script>
  import { onMount } from 'svelte'
  import { authApi } from '../api/auth.js'

  let token = ''
  let checkState = 'loading' // 'loading' | 'ok' | 'bad' | 'none'
  let newPassword = ''
  let confirmPassword = ''
  let showPw = false
  let showPw2 = false
  let error = ''
  let loading = false
  let success = false
  const STRONG_PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,100}$/

  onMount(() => {
    const u = new URLSearchParams(window.location.search)
    const t = u.get('t') || u.get('token') || ''
    token = t.trim()
    if (!token) {
      checkState = 'none'
      return
    }
    void (async () => {
      try {
        const r = await authApi.checkResetPasswordToken(token)
        checkState = r?.ok ? 'ok' : 'bad'
      } catch {
        checkState = 'bad'
      }
    })()
  })

  const goLogin = () => {
    window.location.href = '/login'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    error = ''
    if (!STRONG_PASSWORD_RE.test(newPassword)) {
      error = '12 caractères min, avec majuscule, minuscule, chiffre et spécial'
      return
    }
    if (newPassword !== confirmPassword) {
      error = 'Les mots de passe ne correspondent pas'
      return
    }
    loading = true
    try {
      await authApi.resetPasswordWithToken({
        token,
        newPassword,
        confirmNewPassword: confirmPassword,
      })
      success = true
    } catch (err) {
      error = err.message ?? 'Impossible de mettre à jour le mot de passe'
    } finally {
      loading = false
    }
  }
</script>

<div class="reset-page">
  <div class="card">
    <div class="brand">
      <span class="logo">★</span>
      <h1>Habi<span class="plus">Tracks</span></h1>
    </div>

    {#if success}
      <p class="ok-msg">
        Ton mot de passe a été mis à jour. Tu peux te connecter avec le nouveau mot de passe.
      </p>
      <button type="button" class="btn-primary" on:click={goLogin}>Aller à la connexion</button>
    {:else if checkState === 'loading'}
      <p class="muted">Vérification du lien…</p>
    {:else if checkState === 'none'}
      <p class="err-msg">
        Ce lien est incomplet. Utilise le bouton « Mot de passe oublié » sur la page de connexion pour recevoir un
        e-mail avec un lien valide.
      </p>
      <button type="button" class="btn-secondary" on:click={goLogin}>Retour à la connexion</button>
    {:else if checkState === 'bad'}
      <p class="err-msg">
        Ce lien est invalide ou a expiré. Demande un nouveau lien depuis la page de connexion (« Mot de passe oublié
        »).
      </p>
      <button type="button" class="btn-secondary" on:click={goLogin}>Retour à la connexion</button>
    {:else}
      <h2 class="title">Nouveau mot de passe</h2>
      <p class="hint">Choisis un mot de passe fort : 12 caractères min, majuscule, minuscule, chiffre et spécial.</p>

      {#if error}
        <p class="error">{error}</p>
      {/if}

      <form on:submit={handleSubmit}>
        <div class="field-col">
          <label for="npw">Nouveau mot de passe</label>
          <div class="password-wrap">
            <input
              id="npw"
              type={showPw ? 'text' : 'password'}
              value={newPassword}
              on:input={(e) => {
                newPassword = e.currentTarget.value
              }}
              autocomplete="new-password"
              disabled={loading}
              placeholder="••••••••"
            />
            <button
              type="button"
              class="toggle-pw"
              aria-label={showPw ? 'Masquer' : 'Afficher'}
              aria-pressed={showPw}
              on:click={() => (showPw = !showPw)}
            >
              {#if showPw}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              {/if}
            </button>
          </div>
        </div>

        <div class="field-col">
          <label for="npw2">Confirmation</label>
          <div class="password-wrap">
            <input
              id="npw2"
              type={showPw2 ? 'text' : 'password'}
              value={confirmPassword}
              on:input={(e) => {
                confirmPassword = e.currentTarget.value
              }}
              autocomplete="new-password"
              disabled={loading}
              placeholder="••••••••"
            />
            <button
              type="button"
              class="toggle-pw"
              aria-label={showPw2 ? 'Masquer' : 'Afficher'}
              aria-pressed={showPw2}
              on:click={() => (showPw2 = !showPw2)}
            >
              {#if showPw2}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              {/if}
            </button>
          </div>
        </div>

        <button type="submit" class="btn-primary" disabled={loading}>
          {loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
        </button>
      </form>
    {/if}
  </div>
</div>

<style>
  .reset-page {
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
    gap: 18px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .logo {
    font-size: 2rem;
    color: var(--accent);
  }
  h1 {
    font-family: 'Rajdhani', sans-serif;
    font-size: 1.8rem;
    color: var(--text);
  }
  .plus {
    color: var(--accent);
  }
  .title {
    font-family: 'Rajdhani', sans-serif;
    font-size: 1.2rem;
    color: var(--text);
    font-weight: 700;
    margin: 0;
  }
  .hint {
    margin: -6px 0 0;
    font-size: max(15px, 0.88rem);
    color: var(--muted);
    line-height: 1.45;
  }
  .muted {
    color: var(--muted);
    text-align: center;
  }
  .ok-msg {
    margin: 0;
    padding: 12px;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--green) 40%, var(--border));
    background: color-mix(in srgb, var(--green) 10%, var(--surface-modal));
    color: var(--text);
    line-height: 1.45;
  }
  .err-msg {
    margin: 0;
    color: var(--text);
    line-height: 1.45;
  }
  .error {
    margin: 0;
    color: #f87171;
    font-size: max(15px, 0.9rem);
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .field-col {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .field-col label {
    font-size: max(15px, 0.85rem);
    color: var(--text-label);
  }
  input {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 12px;
    color: var(--text);
    font-size: 0.95rem;
    outline: none;
    width: 100%;
    padding-right: 44px;
    box-sizing: border-box;
  }
  input:focus {
    border-color: var(--accent);
  }
  .password-wrap {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
  }
  .toggle-pw {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    border: none;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .toggle-pw:hover {
    color: var(--text);
  }
  .btn-primary {
    margin-top: 4px;
    padding: 12px 18px;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 70%, var(--gold)));
    color: #fff;
    font-weight: 700;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.5px;
    cursor: pointer;
    font-size: max(15px, 0.95rem);
  }
  .btn-primary:disabled {
    opacity: 0.55;
    cursor: wait;
  }
  .btn-secondary {
    padding: 10px 16px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    cursor: pointer;
    font-size: max(15px, 0.9rem);
  }
  .btn-secondary:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
</style>
