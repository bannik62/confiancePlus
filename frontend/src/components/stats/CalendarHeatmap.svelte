<script>
  import { createEventDispatcher } from 'svelte'
  import { localDateString, parseYmdLocal } from '../../lib/dateLocal.js'

  export let days = []
  /** `'activity'` = réussite + XP combinés · `'mood'` = humeur */
  export let colorMode = 'activity'

  const dispatch = createEventDispatcher()

  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

  $: daysByMonth = Array.from({ length: 12 }, (_, m) =>
    days.filter((d) => new Date(d.date).getMonth() === m),
  )

  /** 0–100 : mélange taux du jour et XP (même lecture que deux modes séparés avant). */
  const activityLevel = (day) => {
    const rate = Number(day.habitRate) || 0
    const xp = Number(day.xp) || 0
    const t = Number(day.habitsTotal) || 0
    if (t <= 0) {
      if (xp <= 0) return 0
      if (xp < 40) return 28
      if (xp < 90) return 52
      if (xp < 140) return 78
      return 100
    }
    const xpNorm = Math.min(100, (xp / Math.max(t * 30, 1)) * 100)
    return Math.round(rate * 0.6 + xpNorm * 0.4)
  }

  const colorFromIntensity = (v) => {
    if (v === 0) return 'var(--border)'
    if (v < 40) return 'var(--stats-low)'
    if (v < 70) return 'var(--accent-dark)'
    if (v < 100) return 'var(--accent)'
    return 'var(--gold)'
  }

  /**
   * `mode` passé explicitement pour que le template lie bien la couleur à `colorMode`
   * (évite les fonds « Rythme » qui restent en mode Humeur à cause de la réactivité Svelte).
   */
  const dayCellBackground = (mode, day) => {
    if (mode === 'activity') return colorFromIntensity(activityLevel(day))
    if (mode === 'mood') {
      const m = Number(day.mood)
      if (!Number.isFinite(m) || m < 1) return 'var(--border)'
      if (m <= 3) return 'var(--red)'
      if (m <= 5) return '#d97706'
      if (m <= 7) return 'var(--cyan)'
      return 'var(--green)'
    }
    return 'var(--border)'
  }

  let hoveredDay = null
  let tooltipLeft = 0
  let tooltipTop = 0
  let tooltipTransform = 'translateY(-50%)'

  const TOOLTIP_PAD = 8
  const TOOLTIP_EST_W = 260
  const TOOLTIP_EST_H = 168

  const clip = (s, max = 96) => {
    if (s == null || typeof s !== 'string') return ''
    const t = s.replace(/\s+/g, ' ').trim()
    if (!t) return ''
    if (t.length <= max) return t
    return `${t.slice(0, max - 1)}…`
  }

  const placeTooltipNearCell = (e, day) => {
    hoveredDay = day
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    const pad = TOOLTIP_PAD
    const vw = window.innerWidth
    const vh = window.innerHeight

    let left = r.right + pad
    if (left + TOOLTIP_EST_W > vw - 10) left = r.left - TOOLTIP_EST_W - pad
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

  $: todayYmd = localDateString()

  const ymdOfDay = (day) => {
    if (!day?.date) return ''
    const s = String(day.date)
    return s.length >= 10 ? s.slice(0, 10) : ''
  }

  /** 2ᵉ ligne pour la case « aujourd’hui » uniquement. */
  const fmtCellTodayDate = (ymd) => {
    const d = parseYmdLocal(ymd)
    if (!d) return ''
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })
  }
</script>

<div class="heatmap-wrapper" class:heat-mood={colorMode === 'mood'} class:heat-activity={colorMode === 'activity'}>
  <div class="mode-switch">
    <button
      type="button"
      class="mode-btn"
      class:active={colorMode === 'activity'}
      on:click={() => dispatch('modechange', 'activity')}
    >
      Rythme (réussite + XP)
    </button>
    <button
      type="button"
      class="mode-btn"
      class:active={colorMode === 'mood'}
      on:click={() => dispatch('modechange', 'mood')}
    >
      Humeur
    </button>
  </div>

  <div class="heatmap-grid">
    {#each daysByMonth as monthDays, i}
      <div class="month-col">
        <div class="month-label">{months[i]}</div>
        <div class="days-col">
          {#each monthDays as day, idx}
            {@const ymd = ymdOfDay(day)}
            {@const isToday = ymd && ymd === todayYmd}
            <button
              type="button"
              class="day-cell"
              class:day-today={isToday}
              style="background: {dayCellBackground(colorMode, day)}; animation-delay: {idx * 2}ms"
              aria-label={isToday ? `Aujourd’hui — ${fmtCellTodayDate(ymd)}` : undefined}
              on:mouseenter={(e) => placeTooltipNearCell(e, day)}
              on:mousemove={(e) => hoveredDay === day && placeTooltipNearCell(e, day)}
              on:mouseleave={clearTooltip}
              on:click={() => dispatch('dayclick', day)}
            >
              {#if isToday}
                <span class="cell-today-stack">
                  <span class="cell-today-num">{parseYmdLocal(ymd)?.getDate() ?? ''}</span>
                  <span class="cell-today-date">{fmtCellTodayDate(ymd)}</span>
                </span>
              {:else}
                <span class="cell-day-num">{parseYmdLocal(ymd)?.getDate() ?? ''}</span>
              {/if}
            </button>
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
      <div class="tooltip-date">
        {new Date(hoveredDay.date).toLocaleDateString('fr-FR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })}
      </div>
      <div class="tooltip-stats">
        <span class="tooltip-line"
          ><span class="lbl">Réussite</span> {hoveredDay.habitRate}% · {hoveredDay.habitsDone}/{hoveredDay.habitsTotal}</span
        >
        <span class="tooltip-line"><span class="lbl">XP jour</span> +{hoveredDay.xp}</span>
        {#if hoveredDay.mood != null && hoveredDay.mood !== '' && Number(hoveredDay.mood) >= 1}
          <span class="tooltip-line"><span class="lbl">Humeur</span> {Number(hoveredDay.mood)}/10</span>
        {/if}
        {#if hoveredDay.moodReason}
          <div class="tooltip-quote">
            <span class="lbl">Phrase / moment</span>
            <span class="quote">« {clip(hoveredDay.moodReason, 100)} »</span>
          </div>
        {/if}
        {#if hoveredDay.journal}
          <div class="tooltip-quote">
            <span class="lbl">Journal</span>
            <span class="quote">{clip(hoveredDay.journal, 100)}</span>
          </div>
        {/if}
        {#if hoveredDay.rdvNotDone && hoveredDay.rdvNotDone.length > 0}
          <div class="tooltip-rdv">
            <span class="lbl">RDV non faits</span>
            {#each hoveredDay.rdvNotDone as r}
              <div class="tooltip-rdv-line">
                <span class="rdv-t">{clip(r.title, 72)}</span>
                {#if r.reason && String(r.reason).trim()}
                  <span class="rdv-q">« {clip(String(r.reason).trim(), 80)} »</span>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <div class="legend">
    <span class="legend-label">Moins</span>
    <div class="legend-boxes">
      {#if colorMode === 'activity'}
        <div class="legend-box" style="background: var(--border)"></div>
        <div class="legend-box" style="background: var(--stats-low)"></div>
        <div class="legend-box" style="background: var(--accent-dark)"></div>
        <div class="legend-box" style="background: var(--accent)"></div>
        <div class="legend-box" style="background: var(--gold)"></div>
      {:else}
        <div class="legend-box leg-empty" title="Pas d'humeur"></div>
        <div class="legend-box" style="background: var(--red)" title="1–3"></div>
        <div class="legend-box" style="background: #d97706" title="4–5"></div>
        <div class="legend-box" style="background: var(--cyan)" title="6–7"></div>
        <div class="legend-box" style="background: var(--green)" title="8–10"></div>
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
    min-height: clamp(12px, 2.8vw, 18px);
    height: auto;
    flex-shrink: 0;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
    padding: clamp(2px, 0.45vw, 5px) clamp(3px, 0.5vw, 6px);
    opacity: 0;
    animation: fadeIn 0.3s ease forwards;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    box-sizing: border-box;
  }

  .cell-day-num {
    font-size: clamp(7px, 1.85vw, 11px);
    font-weight: 800;
    font-family: 'Rajdhani', sans-serif;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    line-height: 1;
    pointer-events: none;
    user-select: none;
  }

  /* Jour civil actuel : deux lignes (jour + date) + halo. */
  .day-cell.day-today {
    z-index: 2;
    min-height: clamp(26px, 6.5vw, 40px);
    padding: clamp(3px, 0.5vw, 6px) clamp(2px, 0.4vw, 5px);
    flex-direction: column;
    gap: 1px;
    box-shadow:
      0 0 6px color-mix(in srgb, var(--cyan) 85%, transparent),
      0 0 14px color-mix(in srgb, var(--cyan) 40%, transparent),
      0 0 22px color-mix(in srgb, var(--accent) 28%, transparent),
      inset 0 0 0 1px color-mix(in srgb, #fff 22%, transparent);
  }

  .cell-today-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0;
    line-height: 1.05;
    text-align: center;
    max-width: 100%;
    pointer-events: none;
  }

  .cell-today-num {
    font-size: clamp(8px, 2.1vw, 12px);
    font-weight: 800;
    font-family: 'Rajdhani', sans-serif;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
  }

  .cell-today-date {
    font-size: clamp(5px, 1.35vw, 8px);
    font-weight: 700;
    font-family: 'Rajdhani', sans-serif;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  @keyframes fadeIn {
    to {
      opacity: 1;
    }
  }

  .heat-activity .day-cell:hover {
    transform: scaleY(1.35) scaleX(1.02);
    filter: brightness(1.12);
    box-shadow: 0 0 8px var(--accent)66;
    z-index: 1;
  }

  .heat-mood .day-cell:hover {
    transform: scaleY(1.35) scaleX(1.02);
    filter: brightness(1.15) saturate(1.08);
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.22);
    z-index: 1;
  }

  .heat-activity .day-cell.day-today:hover {
    box-shadow:
      0 0 8px var(--accent)66,
      0 0 12px color-mix(in srgb, var(--cyan) 55%, transparent),
      0 0 20px color-mix(in srgb, var(--cyan) 32%, transparent),
      inset 0 0 0 1px color-mix(in srgb, #fff 25%, transparent);
  }

  .heat-mood .day-cell.day-today:hover {
    box-shadow:
      0 0 10px rgba(255, 255, 255, 0.28),
      0 0 16px color-mix(in srgb, var(--cyan) 40%, transparent),
      inset 0 0 0 1px color-mix(in srgb, #fff 25%, transparent);
  }

  .tooltip {
    position: fixed;
    z-index: 200;
    max-width: min(300px, calc(100vw - 20px));
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
    margin-bottom: 6px;
    font-family: 'Rajdhani', sans-serif;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .tooltip-stats {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .tooltip-line {
    font-size: 12px;
    color: var(--text);
    font-family: 'Rajdhani', sans-serif;
  }

  .lbl {
    font-size: 9px;
    letter-spacing: 0.8px;
    color: var(--muted);
    text-transform: uppercase;
    margin-right: 4px;
  }

  .tooltip-quote {
    margin-top: 2px;
    padding-top: 6px;
    border-top: 1px solid var(--border);
  }

  .tooltip-quote .lbl {
    display: block;
    margin-bottom: 3px;
  }

  .quote {
    font-size: 11px;
    line-height: 1.35;
    color: var(--text);
    font-style: italic;
    display: block;
    word-break: break-word;
  }

  .tooltip-rdv {
    margin-top: 2px;
    padding-top: 6px;
    border-top: 1px solid var(--border);
  }

  .tooltip-rdv .lbl {
    display: block;
    margin-bottom: 4px;
  }

  .tooltip-rdv-line {
    font-size: 11px;
    line-height: 1.35;
    margin-bottom: 6px;
    word-break: break-word;
  }

  .tooltip-rdv-line:last-child {
    margin-bottom: 0;
  }

  .rdv-t {
    display: block;
    color: var(--text);
    font-weight: 700;
  }

  .rdv-q {
    display: block;
    margin-top: 2px;
    color: var(--muted);
    font-style: italic;
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

  .legend-box.leg-empty {
    background: var(--border);
    box-sizing: border-box;
    border: 1px solid var(--border-btn);
  }
</style>
