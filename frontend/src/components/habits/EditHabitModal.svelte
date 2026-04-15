<script>
  import { createEventDispatcher } from 'svelte'
  import { habitsApi } from '../../api/habits.js'
  import Card from '../ui/Card.svelte'

  /** @type {{ id: string, name: string, icon: string }} */
  export let habit

  const dispatch = createEventDispatcher()

  let icon = ''
  let name = ''
  let saving = false
  let error = ''

  const isValidEmoji = (str) => {
    if (!str || str.trim().length === 0) return false
    return /\p{Emoji}/u.test(str.trim())
  }

  $: if (habit) {
    icon = habit.icon ?? ''
    name = habit.name ?? ''
  }

  $: validIcon = isValidEmoji(icon)
  $: validName = name.trim().length > 0 && name.length <= 60
  $: canSubmit = validIcon && validName && !saving

  const suggestedEmojis = ['🏃', '💧', '📖', '🎨', '🧘', '🍎', '💤', '🎯', '💪', '🌱']

  const handleSubmit = async () => {
    if (!canSubmit || !habit?.id) return
    saving = true
    error = ''
    try {
      await habitsApi.update(habit.id, { name: name.trim(), icon: icon.trim() })
      dispatch('saved')
    } catch (e) {
      error = e.message || 'Erreur lors de la modification'
    } finally {
      saving = false
    }
  }

  const handleKeydown = (e) => {
    if (e.key === 'Enter' && canSubmit) handleSubmit()
  }
</script>

<div class="overlay" on:click={() => dispatch('close')} role="presentation"></div>
<div class="modal">
  <Card style="max-width: 400px; width: 90%; position: relative">
    <button type="button" class="close-btn" on:click={() => dispatch('close')}>✕</button>

    <div class="header">
      <div class="title">✏️ Modifier l’habitude</div>
    </div>

    <form on:submit|preventDefault={handleSubmit}>
      <div class="field">
        <label for="edit-icon">Icône (emoji)</label>
        <input
          id="edit-icon"
          type="text"
          bind:value={icon}
          placeholder="🏃"
          maxlength="8"
          class:error={icon.length > 0 && !validIcon}
          on:keydown={handleKeydown}
        />
        {#if icon.length > 0 && !validIcon}
          <div class="field-error">Emoji invalide</div>
        {/if}
        <div class="emoji-suggestions">
          {#each suggestedEmojis as em}
            <button type="button" class="emoji-btn" on:click={() => (icon = em)}>{em}</button>
          {/each}
        </div>
      </div>

      <div class="field">
        <label for="edit-name">Nom</label>
        <input
          id="edit-name"
          type="text"
          bind:value={name}
          maxlength="60"
          class:error={name.length > 60}
          on:keydown={handleKeydown}
        />
        <div class="char-count">{name.length}/60</div>
      </div>

      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      <div class="actions">
        <button type="button" class="cancel-btn" disabled={saving} on:click={() => dispatch('close')}>Annuler</button>
        <button type="submit" class="submit-btn" disabled={!canSubmit}>
          {saving ? '…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  </Card>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: var(--overlay);
    z-index: 1000;
    backdrop-filter: blur(4px);
  }
  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1001;
  }
  .close-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    background: transparent;
    border: none;
    color: var(--muted);
    font-size: 20px;
    cursor: pointer;
    width: 32px;
    height: 32px;
    border-radius: 8px;
  }
  .close-btn:hover {
    background: var(--border);
    color: var(--text);
  }
  .header {
    margin-bottom: 18px;
  }
  .title {
    font-size: 18px;
    font-weight: 900;
    color: var(--accent);
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 1px;
  }
  .field {
    margin-bottom: 14px;
  }
  label {
    display: block;
    font-size: 11px;
    color: var(--text-label);
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 1px;
    margin-bottom: 6px;
    text-transform: uppercase;
  }
  input {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text);
    font-size: 16px;
    padding: 10px 12px;
    font-family: 'Exo 2', sans-serif;
  }
  input:focus {
    outline: none;
    border-color: var(--accent);
  }
  input.error {
    border-color: var(--red);
  }
  .field-error {
    font-size: 11px;
    color: var(--red-light);
    margin-top: 4px;
  }
  .char-count {
    font-size: 10px;
    color: var(--muted);
    text-align: right;
    margin-top: 4px;
  }
  .emoji-suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }
  .emoji-btn {
    width: 36px;
    height: 36px;
    background: var(--border);
    border: 1px solid var(--border-btn);
    border-radius: 8px;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .emoji-btn:hover {
    background: var(--accent);
    border-color: var(--accent);
  }
  .error-message {
    background: var(--red)22;
    border: 1px solid var(--red);
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 12px;
    color: var(--red-light);
    margin-bottom: 12px;
  }
  .actions {
    display: flex;
    gap: 10px;
    margin-top: 18px;
  }
  .cancel-btn,
  .submit-btn {
    flex: 1;
    padding: 11px 20px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 700;
    font-family: 'Rajdhani', sans-serif;
    cursor: pointer;
  }
  .cancel-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
  }
  .submit-btn {
    background: var(--grad-cta);
    border: none;
    color: #fff;
  }
  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
