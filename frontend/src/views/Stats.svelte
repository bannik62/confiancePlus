<script>
  import { onMount, tick } from 'svelte'
  import { get } from 'svelte/store'
  import { authStore } from '../stores/auth.js'
  import { isEducatorAssociation } from '../stores/group.js'
  import { statsApi } from '../api/stats.js'
  import { localDateString, weekdayLetterMonFirst } from '../lib/dateLocal.js'
  import {
    globalTaskRateBarBg,
    globalTaskRateFillBg,
    globalTaskRateLabelColor,
  } from '../lib/statRateColors.js'
  import { readPrefersReducedMotion } from '../lib/animateNumber.js'
  import { animMs } from '../lib/gameplayUiDefaults.js'
  import { gameplayStore } from '../stores/gameplay.js'
  import Card from '../components/ui/Card.svelte'
  import Tag from '../components/ui/Tag.svelte'
  import CountUpInline from '../components/ui/CountUpInline.svelte'
  import CalendarHeatmap from '../components/stats/CalendarHeatmap.svelte'
  import DaySnapshot from '../components/stats/DaySnapshot.svelte'
  import InsightsCard from '../components/stats/InsightsCard.svelte'

  let byDay = [], byHabit = []
  let calendarData = null
  let loadingCalendar = true
  let selectedDay = null
  let showModal = false
  let insights = null
  let heatmapColorMode = 'activity'

  /** Réponse GET /stats/educator-overview */
  let educatorOverview = null
  let loadingEducator = true

  const currentYear = new Date().getFullYear()

  const medal = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`)
  const isMe = (id) => id === get(authStore).user?.id

  /** Barres 7 jours / habitudes : hauteur / largeur après 1 frame (effet « croissance ») */
  let chartsRevealed = false
  let chartsRevealScheduled = false

  $: if (byDay.length > 0 && !chartsRevealScheduled) {
    chartsRevealScheduled = true
    void revealStatCharts()
  }

  async function revealStatCharts() {
    await tick()
    if (readPrefersReducedMotion()) {
      chartsRevealed = true
      return
    }
    await new Promise((r) => requestAnimationFrame(r))
    chartsRevealed = true
  }

  onMount(async () => {
    if (get(isEducatorAssociation)) {
      try {
        educatorOverview = await statsApi.getEducatorOverview()
      } catch (e) {
        console.error('Erreur chargement stats éducateur:', e)
      } finally {
        loadingEducator = false
        loadingCalendar = false
      }
      return
    }

    loadingEducator = false
    const data = await statsApi.getMyStats()
    byDay = data.byDay
    byHabit = data.byHabit

    try {
      calendarData = await statsApi.getCalendar(currentYear)
    } catch (e) {
      console.error('Erreur chargement calendrier:', e)
    } finally {
      loadingCalendar = false
    }

    try {
      insights = await statsApi.getInsights(30)
    } catch (e) {
      console.error('Erreur chargement insights:', e)
    }
  })

  const handleDayClick = (event) => {
    const day = event.detail
    if (
      day.habitsDone > 0 ||
      day.mood ||
      day.sleepQuality ||
      day.journal ||
      (day.moodReason && String(day.moodReason).trim()) ||
      (Array.isArray(day.rdvNotDone) && day.rdvNotDone.length > 0)
    ) {
      selectedDay = day
      showModal = true
    }
  }

  const closeModal = () => {
    showModal = false
    selectedDay = null
  }

  const handleModeChange = (event) => {
    heatmapColorMode = event.detail
  }
</script>

<div class="view">
  {#if loadingEducator}
    <div class="loading">Chargement…</div>
  {:else if educatorOverview}
    <Card glow style="margin-bottom:12px">
      <div class="micro purple">STATS GROUPE — ASSOCIATION</div>
      <div class="edu-title">{educatorOverview.group.name}</div>
      <p class="hint">
        <span class="hint-num"
          ><CountUpInline
            value={educatorOverview.memberCount}
            duration={animMs($gameplayStore, 'statsCountUp')}
          /></span
        >
        membre{educatorOverview.memberCount > 1 ? 's' : ''} · XP et série des participants (sans l’éducateur).
      </p>
    </Card>

    <Card>
      <div class="micro purple">CLASSEMENT MEMBRES</div>
      <div class="board">
        {#each educatorOverview.leaderboard as m, i}
          <div class="row-member" class:top={i === 0} class:me={isMe(m.id)}>
            <span class="medal">{medal(i)}</span>
            <span class="ava">{m.avatar}</span>
            <div class="info">
              <div class="uname">
                {m.username}
                {#if isMe(m.id)}<span class="you-badge">toi</span>{/if}
              </div>
              <div class="tags-row">
                <Tag color="var(--gold)">
                  LVL <span class="tag-num-wrap"
                    ><CountUpInline
                      value={m.level}
                      duration={animMs($gameplayStore, 'statsLeaderboardTag')}
                    /></span
                  >
                </Tag>
                {#if m.title}<Tag color="var(--cyan)">{m.title.icon}</Tag>{/if}
                {#if m.streak > 0}
                  <Tag color="var(--red)">
                    🔥 <span class="tag-num-wrap"
                      ><CountUpInline
                        value={m.streak}
                        duration={animMs($gameplayStore, 'statsLeaderboardTag')}
                      /></span
                    >
                  </Tag>
                {/if}
              </div>
            </div>
            <div class="xp-col">
              <div class="xp-val">
                <CountUpInline
                  value={m.totalXP}
                  duration={animMs($gameplayStore, 'statsLeaderboardXp')}
                />
              </div>
              <div class="micro muted">XP</div>
            </div>
          </div>
        {/each}
      </div>
    </Card>
  {:else}
    <div
      class="stats-learner"
      style="--stat-bar-ms:{animMs($gameplayStore, 'statsBarsCss')}ms"
    >
    <Card glow style="margin-bottom:12px">
      <div class="micro purple">📊 TAUX DE RÉUSSITE — 7 JOURS</div>
      <div class="bars">
        {#each byDay as d}
          <div class="bar-col">
            <div class="rate" style="color: {globalTaskRateLabelColor(d.rate)}">
              <span class="rate-num"
                ><CountUpInline
                  value={Math.round(Number(d.rate) || 0)}
                  duration={animMs($gameplayStore, 'statsCountUp')}
                /></span
              >%
            </div>
            <div
              class="bar"
              style="height:{chartsRevealed ? d.rate : 0}%; background: {globalTaskRateBarBg(d.rate)}"
            />
            <div class="day" class:today={d.date === localDateString()}>{weekdayLetterMonFirst(d.date)}</div>
          </div>
        {/each}
      </div>
    </Card>

    <Card>
      <div class="micro purple">🏆 PAR HABITUDE (7 jours)</div>
      {#each byHabit as h}
        <div class="habit-row">
          <div class="habit-meta">
            <span>{h.icon} {h.name}</span>
            <span class="pct" style="color: {globalTaskRateLabelColor(h.rate)}">
              <span class="pct-num"
                ><CountUpInline
                  value={Math.round(Number(h.rate) || 0)}
                  duration={animMs($gameplayStore, 'statsCountUp')}
                /></span
              >%
            </span>
          </div>
          <div class="track">
            <div
              class="fill"
              style="width:{chartsRevealed ? h.rate : 0}%; background: {globalTaskRateFillBg(h.rate)}"
            />
          </div>
        </div>
      {/each}
    </Card>

    <InsightsCard {insights} />

    <div style="margin-top:16px">
      <Card>
        <div class="micro purple" style="margin-bottom:12px">📅 CALENDRIER {currentYear}</div>
        {#if loadingCalendar}
          <div class="loading">Chargement...</div>
        {:else if calendarData}
          <CalendarHeatmap
            days={calendarData.days}
            colorMode={heatmapColorMode}
            on:dayclick={handleDayClick}
            on:modechange={handleModeChange}
          />
        {:else}
          <div class="error">Erreur chargement calendrier</div>
        {/if}
      </Card>
    </div>
    </div>
  {/if}
</div>

{#if showModal && selectedDay}
  <DaySnapshot day={selectedDay} on:close={closeModal} />
{/if}

<style>
  .view {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
  .micro {
    font-size: 10px;
    letter-spacing: 2px;
    font-family: 'Rajdhani', sans-serif;
    color: var(--muted);
    margin-bottom: 14px;
  }
  .purple {
    color: var(--accent);
  }
  .muted {
    color: var(--muted);
  }
  .hint {
    color: var(--muted);
    font-size: 0.88rem;
    line-height: 1.45;
    margin: 0;
  }
  .edu-title {
    font-size: 1.25rem;
    font-weight: 900;
    font-family: 'Rajdhani', sans-serif;
    margin-bottom: 8px;
  }
  .bars {
    display: flex;
    align-items: flex-end;
    gap: 7px;
    height: 110px;
  }
  .bar-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    height: 100%;
    justify-content: flex-end;
  }
  .rate {
    font-size: 9px;
    color: var(--muted);
  }
  .hint-num,
  .tag-num-wrap,
  .rate-num,
  .pct-num {
    display: inline;
    font-size: inherit;
    font-weight: inherit;
    color: inherit;
    vertical-align: baseline;
  }
  .hint-num :global(.countup-inline) {
    font-weight: 700;
    color: var(--text);
  }
  .rate {
    font-variant-numeric: tabular-nums;
  }
  .pct {
    font-variant-numeric: tabular-nums;
  }
  .stats-learner {
    width: 100%;
    min-width: 0;
  }
  .stats-learner .bar {
    width: 100%;
    border-radius: 5px 5px 2px 2px;
    min-height: 4px;
    transition: height var(--stat-bar-ms, 650ms) cubic-bezier(0.22, 1, 0.36, 1);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.35),
      0 0 14px rgba(251, 191, 36, 0.18);
  }
  .day {
    font-size: 9px;
    color: var(--muted);
    font-family: 'Rajdhani', sans-serif;
  }
  .day.today {
    color: var(--gold);
  }

  .habit-row {
    margin-bottom: 12px;
  }
  .habit-meta {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    margin-bottom: 5px;
  }
  .pct {
    font-weight: 700;
  }
  .track {
    height: 5px;
    background: var(--border);
    border-radius: 3px;
    overflow: hidden;
  }
  .stats-learner .fill {
    height: 100%;
    border-radius: 3px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
    transition: width var(--stat-bar-ms, 650ms) cubic-bezier(0.22, 1, 0.36, 1);
  }

  .loading,
  .error {
    text-align: center;
    padding: 20px;
    color: var(--muted);
    font-size: 13px;
  }
  .error {
    color: var(--red);
  }

  .board {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
  }
  .row-member {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 12px 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    transition: all 0.15s;
  }
  .row-member.top {
    border-color: var(--gold)66;
    box-shadow: 0 0 14px var(--gold)44;
  }
  .row-member.me {
    border-color: var(--accent)99;
    box-shadow: 0 0 10px var(--accent)44;
  }
  /* 1er + toi : garder l’anneau « or », pas le style « moi » qui écrase .top */
  .row-member.top.me {
    border-color: color-mix(in srgb, var(--gold) 70%, #f59e0b 30%);
    box-shadow: 0 0 16px color-mix(in srgb, var(--gold) 50%, transparent);
  }
  .medal {
    font-size: 14px;
    color: var(--muted);
    font-weight: 900;
    width: 24px;
    text-align: center;
  }
  .top .medal {
    color: var(--gold);
  }
  .ava {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: var(--accent)22;
    border: 2px solid var(--accent)44;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
  }
  .info {
    flex: 1;
  }
  .uname {
    font-weight: 900;
    font-size: 15px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .tags-row {
    display: flex;
    gap: 5px;
    margin-top: 4px;
  }
  .you-badge {
    font-size: 10px;
    background: var(--accent);
    color: #fff;
    border-radius: 6px;
    padding: 1px 6px;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 1px;
  }
  .xp-col {
    text-align: right;
  }
  .xp-val {
    font-weight: 900;
    font-size: 16px;
    color: var(--gold);
  }
</style>
