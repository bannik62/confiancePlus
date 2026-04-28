<script>
  import { createEventDispatcher, onMount } from 'svelte'
  import Card from '../ui/Card.svelte'
  
  export let day = null
  
  const dispatch = createEventDispatcher()

  /** Empêche le scroll de la page derrière le modal (sinon le geste fait défiler l’arrière-plan). */
  onMount(() => {
    const y = window.scrollY || document.documentElement.scrollTop || 0
    const body = document.body
    const html = document.documentElement
    body.style.overflow = 'hidden'
    html.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${y}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'

    return () => {
      body.style.overflow = ''
      html.style.overflow = ''
      body.style.position = ''
      body.style.top = ''
      body.style.left = ''
      body.style.right = ''
      body.style.width = ''
      window.scrollTo(0, y)
    }
  })
  
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
  
  // day.xp = serveur (computeDayXP : bonus « toutes cochées » déjà inclus)
  $: totalXp = day?.xp ?? 0
  let imageOpen = false
</script>

{#if day}
  <div
    class="overlay"
    on:click={() => dispatch('close')}
    on:touchmove|preventDefault
  ></div>
  <div class="modal">
    <!-- scroll sur un bloc sans transform (sinon le scroll tactile casse souvent sur iOS / WebKit) -->
    <div class="modal-scroll">
    <div class="modal-inner">
    <Card style="position: relative">
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
          {#if day.memorableImageUrl}
            <button
              type="button"
              class="memorable-thumb-btn"
              aria-label="Agrandir la photo du moment mémorable"
              on:click={() => (imageOpen = true)}
            >
              <img src={day.memorableImageUrl} alt="Moment mémorable du jour" class="memorable-thumb" />
            </button>
          {/if}
          <div class="journal-text">"{day.journal}"</div>
        </div>
      {:else if day.memorableImageUrl}
        <div class="section">
          <div class="section-title">✨ Photo du jour</div>
          <button
            type="button"
            class="memorable-thumb-btn"
            aria-label="Agrandir la photo du jour"
            on:click={() => (imageOpen = true)}
          >
            <img src={day.memorableImageUrl} alt="Souvenir du jour" class="memorable-thumb" />
          </button>
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
    </div>
  </div>

  {#if imageOpen && day.memorableImageUrl}
    <div class="image-overlay" role="presentation" on:click={() => (imageOpen = false)}></div>
    <div class="image-modal" role="dialog" aria-modal="true" aria-label="Photo du jour">
      <button type="button" class="image-close-btn" on:click={() => (imageOpen = false)}>✕</button>
      <img src={day.memorableImageUrl} alt="Aperçu complet du moment mémorable" class="image-full" />
      {#if day.journal}
        <p class="image-caption">"{day.journal}"</p>
      {/if}
    </div>
  {/if}
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
    z-index: 1001;
    left: 50%;
    top: max(12px, env(safe-area-inset-top, 0px));
    transform: translateX(-50%);
    width: min(440px, calc(100vw - 24px));
    max-width: calc(100vw - 24px);
    box-sizing: border-box;
    animation: modalIn 0.22s ease;
    /* Pas d’overflow ici : combiné à transform, ça bloque le scroll sur mobile. */
  }

  .modal-scroll {
    max-height: calc(100dvh - 24px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    touch-action: pan-y;
    padding-bottom: max(8px, env(safe-area-inset-bottom, 0px));
    box-sizing: border-box;
  }

  .modal-inner {
    width: 100%;
    min-width: 0;
  }
  
  @keyframes modalIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
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
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
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
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
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
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
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
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    line-height: 1.5;
    color: var(--text);
    font-style: italic;
    padding: 10px;
    background: var(--bg);
    border-radius: 8px;
    border-left: 3px solid var(--accent);
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .memorable-thumb-btn {
    border: none;
    padding: 0;
    margin: 0 0 10px;
    border-radius: 10px;
    background: transparent;
    cursor: pointer;
    display: inline-flex;
  }

  .memorable-thumb {
    width: min(180px, 70vw);
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border-radius: 10px;
    border: 1px solid var(--border);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  }

  .image-overlay {
    position: fixed;
    inset: 0;
    z-index: 1300;
    background: rgba(0, 0, 0, 0.78);
  }

  .image-modal {
    position: fixed;
    z-index: 1301;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(92vw, 560px);
    max-height: 88dvh;
    overflow: auto;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 10px;
    box-shadow: 0 16px 44px rgba(0, 0, 0, 0.45);
  }

  .image-close-btn {
    position: sticky;
    top: 0;
    margin-left: auto;
    display: block;
    border: 1px solid var(--border-btn);
    background: var(--surface);
    color: var(--muted);
    width: 30px;
    height: 30px;
    border-radius: 8px;
    cursor: pointer;
  }

  .image-full {
    width: 100%;
    max-height: 70dvh;
    object-fit: contain;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.15);
  }

  .image-caption {
    margin: 10px 4px 2px;
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    line-height: 1.4;
    color: var(--text);
    font-style: italic;
    overflow-wrap: anywhere;
  }
  
  .habits-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .habit-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 8px 10px;
    background: var(--bg);
    border-radius: 8px;
    min-width: 0;
  }
  
  .habit-icon {
    font-size: 18px;
    line-height: 1.3;
    flex-shrink: 0;
  }
  
  .habit-name {
    flex: 1;
    min-width: 0;
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    line-height: 1.35;
    color: var(--text);
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  
  .habit-xp {
    flex-shrink: 0;
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    color: var(--gold);
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    white-space: nowrap;
    align-self: center;
    padding-top: 1px;
  }
  
  .no-habits {
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
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
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    font-weight: 700;
    color: var(--text);
    display: block;
  }

  .rdv-not-done-reason {
    margin-top: 6px;
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
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
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
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
