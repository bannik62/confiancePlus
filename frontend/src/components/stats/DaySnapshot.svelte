<script>
  import { createEventDispatcher } from 'svelte'
  import Card from '../ui/Card.svelte'
  
  export let day = null
  
  const dispatch = createEventDispatcher()
  
  const moodN = (m) => {
    const n = Number(m)
    return Number.isFinite(n) ? n : NaN
  }

  // Emoji humeur selon valeur
  const moodEmoji = (m) => {
    const v = moodN(m)
    if (!Number.isFinite(v) || v < 1) return '😐'
    if (v <= 2) return '😔'
    if (v <= 4) return '😕'
    if (v <= 6) return '😐'
    if (v <= 8) return '🙂'
    if (v === 9) return '😄'
    return '🤩'
  }
  
  // Couleur humeur
  const moodColor = (m) => {
    const v = moodN(m)
    if (!Number.isFinite(v) || v < 1 || v <= 3) return 'var(--red)'
    if (v <= 5) return 'var(--gold)'
    if (v <= 7) return 'var(--cyan)'
    return 'var(--green)'
  }
  
  // Formater date
  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }
  
  // day.xp = serveur (computeDayXP : bonus 100 % déjà inclus)
  $: totalXp = day?.xp ?? 0
</script>

{#if day}
  <div class="overlay" on:click={() => dispatch('close')}></div>
  <div class="modal">
    <Card style="max-width: 400px; width: 90%; position: relative">
      <button class="close-btn" on:click={() => dispatch('close')}>✕</button>
      
      <div class="header">
        <div class="date-label">📅 {formatDate(day.date)}</div>
      </div>
      
      <!-- Humeur + phrase check-in (moodReason) -->
      {#if day.mood != null && day.mood !== '' && moodN(day.mood) >= 1}
        <div class="section">
          <div class="section-title">Humeur</div>
          <div class="mood-display">
            <span class="mood-emoji" style="color: {moodColor(day.mood)}">{moodEmoji(day.mood)}</span>
            <span class="mood-value" style="color: {moodColor(day.mood)}">{moodN(day.mood)}/10</span>
          </div>
          {#if day.moodReason}
            <div class="mood-reason">💭 « {day.moodReason} »</div>
          {/if}
        </div>
      {:else if day.moodReason && String(day.moodReason).trim()}
        <div class="section">
          <div class="section-title">Phrase du check-in</div>
          <div class="mood-reason alone">💭 « {day.moodReason} »</div>
        </div>
      {/if}
      
      <!-- Sommeil -->
      {#if day.sleepQuality}
        <div class="section">
          <div class="section-title">Sommeil</div>
          <div class="sleep-display">
            <span class="sleep-icon">🌙</span>
            <span class="sleep-value">{day.sleepQuality}/10</span>
          </div>
        </div>
      {/if}
      
      <!-- Journal -->
      {#if day.journal}
        <div class="section">
          <div class="section-title">✨ Moment mémorable</div>
          <div class="journal-text">"{day.journal}"</div>
        </div>
      {/if}

      {#if day.rdvNotDone && day.rdvNotDone.length > 0}
        <div class="section">
          <div class="section-title">📌 RDV non faits</div>
          <ul class="rdv-not-done-list">
            {#each day.rdvNotDone as r}
              <li class="rdv-not-done-item">
                <span class="rdv-not-done-title">{r.title}</span>
                {#if r.reason && String(r.reason).trim()}
                  <div class="rdv-not-done-reason">« {String(r.reason).trim()} »</div>
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {/if}
      
      <!-- Habitudes -->
      <div class="section">
        <div class="section-title">📊 Habitudes ({day.habitsDone}/{day.habitsTotal} — {day.habitRate}%)</div>
        {#if day.habits.length > 0}
          <div class="habits-list">
            {#each day.habits as h}
              <div class="habit-item">
                <span class="habit-icon">{h.icon}</span>
                <span class="habit-name">{h.name}</span>
                <span class="habit-xp">+{h.xp} XP</span>
              </div>
            {/each}
          </div>
        {:else}
          <div class="no-habits">Aucune habitude cochée ce jour</div>
        {/if}
      </div>
      
      <!-- Total XP -->
      <div class="total-xp">
        <span class="xp-label">🏆 Total XP :</span>
        <span class="xp-value">+{totalXp}</span>
      </div>
    </Card>
  </div>
{/if}

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
  
  .date-label {
    font-size: 14px;
    font-weight: 700;
    color: var(--accent);
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 1px;
    text-transform: capitalize;
  }
  
  .section {
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }
  
  .section:last-of-type {
    border-bottom: none;
  }
  
  .section-title {
    font-size: 11px;
    color: var(--muted);
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }
  
  .mood-display {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .mood-emoji {
    font-size: 32px;
  }
  
  .mood-value {
    font-size: 20px;
    font-weight: 900;
  }
  
  .mood-reason {
    margin-top: 8px;
    font-size: 13px;
    color: var(--text);
    font-style: italic;
  }
  
  .sleep-display {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .sleep-icon {
    font-size: 24px;
  }
  
  .sleep-value {
    font-size: 18px;
    font-weight: 700;
    color: var(--cyan);
  }
  
  .journal-text {
    font-size: 14px;
    line-height: 1.5;
    color: var(--text);
    font-style: italic;
    padding: 10px;
    background: var(--bg);
    border-radius: 8px;
    border-left: 3px solid var(--accent);
  }
  
  .habits-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .habit-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    background: var(--bg);
    border-radius: 8px;
  }
  
  .habit-icon {
    font-size: 18px;
  }
  
  .habit-name {
    flex: 1;
    font-size: 13px;
    color: var(--text);
  }
  
  .habit-xp {
    font-size: 12px;
    color: var(--gold);
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
  }
  
  .no-habits {
    font-size: 13px;
    color: var(--muted);
    text-align: center;
    padding: 12px;
  }

  .rdv-not-done-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .rdv-not-done-item {
    padding: 10px;
    background: var(--bg);
    border-radius: 8px;
    border-left: 3px solid var(--muted);
  }

  .rdv-not-done-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
    display: block;
  }

  .rdv-not-done-reason {
    margin-top: 6px;
    font-size: 12px;
    color: var(--muted);
    font-style: italic;
    line-height: 1.4;
  }
  
  .total-xp {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
  }
  
  .xp-label {
    font-size: 14px;
    color: var(--muted);
    font-family: 'Rajdhani', sans-serif;
  }
  
  .xp-value {
    font-size: 22px;
    font-weight: 900;
    color: var(--gold);
    margin-left: 8px;
  }
</style>
