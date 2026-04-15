<script>
  import { createEventDispatcher } from 'svelte'
  import { habitsApi } from '../../api/habits.js'
  import Card from '../ui/Card.svelte'
  
  const dispatch = createEventDispatcher()
  
  let icon = ''
  let name = ''
  let saving = false
  let error = ''
  
  // Validation emoji simple (Unicode property escape)
  const isValidEmoji = (str) => {
    if (!str || str.trim().length === 0) return false
    // Regex emoji Unicode (support large)
    return /\p{Emoji}/u.test(str.trim())
  }
  
  $: validIcon = isValidEmoji(icon)
  $: validName = name.trim().length > 0 && name.length <= 60
  $: canSubmit = validIcon && validName && !saving
  
  const handleSubmit = async () => {
    if (!canSubmit) return
    
    saving = true
    error = ''
    
    try {
      console.log('🔵 Création habitude:', { name: name.trim(), icon: icon.trim() })
      // Ne pas envoyer xp, le backend force 10
      const result = await habitsApi.create({ 
        name: name.trim(), 
        icon: icon.trim()
      })
      console.log('✅ Habitude créée:', result)
      dispatch('created')
    } catch (e) {
      console.error('❌ Erreur création habitude:', e)
      error = e.message || 'Erreur lors de la création'
    } finally {
      saving = false
    }
  }
  
  const handleKeydown = (e) => {
    if (e.key === 'Enter' && canSubmit) {
      handleSubmit()
    }
  }
  
  // Emojis suggérés (raccourcis)
  const suggestedEmojis = ['🏃', '💧', '📖', '🎨', '🧘', '🍎', '💤', '🎯', '💪', '🌱']
  
  const selectEmoji = (emoji) => {
    icon = emoji
  }
</script>

<div class="overlay" on:click={() => dispatch('close')}></div>
<div class="modal">
  <Card style="max-width: 400px; width: 90%; position: relative">
    <button class="close-btn" on:click={() => dispatch('close')}>✕</button>
    
    <div class="header">
      <div class="title">✨ Nouvelle habitude</div>
    </div>
    
    <form on:submit|preventDefault={handleSubmit}>
      <!-- Icône emoji -->
      <div class="field">
        <label for="icon">Icône (emoji)</label>
        <input
          id="icon"
          type="text"
          bind:value={icon}
          placeholder="🏃"
          maxlength="4"
          class:error={icon.length > 0 && !validIcon}
          on:keydown={handleKeydown}
        />
        {#if icon.length > 0 && !validIcon}
          <div class="field-error">Veuillez saisir un emoji valide 😊</div>
        {/if}
        
        <!-- Suggestions -->
        <div class="emoji-suggestions">
          {#each suggestedEmojis as emoji}
            <button
              type="button"
              class="emoji-btn"
              on:click={() => selectEmoji(emoji)}
            >{emoji}</button>
          {/each}
        </div>
      </div>
      
      <!-- Nom -->
      <div class="field">
        <label for="name">Nom de l'habitude</label>
        <input
          id="name"
          type="text"
          bind:value={name}
          placeholder="Sport du matin"
          maxlength="60"
          class:error={name.length > 60}
          on:keydown={handleKeydown}
        />
        <div class="char-count">{name.length}/60</div>
      </div>
      
      <!-- Info XP -->
      <div class="xp-info">
        🏆 Cette habitude rapportera <strong>+10 XP</strong> par jour
      </div>
      
      <!-- Erreur globale -->
      {#if error}
        <div class="error-message">{error}</div>
      {/if}
      
      <!-- Actions -->
      <div class="actions">
        <button
          type="button"
          class="cancel-btn"
          on:click={() => dispatch('close')}
          disabled={saving}
        >Annuler</button>
        <button
          type="submit"
          class="submit-btn"
          disabled={!canSubmit}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  </Card>
</div>

<style>
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
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
    animation: slideIn 0.25s ease;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translate(-50%, -40%);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%);
    }
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
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    transition: all 0.15s;
  }
  
  .close-btn:hover {
    background: var(--border);
    color: var(--text);
  }
  
  .header {
    margin-bottom: 20px;
  }
  
  .title {
    font-size: 18px;
    font-weight: 900;
    color: var(--accent);
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 1px;
  }
  
  .field {
    margin-bottom: 16px;
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
    transition: all 0.15s;
  }
  
  input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent)22;
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
    gap: 6px;
    flex-wrap: wrap;
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
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  
  .emoji-btn:hover {
    background: var(--accent);
    border-color: var(--accent);
    transform: scale(1.1);
  }
  
  .xp-info {
    background: var(--bg);
    border-left: 3px solid var(--gold);
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 12px;
    color: var(--text);
    margin-bottom: 16px;
  }
  
  .xp-info strong {
    color: var(--gold);
    font-weight: 900;
  }
  
  .error-message {
    background: var(--red)22;
    border: 1px solid var(--red);
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 12px;
    color: var(--red-light);
    margin-bottom: 16px;
  }
  
  .actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
  }
  
  .cancel-btn, .submit-btn {
    flex: 1;
    padding: 11px 20px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 700;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 1px;
    cursor: pointer;
    transition: all 0.15s;
  }
  
  .cancel-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
  }
  
  .cancel-btn:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--text);
  }
  
  .submit-btn {
    background: var(--grad-cta);
    border: none;
    color: #fff;
    box-shadow: 0 0 20px var(--accent)55;
  }
  
  .submit-btn:disabled {
    background: var(--border);
    color: var(--muted);
    box-shadow: none;
    cursor: not-allowed;
  }
  
  .cancel-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
