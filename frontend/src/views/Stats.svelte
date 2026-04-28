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
  import { openItemsModal } from '../stores/itemsModal.js'
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

  $: lbStreakTrophyImg = (() => {
    const rw = $gameplayStore?.streak?.rewards
    const h = Array.isArray(rw) && rw[0] ? rw[0].heroImage : null
    return typeof h === 'string' && h.trim() ? h.trim() : '/badges/fireStreackBadge/1000002186.png'
  })()

  const openMemberItems = (m) => {
    openItemsModal({
      title: m.username ? `Objets — ${m.username}` : 'Objets',
      username: m.username,
      avatar: m.avatar,
      cristaux: m.cristaux ?? 0,
      jokerStreak: m.jokerStreak ?? 0,
      streak7TrophyCount: m.streak7TrophyCount ?? 0,
      trophyImageSrc: lbStreakTrophyImg,
    })
  }

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
    /* Deux frames : certains navigateurs (surtout desktop) n’ont pas encore peint
     * la hauteur/largeur à 0 avant la transition — une seule rAF peut sauter l’anim CSS. */
    await new Promise((r) => requestAnimationFrame(r))
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
      day.memorableImageUrl ||
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
    <Card solid glow style="margin-bottom:12px">
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

    <Card solid>
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
                {#if m.title}
                  <span class="lb-title-tag">
                    <Tag color="var(--green)">{m.title.icon} {m.title.label}</Tag>
                  </span>
                {/if}
                <button
                  type="button"
                  class="lb-items"
                  aria-haspopup="dialog"
                  aria-label="Objets de {m.username ?? 'membre'}"
                  on:click|stopPropagation={() => openMemberItems(m)}
                >
                  <span class="lb-items-lbl" aria-hidden="true">Items</span>
                  <span class="lb-items-vals">
                    <span class="lb-cristaux" title="Cristaux">💎 {m.cristaux ?? 0}</span>
                    {#if (m.jokerStreak ?? 0) > 0}
                      <span class="lb-joker" title="Joker(s) de série en stock">🃏 {m.jokerStreak}</span>
                    {/if}
                    {#if (m.streak7TrophyCount ?? 0) > 0}
                      <span class="lb-streak7" title="Trophées série — collection dans la fenêtre Objets">
                        <img src={lbStreakTrophyImg} alt="" class="lb-streak7-img" />
                      </span>
                    {/if}
                  </span>
                </button>
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
    <Card solid glow>
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

    <Card solid>
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

    <div class="stats-cal-wrap">
      <Card solid>
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
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
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
    font-size: max(15px, 0.88rem);
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
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
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
    display: flex;
    flex-direction: column;
    gap: 22px;
  }
  .stats-cal-wrap {
    min-width: 0;
  }
  .stats-learner .bar {
    width: 100%;
    border-radius: 5px 5px 2px 2px;
    min-height: 0;
    transition: height var(--stat-bar-ms, 650ms) cubic-bezier(0.22, 1, 0.36, 1);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.35),
      0 0 14px rgba(251, 191, 36, 0.18);
  }
  .day {
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
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
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
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

  @media (prefers-reduced-motion: reduce) {
    .stats-learner .bar,
    .stats-learner .fill {
      transition-duration: 0ms !important;
    }
  }

  .loading,
  .error {
    text-align: center;
    padding: 20px;
    color: var(--muted);
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
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
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
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
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 4px;
    align-items: center;
  }
  .lb-title-tag {
    max-width: min(100%, 16rem);
    line-height: 1.25;
  }
  .lb-title-tag :global(.tag) {
    display: inline-block;
    max-width: 100%;
    white-space: normal;
    word-break: break-word;
    line-height: 1.25;
  }
  button.lb-items {
    font: inherit;
    color: inherit;
    text-align: inherit;
    cursor: pointer;
  }
  button.lb-items:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .lb-items {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    flex-wrap: wrap;
    max-width: 100%;
    padding: 6px 13px;
    border-radius: 12px;
    box-sizing: border-box;
    background: linear-gradient(
      148deg,
      color-mix(in srgb, var(--accent) 22%, transparent),
      color-mix(in srgb, var(--cyan) 14%, transparent)
    );
    border: 1px solid color-mix(in srgb, var(--cyan) 42%, transparent);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.07),
      0 2px 14px rgba(0, 0, 0, 0.14);
  }
  .lb-items-lbl {
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--text) 58%, transparent);
    font-family: 'Rajdhani', sans-serif;
    font-weight: 800;
    flex-shrink: 0;
    opacity: 0.92;
  }
  .lb-items-vals {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .lb-joker {
    font-size: max(15px, 0.88rem);
    font-weight: 800;
    color: #f0abfc;
    text-shadow:
      0 0 6px rgba(168, 85, 247, 0.75),
      0 0 12px rgba(236, 72, 153, 0.4);
    white-space: nowrap;
    font-family: 'Rajdhani', sans-serif;
  }
  .lb-streak7 {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    white-space: nowrap;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 800;
    font-size: max(15px, 0.86rem);
    color: var(--gold);
  }
  .lb-streak7-img {
    width: 1.55rem;
    height: 1.55rem;
    object-fit: contain;
    display: block;
  }
  .lb-cristaux {
    font-size: max(15px, 0.88rem);
    font-weight: 800;
    color: var(--cyan);
    white-space: nowrap;
    font-family: 'Rajdhani', sans-serif;
  }
  .you-badge {
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
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
