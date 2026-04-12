<script>
  import { onMount, tick } from 'svelte'
  import { get } from 'svelte/store'
  import { habits, loadHabits } from '../stores/habits.js'
  import { dailyLog, saveDailyLog, loadToday } from '../stores/checkin.js'
  import { habitsApi } from '../api/habits.js'
  import { localDateString } from '../lib/dateLocal.js'
  import { dayMessageFor, resetDayMessageCache } from '../lib/dayMessage.js'
  import Card from '../components/ui/Card.svelte'
  import Tag  from '../components/ui/Tag.svelte'

  const coerceSleep = (sq) =>
    typeof sq === 'number' && Number.isFinite(sq) ? sq : (Number(sq) || 0)

  const dayLockStorageKey = () => `ht_dayLocked_${localDateString()}`

  let journal = ''
  let sleep = 0
  /** Journée verrouillée après sauvegarde (rechargée depuis sessionStorage par date). */
  let dayBundleLocked = false
  /** Saisie en cours : on ne réinjecte pas le journal depuis l’API tant que tu édites. */
  let journalDirty = false
  /** Coches habitudes : brouillon vs état au début de la session d’édition. */
  let habitDraft = {}
  let habitBaseline = {}
  let saving = false
  /** Détecte le passage minuit (jour civil local) pour rafraîchir coches + daily log. */
  let habitCalendarAnchor = ''

  const pullDraftFromServer = () => {
    const log = get(dailyLog)
    if (!log) return
    journal = log.journal ?? ''
    sleep = coerceSleep(log.sleepQuality)
  }

  onMount(async () => {
    await loadHabits()
    dayBundleLocked = sessionStorage.getItem(dayLockStorageKey()) === '1'
    await tick()
    pullDraftFromServer()
    if (!dayBundleLocked) seedHabitDraft()
  })

  /** Sommeil affiché depuis le serveur tant que la journée est verrouillée. */
  $: if ($dailyLog && dayBundleLocked) sleep = coerceSleep($dailyLog.sleepQuality)

  /** Journal depuis le serveur seulement quand le log change vraiment ET pas de brouillon local. */
  $: logServerKey = $dailyLog ? `${$dailyLog.id}:${$dailyLog.updatedAt}` : ''
  let appliedLogKey = ''
  $: if (logServerKey && logServerKey !== appliedLogKey) {
    appliedLogKey = logServerKey
    if ($dailyLog && !journalDirty) journal = $dailyLog.journal ?? ''
  }

  const onJournalInput = () => {
    journalDirty = true
  }

  const habitChecked = (h) =>
    dayBundleLocked ? !!h.logs?.length : !!habitDraft[h.id]

  const seedHabitDraft = () => {
    const list = get(habits)
    habitDraft = Object.fromEntries(list.map((h) => [h.id, !!h.logs?.length]))
    habitBaseline = { ...habitDraft }
  }

  async function reloadHomeForNewCalendarDay() {
    resetDayMessageCache()
    dayBundleLocked = sessionStorage.getItem(dayLockStorageKey()) === '1'
    try {
      await loadToday()
    } catch {
      /* idem bootstrap */
    }
    await loadHabits()
    await tick()
    pullDraftFromServer()
    if (!dayBundleLocked) seedHabitDraft()
  }

  $: {
    const d = localDateString()
    if (!habitCalendarAnchor) habitCalendarAnchor = d
    else if (d !== habitCalendarAnchor) {
      habitCalendarAnchor = d
      void reloadHomeForNewCalendarDay()
    }
  }

  const toggleHabitDraft = (id) => {
    if (dayBundleLocked) return
    habitDraft = { ...habitDraft, [id]: !habitDraft[id] }
  }

  const selectSleep = (n) => {
    if (dayBundleLocked) return
    sleep = n
  }

  const unlockDay = async () => {
    dayBundleLocked = false
    sessionStorage.removeItem(dayLockStorageKey())
    journalDirty = false
    await loadHabits()
    await tick()
    pullDraftFromServer()
    seedHabitDraft()
  }

  const saveFullDay = async () => {
    saving = true
    try {
      journalDirty = false
      const dayPayload = { journal }
      if (sleep >= 1 && sleep <= 10) dayPayload.sleepQuality = sleep
      const log = await saveDailyLog(dayPayload)
      if (log) {
        journal = log.journal ?? ''
        appliedLogKey = `${log.id}:${log.updatedAt}`
      }
      const list = get(habits)
      const d = localDateString()
      for (const h of list) {
        const want = !!habitDraft[h.id]
        const base = !!habitBaseline[h.id]
        if (want !== base) await habitsApi.toggle(h.id, d)
      }
      await loadHabits()
      dayBundleLocked = true
      sessionStorage.setItem(dayLockStorageKey(), '1')
      habitDraft = {}
      habitBaseline = {}
    } finally {
      saving = false
    }
  }

  $: done       = $habits.filter((h) => habitChecked(h)).length
  $: total      = $habits.length
  $: allDone    = done === total && total > 0
  $: earnedXP   = $habits.filter((h) => habitChecked(h)).reduce((s, h) => s + h.xp, 0) * (allDone ? 1.5 : 1)
  /** Humeur du check-in : 1–3 encouragement, 4–7 maintien, 8–10 félicitation (JSON) */
  $: mood       = $dailyLog?.mood ?? 5
  $: encourage  = dayMessageFor(mood, localDateString())
</script>

<div class="view">
  <!-- Message du jour -->
  <Card style="margin-bottom:13px; border-left: 3px solid var(--cyan)">
    <div class="sup" style="color:var(--cyan)">MESSAGE DU JOUR</div>
    <p class="msg">{encourage || 'Bonne journée — un pas après l’autre.'}</p>
    <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap; align-items:center">
      <Tag color="var(--cyan)">Humeur {mood}/10</Tag>
      {#if $dailyLog?.moodReason}
        <em class="reason">"{$dailyLog.moodReason}"</em>
      {/if}
    </div>
  </Card>

  <!-- Stats mini -->
  <div class="grid2" style="margin-bottom:13px">
    <Card glow>
      <div class="circle-wrap">
        <svg width="72" height="72" style="transform:rotate(-90deg)">
          <circle cx="36" cy="36" r="28" fill="none" stroke="var(--border)" stroke-width="6"/>
          <circle cx="36" cy="36" r="28" fill="none" stroke="url(#gc)" stroke-width="6"
            stroke-dasharray="{done/Math.max(total,1)*175.9} 175.9" stroke-linecap="round"/>
          <defs>
            <linearGradient id="gc" x1="0%" y1="0%" x2="100%">
              <stop offset="0%" stop-color="var(--accent)"/>
              <stop offset="100%" stop-color="var(--gold)"/>
            </linearGradient>
          </defs>
        </svg>
        <div class="circle-label">
          <div class="big-num">{done}/{total}</div>
          <div class="micro">HABITUDES</div>
        </div>
      </div>
    </Card>

    <Card>
      <div class="micro" style="color:var(--gold)">XP AUJOURD'HUI</div>
      <div class="xp-num">+{Math.round(earnedXP)}</div>
      {#if allDone}<Tag color="var(--gold)">×1.5 BONUS ⚡</Tag>{/if}
    </Card>
  </div>

  <!-- Habitudes -->
  <div class="micro muted" style="margin-bottom:8px">HABITUDES DU JOUR</div>
  <div class="habit-list">
    {#each $habits as h (h.id)}
      <!-- Pas de {@const checked} : il ne se met pas à jour quand seul habitDraft change. -->
      <button
        type="button"
        class="habit"
        class:checked={dayBundleLocked ? !!h.logs?.length : !!habitDraft[h.id]}
        disabled={dayBundleLocked}
        on:click={() => toggleHabitDraft(h.id)}
      >
        <div class="habit-left">
          <span class="ico">{h.icon}</span>
          <div>
            <div
              class="habit-name"
              class:done={dayBundleLocked ? !!h.logs?.length : !!habitDraft[h.id]}
            >{h.name}</div>
            <div
              class="habit-xp"
              class:done={dayBundleLocked ? !!h.logs?.length : !!habitDraft[h.id]}
            >+{h.xp} XP</div>
          </div>
        </div>
        <div
          class="check"
          class:checked={dayBundleLocked ? !!h.logs?.length : !!habitDraft[h.id]}
        >{(dayBundleLocked ? !!h.logs?.length : !!habitDraft[h.id]) ? '✓' : ''}</div>
      </button>
    {/each}
  </div>

  <!-- Sommeil -->
  <Card style="margin-bottom:13px; margin-top:13px">
    <div class="micro" style="color:var(--cyan); margin-bottom:10px">🌙 QUALITÉ DE SOMMEIL</div>
    <div class="sleep-grid">
      {#each Array.from({ length: 10 }, (_, i) => i + 1) as n}
        {@const c = n <= 4 ? 'var(--red)' : n <= 7 ? 'var(--gold)' : 'var(--green)'}
        <button
          type="button"
          class="sleep-btn"
          class:sel={n <= sleep}
          style="--c:{c}"
          disabled={dayBundleLocked}
          on:click={() => selectSleep(n)}
        >{n}</button>
      {/each}
    </div>
  </Card>

  <!-- Journal -->
  <Card style="margin-bottom:13px">
    <div class="micro" style="color:var(--accent); margin-bottom:10px">✨ MOMENT MÉMORABLE</div>
    <textarea
      class:locked={dayBundleLocked}
      bind:value={journal}
      readonly={dayBundleLocked}
      on:input={onJournalInput}
      placeholder="Une chose qui t'a marqué aujourd'hui..."
    ></textarea>
  </Card>

  <!-- Une sauvegarde = journal + sommeil + coches habitudes ; puis mode lecture seule jusqu’à Modifier -->
  <div class="day-actions">
    {#if dayBundleLocked}
      <button type="button" class="edit-btn wide" on:click={unlockDay}>MODIFIER</button>
    {:else}
      <button type="button" class="save-btn wide" disabled={saving} on:click={saveFullDay}>
        {saving ? 'ENREGISTREMENT…' : 'SAUVEGARDER LA JOURNÉE ⚡'}
      </button>
    {/if}
  </div>
</div>

<style>
  .view        { display: flex; flex-direction: column; }
  .grid2       { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .sup         { font-size: 10px; letter-spacing: 2px; font-family: 'Rajdhani', sans-serif; margin-bottom: 5px; }
  .micro       { font-size: 10px; color: var(--muted); letter-spacing: 2px; font-family: 'Rajdhani', sans-serif; }
  .muted       { color: var(--muted); }
  .msg         { font-size: 14px; line-height: 1.55; }
  .reason      { font-size: 11px; color: var(--muted); }
  .big-num     { font-size: 20px; font-weight: 900; background: linear-gradient(90deg,var(--accent),var(--gold)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
  .xp-num      { font-size: 26px; font-weight: 900; color: var(--gold); }
  .circle-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .circle-label { text-align: center; }

  .habit-list  { display: flex; flex-direction: column; gap: 8px; }
  .habit {
    background: var(--surface); border: 1.5px solid var(--border); border-radius: 14px;
    padding: 11px 14px; display: flex; align-items: center; justify-content: space-between;
    cursor: pointer; transition: all 0.18s; width: 100%; text-align: left;
  }
  .habit.checked { background: linear-gradient(135deg,var(--checkin-radial),var(--navy-deep)); border-color: var(--accent); box-shadow: 0 0 20px var(--accent)55; }
  .habit:disabled { opacity: 0.78; cursor: not-allowed; }
  .habit-left  { display: flex; align-items: center; gap: 11px; }
  .ico         { font-size: 22px; }
  .habit-name  { font-weight: 700; font-size: 14px; color: var(--muted); }
  .habit-name.done { color: var(--accent-light); }
  .habit-xp    { font-size: 10px; color: var(--text-dim); font-family: 'Rajdhani', sans-serif; }
  .habit-xp.done   { color: var(--gold); }
  .check {
    width: 30px; height: 30px; border-radius: 9px;
    background: var(--border); border: 2px solid var(--accent-dark);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 900; color: #fff; transition: all 0.15s;
  }
  .check.checked { background: var(--grad-cta); border: none; box-shadow: 0 0 14px var(--gold)88; }

  .sleep-grid  { display: flex; gap: 5px; justify-content: center; flex-wrap: wrap; }
  .sleep-btn {
    width: 29px; height: 29px; border-radius: 8px;
    background: var(--border); border: 1.5px solid var(--border-btn);
    color: var(--muted); font-weight: 900; font-size: 11px;
    cursor: pointer; transition: all 0.1s; font-family: 'Rajdhani', sans-serif;
  }
  .sleep-btn.sel {
    background: color-mix(in srgb, var(--c) 30%, transparent);
    border-color: var(--c); color: var(--c);
    box-shadow: 0 0 7px color-mix(in srgb, var(--c) 55%, transparent);
  }
  .sleep-btn:disabled { opacity: 0.45; cursor: not-allowed; }

  textarea {
    width: 100%; background: var(--bg); border: 1px solid var(--accent)33;
    border-radius: 10px; color: var(--text); font-size: 14px;
    padding: 12px; resize: none; min-height: 80px; font-family: 'Exo 2', sans-serif;
  }
  textarea.locked {
    opacity: 0.92;
    cursor: default;
    border-color: var(--border);
  }
  .edit-btn {
    margin-top: 10px;
    background: transparent;
    border: 1.5px solid var(--accent);
    border-radius: 10px;
    color: var(--accent-light);
    font-weight: 700;
    font-size: 12px;
    padding: 9px 22px;
    cursor: pointer;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 1px;
  }
  .save-btn {
    margin-top: 10px;
    background: var(--grad-cta);
    border: none; border-radius: 10px; color: #fff;
    font-weight: 900; font-size: 13px; padding: 9px 22px;
    cursor: pointer; font-family: 'Rajdhani', sans-serif; letter-spacing: 1px;
    box-shadow: 0 0 20px var(--accent)55;
  }
  .save-btn:disabled { opacity: 0.55; cursor: wait; }
  .day-actions { margin-top: 6px; }
  .wide { width: 100%; }
  .edit-btn.wide { margin-top: 0; }
</style>
