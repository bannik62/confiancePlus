<script>
  import { createEventDispatcher } from 'svelte'
  
  export let days = []
  export let colorMode = 'rate' // 'rate' | 'xp' | 'mood'
  
  const dispatch = createEventDispatcher()
  
  // Grouper jours par mois
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
  
  // Organiser en grille : 12 colonnes (mois) × ~31 lignes (jours max par mois)
  const daysByMonth = []
  for (let m = 0; m < 12; m++) {
    const monthDays = days.filter(d => {
      const month = new Date(d.date).getMonth()
      return month === m
    })
    daysByMonth.push(monthDays)
  }
  
  // Couleur selon mode sélectionné
  const colorForDay = (day) => {
    if (colorMode === 'rate') {
      const rate = day.habitRate
      if (rate === 0) return 'var(--border)'
      if (rate < 40) return 'var(--stats-low)'
      if (rate < 70) return 'var(--accent-dark)'
      if (rate < 100) return 'var(--accent)'
      return 'var(--gold)'
    }
    
    if (colorMode === 'xp') {
      const xp = day.xp
      if (xp === 0) return 'var(--border)'
      if (xp < 50) return 'var(--stats-low)'
      if (xp < 100) return 'var(--accent-dark)'
      if (xp < 150) return 'var(--accent)'
      return 'var(--gold)'
    }
    
    if (colorMode === 'mood') {
      const mood = day.mood
      if (!mood) return 'var(--border)'
      if (mood <= 3) return 'var(--red)'
      if (mood <= 5) return '#d97706' // orange
      if (mood <= 7) return 'var(--cyan)'
      return 'var(--green)'
    }
    
    return 'var(--border)'
  }
  
  let hoveredDay = null
  /** Position viewport (fixed) — à côté de la case survolée */
  let tooltipLeft = 0
  let tooltipTop = 0
  let tooltipTransform = 'translateY(-50%)'

  const TOOLTIP_PAD = 8
  const TOOLTIP_EST_W = 230
  const TOOLTIP_EST_H = 110

  const placeTooltipNearCell = (e, day) => {
    hoveredDay = day
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    const pad = TOOLTIP_PAD
    const vw = window.innerWidth
    const vh = window.innerHeight

    let left = r.right + pad
    if (left + TOOLTIP_EST_W > vw - 10) {
      left = r.left - TOOLTIP_EST_W - pad
    }
    left = Math.max(10, Math.min(left, vw - TOOLTIP_EST_W - 10))

    const cy = r.top + r.height / 2
    const half = TOOLTIP_EST_H / 2
    let top = cy
    top = Math.max(half + 8, Math.min(top, vh - half - 8))

    tooltipLeft = left
    tooltipTop = top
    tooltipTransform = 'translateY(-50%)'
  }

  const clearTooltip = () => {
    hoveredDay = null
  }
</script>

<div class="heatmap-wrapper">
  <!-- Switch mode couleur -->
  <div class="mode-switch">
    <button 
      class="mode-btn" 
      class:active={colorMode === 'rate'}
      on:click={() => dispatch('modechange', 'rate')}
    >% Réussite</button>
    <button 
      class="mode-btn" 
      class:active={colorMode === 'xp'}
      on:click={() => dispatch('modechange', 'xp')}
    >XP</button>
    <button 
      class="mode-btn" 
      class:active={colorMode === 'mood'}
      on:click={() => dispatch('modechange', 'mood')}
    >Humeur</button>
  </div>
  
  <div class="heatmap-grid">
    {#each daysByMonth as monthDays, i}
      <div class="month-col">
        <div class="month-label">{months[i]}</div>
        <div class="days-col">
          {#each monthDays as day, idx}
            <button
              type="button"
              class="day-cell"
              style="background: {colorForDay(day)}; animation-delay: {idx * 2}ms"
              on:mouseenter={(e) => placeTooltipNearCell(e, day)}
              on:mousemove={(e) => hoveredDay === day && placeTooltipNearCell(e, day)}
              on:mouseleave={clearTooltip}
              on:click={() => dispatch('dayclick', day)}
            ></button>
          {/each}
        </div>
      </div>
    {/each}
  </div>
  
  {#if hoveredDay}
    <div
      class="tooltip"
      style="left:{tooltipLeft}px;top:{tooltipTop}px;transform:{tooltipTransform}"
    >
      <div class="tooltip-date">{new Date(hoveredDay.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
      <div class="tooltip-stats">
        <span class="tooltip-rate">{hoveredDay.habitRate}%</span>
        <span class="tooltip-habits">{hoveredDay.habitsDone}/{hoveredDay.habitsTotal} habitudes</span>
        <span class="tooltip-xp">+{hoveredDay.xp} XP</span>
        {#if hoveredDay.mood}
          <span class="tooltip-mood">Humeur {hoveredDay.mood}/10</span>
        {/if}
      </div>
    </div>
  {/if}
  
  <div class="legend">
    <span class="legend-label">Moins</span>
    <div class="legend-boxes">
      {#if colorMode === 'rate'}
        <div class="legend-box" style="background: var(--border)"></div>
        <div class="legend-box" style="background: var(--stats-low)"></div>
        <div class="legend-box" style="background: var(--accent-dark)"></div>
        <div class="legend-box" style="background: var(--accent)"></div>
        <div class="legend-box" style="background: var(--gold)"></div>
      {:else if colorMode === 'xp'}
        <div class="legend-box" style="background: var(--border)"></div>
        <div class="legend-box" style="background: var(--stats-low)"></div>
        <div class="legend-box" style="background: var(--accent-dark)"></div>
        <div class="legend-box" style="background: var(--accent)"></div>
        <div class="legend-box" style="background: var(--gold)"></div>
      {:else}
        <div class="legend-box" style="background: var(--border)"></div>
        <div class="legend-box" style="background: var(--red)"></div>
        <div class="legend-box" style="background: #d97706"></div>
        <div class="legend-box" style="background: var(--cyan)"></div>
        <div class="legend-box" style="background: var(--green)"></div>
      {/if}
    </div>
    <span class="legend-label">Plus</span>
  </div>
</div>

<style>
  .heatmap-wrapper {
    position: relative;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 12px clamp(8px, 2vw, 16px);
    background: var(--surface);
    border-radius: 14px;
    border: 1px solid var(--border);
  }
  
  .mode-switch {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
    justify-content: center;
  }
  
  .mode-btn {
    background: var(--border);
    border: 1px solid var(--border-btn);
    border-radius: 8px;
    color: var(--muted);
    font-size: 11px;
    padding: 6px 12px;
    cursor: pointer;
    transition: all 0.15s;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
  
  .mode-btn.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    box-shadow: 0 0 12px var(--accent)55;
  }
  
  .heatmap-grid {
    display: flex;
    width: 100%;
    min-width: 0;
    gap: clamp(2px, 0.35vw, 5px);
    justify-content: stretch;
    align-items: flex-start;
    padding-bottom: 8px;
  }
  
  .month-col {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }
  
  .month-label {
    width: 100%;
    font-size: clamp(8px, 2.2vw, 11px);
    color: var(--muted);
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    text-align: center;
    letter-spacing: 0.02em;
    line-height: 1.1;
  }
  
  .days-col {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    gap: clamp(2px, 0.35vw, 4px);
    flex: 1;
    min-height: 0;
  }
  
  .day-cell {
    width: 100%;
    height: clamp(4px, 1.25vw, 7px);
    min-height: 3px;
    flex-shrink: 0;
    border-radius: 3px;
    border: none;
    cursor: pointer;
    transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
    padding: 0;
    opacity: 0;
    animation: fadeIn 0.3s ease forwards;
  }
  
  @keyframes fadeIn {
    to {
      opacity: 1;
    }
  }
  
  .day-cell:hover {
    transform: scaleY(1.35) scaleX(1.02);
    filter: brightness(1.12);
    box-shadow: 0 0 8px var(--accent)66;
    z-index: 1;
  }
  
  .tooltip {
    position: fixed;
    z-index: 200;
    max-width: min(280px, calc(100vw - 20px));
    background: var(--surface);
    border: 1.5px solid var(--accent);
    border-radius: 10px;
    padding: 10px 14px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45);
    pointer-events: none;
  }
  
  .tooltip-date {
    font-size: 11px;
    color: var(--accent);
    font-weight: 700;
    margin-bottom: 5px;
    font-family: 'Rajdhani', sans-serif;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  .tooltip-stats {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .tooltip-rate {
    font-size: 18px;
    font-weight: 900;
    color: var(--gold);
  }
  
  .tooltip-habits {
    font-size: 11px;
    color: var(--text);
  }
  
  .tooltip-xp {
    font-size: 11px;
    color: var(--cyan);
    font-family: 'Rajdhani', sans-serif;
  }
  
  .tooltip-mood {
    font-size: 11px;
    color: var(--accent-light);
    font-family: 'Rajdhani', sans-serif;
  }
  
  .legend {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 12px;
  }
  
  .legend-label {
    font-size: 9px;
    color: var(--muted);
  }
  
  .legend-boxes {
    display: flex;
    gap: 2px;
  }
  
  .legend-box {
    width: clamp(12px, 3vw, 22px);
    height: clamp(3px, 1vw, 5px);
    border-radius: 2px;
  }
</style>
