<script>
  import { createEventDispatcher } from 'svelte'
  import { educatorApi } from '../../api/educator.js'
  import { localDateString, weekdayLetterMonFirst } from '../../lib/dateLocal.js'
  import {
    globalTaskRateBarBg,
    globalTaskRateFillBg,
    globalTaskRateLabelColor,
  } from '../../lib/statRateColors.js'
  import Card from '../ui/Card.svelte'
  import CalendarHeatmap from '../stats/CalendarHeatmap.svelte'
  import DaySnapshot from '../stats/DaySnapshot.svelte'
  import InsightsCard from '../stats/InsightsCard.svelte'

  /** @type {string} */
  export let groupId = ''
  /** @type {{ id: string, username: string } | null} */
  export let member = null

  const dispatch = createEventDispatcher()
  const currentYear = new Date().getFullYear()

  let loading = true
  let err = ''
  /** @type {any} */
  let data = null
  let heatmapColorMode = 'activity'
  /** @type {any} */
  let selectedDay = null
  let showDayModal = false
  let loadSeq = 0

  const load = async () => {
    if (!groupId || !member?.id) return
    const seq = ++loadSeq
    loading = true
    err = ''
    try {
      const res = await educatorApi.memberOverview(groupId, member.id, {
        year: currentYear,
        clientToday: localDateString(),
      })
      if (seq === loadSeq) data = res
    } catch (e) {
      if (seq === loadSeq) {
        err = e.message || 'Erreur de chargement'
        data = null
      }
    } finally {
      if (seq === loadSeq) loading = false
    }
  }

  $: if (groupId && member?.id) void load()

  const close = () => dispatch('close')

  const handleDayClick = (event) => {
    const day = event.detail
    if (
      day.habitsDone > 0 ||
      day.mood ||
      day.sleepQuality ||
      day.journal ||
      (day.moodReason && String(day.moodReason).trim())
    ) {
      selectedDay = day
      showDayModal = true
    }
  }

  const closeDayModal = () => {
    showDayModal = false
    selectedDay = null
  }

  const handleModeChange = (event) => {
    heatmapColorMode = event.detail
  }
</script>

{#if member}
  <div class="overlay" role="presentation" on:click={close}></div>
  <div class="modal-root" role="dialog" aria-modal="true" aria-labelledby="edu-follow-title">
    <Card style="max-width:520px;width:min(520px,94vw);max-height:min(88vh,720px);overflow:auto;position:relative">
      <button type="button" class="close-btn" on:click={close} aria-label="Fermer">✕</button>

      <h2 id="edu-follow-title" class="title">Suivi — {member.username}</h2>

      {#if loading}
        <div class="loading">Chargement…</div>
      {:else if err}
        <p class="error">{err}</p>
      {:else if data}
        {#if data.sensitiveMasked}
          <p class="banner">
            Ce compte n’a <strong>pas autorisé</strong> le partage de l’humeur, de la phrase mémorable ni du journal
            avec le responsable du groupe. Tu vois toutefois les <strong>habitudes</strong>, le
            <strong>sommeil</strong> et les <strong>statistiques agrégées</strong>.
          </p>
        {:else}
          <p class="banner ok">L’élève a accepté le partage des données sensibles du check-in avec le responsable.</p>
        {/if}

        <div class="micro muted" style="margin:10px 0 6px">HABITUDES — {data.habitsDate}</div>
        <div class="habit-list">
          {#each data.habits || [] as h (h.id)}
            <div class="habit-row-ro">
              <span class="ico">{h.icon}</span>
              <div class="habit-meta">
                <div class="habit-name" class:done={!!h.logs?.length}>{h.name}</div>
                <div class="habit-xp" class:done={!!h.logs?.length}>+{h.xp} XP</div>
              </div>
              <div class="check" class:checked={!!h.logs?.length}>{h.logs?.length ? '✓' : ''}</div>
            </div>
          {/each}
        </div>

        <Card glow style="margin-top:14px;margin-bottom:10px">
          <div class="micro purple">TAUX DE RÉUSSITE — 7 JOURS</div>
          <div class="bars">
            {#each data.stats?.byDay || [] as d}
              <div class="bar-col">
                <div class="rate" style="color: {globalTaskRateLabelColor(d.rate)}">{d.rate}%</div>
                <div
                  class="bar"
                  style="height:{d.rate}%; background: {globalTaskRateBarBg(d.rate)}"
                />
                <div class="day" class:today={d.date === localDateString()}>{weekdayLetterMonFirst(d.date)}</div>
              </div>
            {/each}
          </div>
        </Card>

        <Card style="margin-bottom:10px">
          <div class="micro purple">PAR HABITUDE (7 JOURS)</div>
          {#each data.stats?.byHabit || [] as h}
            <div class="habit-stat-row">
              <div class="habit-stat-meta">
                <span>{h.icon} {h.name}</span>
                <span class="pct" style="color: {globalTaskRateLabelColor(h.rate)}">{h.rate}%</span>
              </div>
              <div class="track">
                <div
                  class="fill"
                  style="width:{h.rate}%; background: {globalTaskRateFillBg(h.rate)}"
                />
              </div>
            </div>
          {/each}
        </Card>

        <InsightsCard insights={data.insights} />

        <div style="margin-top:12px">
          <Card>
            <div class="micro purple" style="margin-bottom:10px">CALENDRIER {currentYear}</div>
            {#if data.calendar?.days}
              <CalendarHeatmap
                days={data.calendar.days}
                colorMode={heatmapColorMode}
                on:dayclick={handleDayClick}
                on:modechange={handleModeChange}
              />
            {:else}
              <div class="muted">Aucune donnée calendrier.</div>
            {/if}
          </Card>
        </div>
      {/if}
    </Card>
  </div>
{/if}

{#if showDayModal && selectedDay}
  <DaySnapshot day={selectedDay} on:close={closeDayModal} />
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    z-index: 80;
  }
  .modal-root {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    pointer-events: none;
  }
  .modal-root :global(.card) {
    pointer-events: auto;
  }
  .close-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    border: none;
    background: transparent;
    color: var(--muted);
    font-size: 18px;
    cursor: pointer;
    line-height: 1;
    padding: 4px 8px;
    border-radius: 8px;
  }
  .close-btn:hover {
    color: var(--text);
    background: var(--border);
  }
  .title {
    margin: 0 28px 12px 0;
    font-size: 1.1rem;
    font-weight: 800;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.5px;
  }
  .loading,
  .error {
    font-size: 0.95rem;
    margin: 8px 0;
  }
  .error {
    color: var(--red);
  }
  .banner {
    font-size: 0.82rem;
    line-height: 1.45;
    padding: 10px 12px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--gold) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--gold) 35%, transparent);
    margin-bottom: 12px;
  }
  .banner.ok {
    background: color-mix(in srgb, var(--cyan) 10%, transparent);
    border-color: color-mix(in srgb, var(--cyan) 35%, transparent);
  }
  .micro {
    font-size: 10px;
    color: var(--muted);
    letter-spacing: 2px;
    font-family: 'Rajdhani', sans-serif;
  }
  .muted {
    color: var(--muted);
  }
  .purple {
    color: var(--accent-light);
    margin-bottom: 8px;
  }
  .habit-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .habit-row-ro {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
  }
  .ico {
    font-size: 20px;
  }
  .habit-meta {
    flex: 1;
    min-width: 0;
  }
  .habit-name {
    font-weight: 700;
    font-size: 14px;
    color: var(--muted);
  }
  .habit-name.done {
    color: var(--accent-light);
  }
  .habit-xp {
    font-size: 10px;
    color: var(--text-dim);
    font-family: 'Rajdhani', sans-serif;
  }
  .habit-xp.done {
    color: var(--gold);
  }
  .check {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: var(--border);
    border: 2px solid var(--accent-dark);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 900;
    color: #fff;
    flex-shrink: 0;
  }
  .check.checked {
    background: var(--grad-cta);
    border: none;
  }
  .bars {
    display: flex;
    gap: 6px;
    justify-content: space-between;
    align-items: flex-end;
    height: 120px;
    margin-top: 8px;
  }
  .bar-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }
  .rate {
    font-size: 10px;
    font-weight: 800;
    color: var(--muted);
    font-family: 'Rajdhani', sans-serif;
  }
  .bar {
    width: 100%;
    max-width: 22px;
    min-height: 4px;
    border-radius: 4px 4px 0 0;
    align-self: center;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.35),
      0 0 14px rgba(251, 191, 36, 0.18);
  }
  .day {
    font-size: 9px;
    color: var(--muted);
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
  }
  .day.today {
    color: var(--gold);
  }
  .habit-stat-row {
    margin-top: 8px;
  }
  .habit-stat-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    margin-bottom: 4px;
  }
  .pct {
    font-weight: 800;
    font-family: 'Rajdhani', sans-serif;
    font-size: 12px;
  }
  .track {
    height: 6px;
    background: var(--border);
    border-radius: 4px;
    overflow: hidden;
  }
  .fill {
    height: 100%;
    border-radius: 4px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
</style>
