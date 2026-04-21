<script>
  import { onMount, tick } from 'svelte'
  import { get } from 'svelte/store'
  import { habits, habitSlots, loadHabits } from '../stores/habits.js'
  import { dailyLog, saveDailyLog, loadToday } from '../stores/checkin.js'
  import { habitsApi } from '../api/habits.js'
  import { localDateString } from '../lib/dateLocal.js'
  import { formatActiveDaysLabel } from '../lib/habitWeekdays.js'
  import { dayMessageFor, resetDayMessageCache } from '../lib/dayMessage.js'
  import Card from '../components/ui/Card.svelte'
  import Tag  from '../components/ui/Tag.svelte'
  import CountUpInline from '../components/ui/CountUpInline.svelte'
  import AddHabitModal from '../components/habits/AddHabitModal.svelte'
  import EditHabitModal from '../components/habits/EditHabitModal.svelte'
  import {
    isEducatorAssociation,
    loadGroupData,
    groupLeaderboard,
    hasGroup,
    educatorAssociationGroupId,
  } from '../stores/group.js'
  import EducatorMemberFollowupModal from '../components/educator/EducatorMemberFollowupModal.svelte'
  import { tab } from '../stores/tab.js'
  import { mergeUser } from '../stores/auth.js'
  import { appointmentsApi } from '../api/appointments.js'
  import { loadProfile, profileStore } from '../stores/profile.js'
  import { habitDayMultiplier, HABIT_BONUS_PER_TASK } from '../lib/xpHabitBonus.js'
  import { gameplayStore } from '../stores/gameplay.js'
  import { animMs } from '../lib/gameplayUiDefaults.js'

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
  let showAddHabitModal = false
  /** Plafond habitudes actives (niveau) — désactive « + Ajouter » quand plein */
  $: atHabitCap =
    $habitSlots.activeHabitCount >= $habitSlots.maxActiveHabits && $habitSlots.maxActiveHabits > 0
  /** Habitude en cours d’édition (modal) */
  let editHabit = null
  /** Suivi éducateur : membre sélectionné depuis l’aperçu classement */
  let followMember = null
  /** RDV du jour civil (apprenant / compte perso) */
  let todayAppointments = []
  let loadingAppts = false
  /** Formulaire « Non fait » (raison optionnelle — affichée seulement dans Stats → calendrier) */
  let apptDeclineOpenId = null
  let apptDeclineReason = ''

  const pullDraftFromServer = () => {
    const log = get(dailyLog)
    if (!log) return
    journal = log.journal ?? ''
    sleep = coerceSleep(log.sleepQuality)
  }

  const loadTodayAppointments = async () => {
    if (get(isEducatorAssociation)) return
    loadingAppts = true
    try {
      const list = await appointmentsApi.day(localDateString())
      todayAppointments = Array.isArray(list) ? list : []
    } catch {
      todayAppointments = []
    } finally {
      loadingAppts = false
    }
  }

  onMount(async () => {
    if (get(isEducatorAssociation)) {
      await loadGroupData()
      return
    }
    await loadHabits()
    dayBundleLocked = sessionStorage.getItem(dayLockStorageKey()) === '1'
    await tick()
    pullDraftFromServer()
    if (!dayBundleLocked) seedHabitDraft()
    await loadTodayAppointments()
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

  /** Backend : isDue false = pas prévu ce jour civil (affichage + sync API au save uniquement) */
  const isHabitDueToday = (h) => h.isDue !== false

  /** Prévu ce jour et sans déclaration « impossible » — compte pour XP / bonus / jauge. */
  const isHabitCountedToday = (h) => isHabitDueToday(h) && !h.skippedForDay

  /**
   * Aligne brouillon + baseline sur le serveur pour **toutes** les habitudes (comportement prod).
   * Impossibilité déclarée (`skippedForDay`) : pas une coche « vide », brouillon forcé à false.
   * @param {Record<string, boolean> | null} [preserveDraft] — si journée non verrouillée, réutilise les coches présentes dans l’objet.
   */
  const seedHabitDraft = (preserveDraft = null) => {
    const list = get(habits)
    const usePreserve =
      preserveDraft != null &&
      typeof preserveDraft === 'object' &&
      !dayBundleLocked
    habitDraft = Object.fromEntries(
      list.map((h) => {
        if (h.skippedForDay) return [h.id, false]
        const serverChecked = !!h.logs?.length
        if (usePreserve && preserveDraft[h.id] !== undefined) {
          return [h.id, preserveDraft[h.id]]
        }
        return [h.id, serverChecked]
      })
    )
    habitBaseline = Object.fromEntries(
      list.map((h) => [h.id, h.skippedForDay ? false : !!h.logs?.length]),
    )
  }

  async function reloadHomeForNewCalendarDay() {
    if (get(isEducatorAssociation)) {
      resetDayMessageCache()
      try {
        await loadToday()
      } catch {
        /* idem bootstrap */
      }
      await loadGroupData()
      return
    }
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
    await loadTodayAppointments()
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
    const h = get(habits).find((x) => x.id === id)
    if (h?.skippedForDay) return
    habitDraft = { ...habitDraft, [id]: !habitDraft[id] }
  }

  /** Déclare une impossibilité (API) — pas un toggle de case ni une simple décochée. */
  const declareHabitImpossible = async (h) => {
    if (dayBundleLocked || !isHabitDueToday(h) || h.skippedForDay) return
    const snapshot = { ...habitDraft }
    try {
      await habitsApi.skipDay(h.id, localDateString())
      await loadHabits()
      await tick()
      seedHabitDraft(snapshot)
    } catch (e) {
      alert(e.message || 'Impossible d’enregistrer la déclaration.')
    }
  }

  /** Retire la déclaration pour pouvoir à nouveau cocher. */
  const revokeHabitImpossible = async (h) => {
    if (dayBundleLocked || !isHabitDueToday(h) || !h.skippedForDay) return
    const snapshot = { ...habitDraft }
    try {
      await habitsApi.unskipDay(h.id, localDateString())
      await loadHabits()
      await tick()
      seedHabitDraft(snapshot)
    } catch (e) {
      alert(e.message || 'Impossible de réactiver l’habitude.')
    }
  }

  const selectSleep = (n) => {
    if (dayBundleLocked) return
    sleep = n
  }

  const unlockDay = async () => {
    sessionStorage.removeItem(dayLockStorageKey())
    journalDirty = false
    const snapshot = Object.fromEntries(get(habits).map((h) => [h.id, !!h.logs?.length]))
    dayBundleLocked = false
    habitDraft = { ...snapshot }
    habitBaseline = { ...snapshot }
    await loadHabits()
    await tick()
    pullDraftFromServer()
    seedHabitDraft(snapshot)
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
      let lastCristaux
      for (const h of list) {
        if (!isHabitDueToday(h) || h.skippedForDay) continue
        const want = !!habitDraft[h.id]
        const base = !!habitBaseline[h.id]
        if (want !== base) {
          const r = await habitsApi.toggle(h.id, d)
          if (r && typeof r.cristaux === 'number') lastCristaux = r.cristaux
        }
      }
      if (lastCristaux !== undefined) mergeUser({ cristaux: lastCristaux })
      await loadHabits()
      dayBundleLocked = true
      sessionStorage.setItem(dayLockStorageKey(), '1')
      habitDraft = {}
      habitBaseline = {}
    } finally {
      saving = false
    }
  }

  const handleHabitCreated = async () => {
    showAddHabitModal = false
    const snapshot = { ...habitDraft }
    await loadHabits()
    await tick()
    await tick()
    seedHabitDraft(snapshot)
  }

  const handleHabitEditSaved = async () => {
    editHabit = null
    const snapshot = { ...habitDraft }
    await loadHabits()
    await tick()
    seedHabitDraft(snapshot)
  }

  const completeTodayAppointment = async (a) => {
    if (localDateString() !== a.date) return
    try {
      await appointmentsApi.complete(a.id, { today: localDateString() })
      await loadProfile()
      await loadTodayAppointments()
    } catch (e) {
      alert(e.message || 'Impossible de valider le RDV')
    }
  }

  const submitDeclineAppointment = async (a) => {
    if (localDateString() !== a.date) return
    try {
      await appointmentsApi.notDone(a.id, {
        today: localDateString(),
        reason: apptDeclineReason.trim() || undefined,
      })
      apptDeclineOpenId = null
      apptDeclineReason = ''
      await loadProfile()
      await loadTodayAppointments()
    } catch (e) {
      alert(e.message || 'Impossible d’enregistrer.')
    }
  }

  const cancelDeclineAppointment = () => {
    apptDeclineOpenId = null
    apptDeclineReason = ''
  }

  /** À traiter : ni validés ni marqués non faits (liste principale). */
  $: apptsPendingToday = todayAppointments.filter((a) => !a.notDone && !a.done)
  /** Validés — même présentation repliable que les non faits. */
  $: apptsDoneToday = todayAppointments.filter((a) => a.done)
  /** Ratés ce jour — plus d’XP ; seule la suppression du RDV enlève l’entrée. */
  $: apptsMissedToday = todayAppointments.filter((a) => a.notDone)

  const deleteTodayAppointment = async (a) => {
    if (!confirm(`Supprimer le rendez-vous « ${a.title} » ? (action définitive)`)) return
    try {
      await appointmentsApi.remove(a.id)
      await loadProfile()
      await loadTodayAppointments()
    } catch (e) {
      alert(e.message || 'Suppression impossible')
    }
  }

  const deleteUserHabit = async (h) => {
    if (!confirm(`Retirer « ${h.name} » de ta liste ?`)) return
    try {
      const snapshot = { ...habitDraft }
      await habitsApi.delete(h.id)
      await loadHabits()
      await tick()
      seedHabitDraft(snapshot)
    } catch (e) {
      alert(e.message || 'Impossible de supprimer')
    }
  }

  $: dueHabits = $habits.filter(isHabitCountedToday)
  $: done       = dueHabits.filter((h) => !!h.logs?.length).length
  $: total      = dueHabits.length
  /**
   * Aperçu XP habitudes : brouillon en édition ; logs serveur si journée verrouillée
   * (après « Sauvegarder », habitDraft = {} — il faut lire les logs pour ne pas afficher 0).
   */
  $: baseDraftXp = dueHabits
    .filter((h) => (dayBundleLocked ? !!h.logs?.length : !!habitDraft[h.id]))
    .reduce((s, h) => s + h.xp, 0)
  $: doneDraft = dueHabits.filter((h) =>
    dayBundleLocked ? !!h.logs?.length : !!habitDraft[h.id],
  ).length
  $: allDoneDraft = doneDraft === total && total > 0
  $: habitMultDraft = habitDayMultiplier(
    allDoneDraft,
    total,
    $gameplayStore?.xp?.bonusPerTask ?? HABIT_BONUS_PER_TASK,
  )
  $: habitMultDraftLabel = habitMultDraft.toFixed(1).replace(/\.0$/, '')
  $: earnedFromDraft = baseDraftXp * habitMultDraft
  /** Somme des deux lignes du dessus (cumul profil + aperçu habitudes du jour) */
  $: xpCombinedSum = $profileStore.totalXP + Math.round(earnedFromDraft)
  $: earnedRounded = Math.round(earnedFromDraft)

  /** Humeur du check-in : 1–3 encouragement, 4–7 maintien, 8–10 félicitation (JSON) */
  $: mood       = $dailyLog?.mood ?? 5
  $: encourage  = dayMessageFor(mood, localDateString())
</script>

{#if $isEducatorAssociation}
<div class="view educator-home">
  <Card style="margin-bottom:14px; border-left:3px solid var(--gold)">
    <div class="sup" style="color:var(--gold)">COMPTE ÉDUCATEUR</div>
    <p class="msg">Ce profil sert à <strong>encadrer</strong> ton groupe association : pas d’habitudes ni de check-in / journal personnel ici — c’est refusé côté serveur. Pour un suivi perso, utilise un <strong>autre compte</strong> avec une <strong>autre adresse e-mail</strong>.</p>
  </Card>
  <button type="button" class="cta-groupe" on:click={() => tab.set('groupe')}>
    Voir le groupe — classement et invitations
  </button>
  {#if $hasGroup && $groupLeaderboard.length > 0}
    <p class="micro muted edu-section-label">Aperçu du classement</p>
    <p class="hint-edu muted" style="margin-top:-4px;margin-bottom:10px;font-size:0.82rem">
      Touche une ligne pour ouvrir le suivi détaillé (habitudes, stats, calendrier — données sensibles selon le consentement de l’élève).
    </p>
    <div class="edu-board">
      {#each $groupLeaderboard.slice(0, 10) as m, i}
        <button
          type="button"
          class="edu-row"
          disabled={!$educatorAssociationGroupId}
          on:click={() => {
            followMember = { id: m.id, username: m.username }
          }}
        >
          <span class="edu-rank">#{i + 1}</span>
          <span class="edu-ava">{m.avatar}</span>
          <span class="edu-name">{m.username}</span>
          <span class="edu-xp">{m.totalXP.toLocaleString()} XP</span>
        </button>
      {/each}
    </div>
  {:else if !$hasGroup}
    <p class="hint-edu">Tu n’es dans aucun groupe. Crée une association à l’inscription ou rejoins un groupe avec un code d’invitation.</p>
  {:else}
    <p class="hint-edu muted">Ouvre l’onglet Groupe pour charger le classement.</p>
  {/if}
</div>
{:else}
<div class="view">
  <!-- Message du jour + accès boutique (bouton à droite, responsive) -->
  <div class="dayMessageRow">
    <Card style="flex:1; min-width:0; border-left: 3px solid var(--cyan)">
      <div class="sup" style="color:var(--cyan)">MESSAGE DU JOUR</div>
      <p class="msg">{encourage || 'Bonne journée — un pas après l’autre.'}</p>
      <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap; align-items:center">
        <Tag color="var(--cyan)">Humeur {mood}/10</Tag>
        {#if $dailyLog?.moodReason}
          <em class="reason">"{$dailyLog.moodReason}"</em>
        {/if}
      </div>
    </Card>
    <aside class="shopAside" aria-label="Boutique">
      <button type="button" class="shopBtn" on:click={() => tab.set('shop')}>Shop</button>
    </aside>
  </div>

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
      <div class="xp-mini-card">
        <div class="xp-mini-block">
          <div class="micro" style="color:var(--muted)">XP TOTAL (ACTUEL)</div>
          <div class="xp-total-num">
            <CountUpInline value={$profileStore.totalXP} duration={animMs($gameplayStore, 'homeTotalXp')} />
          </div>
        </div>
        <div class="xp-mini-block">
          <div class="micro" style="color:var(--gold)">
            {dayBundleLocked ? 'AUJOURD’HUI (HABITUDES)' : 'AUJOURD’HUI (APERÇU)'}
          </div>
          <div class="xp-num">
            +<CountUpInline value={earnedRounded} duration={animMs($gameplayStore, 'homeToday')} />
          </div>
          {#if allDoneDraft && habitMultDraft > 1}
            <Tag color="var(--gold)">×{habitMultDraftLabel} BONUS ⚡</Tag>
          {/if}
        </div>
        <div class="xp-mini-block">
          <div class="micro" style="color:var(--muted)">TOTAL (ACTUEL + AUJ.)</div>
          <div
            class="xp-sum-num"
            title="Somme du cumul profil et de l’aperçu habitudes. Indicatif : le cumul inclut peut-être déjà une partie du jour ; check-in, journal, sommeil et RDV sont recalculés au serveur."
          >
            <CountUpInline value={xpCombinedSum} duration={animMs($gameplayStore, 'homeCombined')} />
          </div>
          <p class="xp-proj-hint micro muted">Indicatif — le serveur recalcule le total réel à l’enregistrement.</p>
        </div>
      </div>
    </Card>
  </div>

  <!-- RDV du jour -->
  {#if todayAppointments.length > 0 || loadingAppts}
    <Card style="margin-bottom:13px; border-left:3px solid var(--gold)">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; gap:8px; flex-wrap:wrap">
        <div class="sup" style="color:var(--gold); margin:0">RDV DU JOUR</div>
        <button type="button" class="link-agenda" on:click={() => tab.set('agenda')}>Agenda →</button>
      </div>
      {#if loadingAppts}
        <p class="muted micro">Chargement…</p>
      {:else}
        <div class="appt-home-list">
          {#each apptsPendingToday as a (a.id)}
            <div class="appt-home-row">
              <div>
                <div class="appt-home-title">{a.title}</div>
                {#if a.notes}
                  <p class="appt-home-notes">{a.notes}</p>
                {/if}
                <div class="appt-home-meta">
                  {#if a.timeHm}
                    <Tag color="var(--cyan)">{a.timeHm}</Tag>
                  {/if}
                  <Tag color="var(--gold)">+{a.xpReward ?? 30} XP</Tag>
                </div>
                {#if apptDeclineOpenId === a.id}
                  <p class="appt-decline-hint micro muted">
                    Raison optionnelle — visible seulement dans Stats → calendrier (survol du jour).
                  </p>
                  <textarea
                    class="appt-decline-ta"
                    rows="2"
                    maxlength="500"
                    placeholder="Ex. imprévu, report…"
                    bind:value={apptDeclineReason}
                  ></textarea>
                {/if}
              </div>
              {#if localDateString() === a.date}
                <div class="appt-home-btns">
                  {#if apptDeclineOpenId === a.id}
                    <button type="button" class="appt-val-btn" on:click={() => submitDeclineAppointment(a)}>
                      Confirmer non fait
                    </button>
                    <button type="button" class="appt-cancel-btn" on:click={cancelDeclineAppointment}>
                      Annuler
                    </button>
                  {:else}
                    <button
                      type="button"
                      class="appt-val-btn"
                      on:click={() => completeTodayAppointment(a)}
                    >Valider</button>
                    <button
                      type="button"
                      class="appt-cancel-btn"
                      on:click={() => {
                        apptDeclineOpenId = a.id
                        apptDeclineReason = ''
                      }}
                    >Non fait</button>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}

          {#if apptsPendingToday.length === 0 && (apptsDoneToday.length > 0 || apptsMissedToday.length > 0)}
            <p class="muted micro appt-pending-empty">
              Aucun RDV à traiter — voir validés ou non faits ci-dessous.
            </p>
          {/if}

          {#if apptsDoneToday.length > 0}
            <details class="appt-missed-details appt-done-details">
              <summary class="appt-missed-summary appt-done-summary">
                Rendez-vous validés ({apptsDoneToday.length})
              </summary>
              <div class="appt-missed-inner">
                {#each apptsDoneToday as a (a.id)}
                  <div class="appt-home-row appt-missed-row appt-done-row">
                    <div>
                      <div class="appt-home-title">{a.title}</div>
                      {#if a.notes}
                        <p class="appt-home-notes">{a.notes}</p>
                      {/if}
                      <div class="appt-home-meta">
                        {#if a.timeHm}
                          <Tag color="var(--cyan)">{a.timeHm}</Tag>
                        {/if}
                        <Tag color="var(--gold)">+{a.xpReward ?? 30} XP</Tag>
                        <Tag color="var(--green)">Validé</Tag>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            </details>
          {/if}

          {#if apptsMissedToday.length > 0}
            <details class="appt-missed-details">
              <summary class="appt-missed-summary">
                Rendez-vous non faits ({apptsMissedToday.length})
              </summary>
              <div class="appt-missed-inner">
                {#each apptsMissedToday as a (a.id)}
                  <div class="appt-home-row appt-missed-row">
                    <div>
                      <div class="appt-home-title">{a.title}</div>
                      {#if a.notes}
                        <p class="appt-home-notes">{a.notes}</p>
                      {/if}
                      <div class="appt-home-meta">
                        {#if a.timeHm}
                          <Tag color="var(--cyan)">{a.timeHm}</Tag>
                        {/if}
                        <Tag color="var(--red)">Non fait</Tag>
                      </div>
                      <p class="appt-missed-hint micro muted">
                        Raté — plus d’XP. Tu peux supprimer ce RDV pour le retirer de la liste.
                      </p>
                    </div>
                    <div class="appt-home-btns">
                      <button
                        type="button"
                        class="appt-cancel-btn"
                        on:click={() => deleteTodayAppointment(a)}
                      >Supprimer</button>
                    </div>
                  </div>
                {/each}
              </div>
            </details>
          {/if}
        </div>
      {/if}
    </Card>
  {/if}

  <!-- Habitudes -->
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px">
    <div class="micro muted">HABITUDES DU JOUR</div>
    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap">
      <span class="micro muted" title="Habitudes actives / places selon ton niveau">
        {$habitSlots.activeHabitCount}/{$habitSlots.maxActiveHabits} places
      </span>
      <button
        type="button"
        class="add-habit-btn"
        disabled={atHabitCap}
        title={atHabitCap
          ? 'Nombre max d’habitudes pour ton niveau — désactive une habitude ou monte de niveau.'
          : 'Ajouter une habitude'}
        on:click={() => !atHabitCap && (showAddHabitModal = true)}
      >+ Ajouter</button>
    </div>
  </div>
  {#if atHabitCap}
    <p class="micro muted" style="margin:-4px 0 10px">
      Tu as atteint le plafond d’habitudes actives pour ton niveau (niveau {$habitSlots.level}). Désactive une
      habitude dans la liste ou gagne de l’XP pour débloquer de nouvelles places.
    </p>
  {/if}
  <p class="habit-legend micro muted">
    Coche si c’est fait. « Impossible » = tu ne peux pas aujourd’hui : la ligne se fige, hors XP, sans pénalité streak — ce n’est pas une case laissée vide.
  </p>
  <div class="habit-list">
    {#each $habits as h (h.id)}
      <div
        class="habit-row"
        class:not-due={!isHabitDueToday(h)}
        class:day-skipped={isHabitDueToday(h) && h.skippedForDay}
      >
        {#if isHabitDueToday(h) && h.skippedForDay}
          <div
            class="habit--waived"
            role="group"
            aria-label="Impossibilité déclarée pour aujourd’hui — pas de coche, pas d’interaction sur cette ligne"
          >
            <div class="habit-left">
              <span class="ico">{h.icon}</span>
              <div>
                <div class="habit-name habit-name--waived">{h.name}</div>
                <div class="habit-xp skip-line">
                  <span class="skip-label">Impossibilité déclarée</span>
                  <span class="skip-detail">Hors comptage XP · streak préservé · pas une case vide</span>
                </div>
              </div>
            </div>
            <div class="check check--waived" aria-hidden="true">⊘</div>
          </div>
        {:else}
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
                {#if !isHabitDueToday(h)}
                  <div class="habit-xp not-today">
                    <span class="not-today-line">Pas aujourd’hui</span>
                    <span class="active-days">Prévu : {formatActiveDaysLabel(h.weekdaysMask)}</span>
                  </div>
                {:else}
                  <div
                    class="habit-xp"
                    class:done={dayBundleLocked ? !!h.logs?.length : !!habitDraft[h.id]}
                  >+{h.xp} XP</div>
                {/if}
              </div>
            </div>
            <div
              class="check"
              class:checked={dayBundleLocked ? !!h.logs?.length : !!habitDraft[h.id]}
            >{(dayBundleLocked ? !!h.logs?.length : !!habitDraft[h.id]) ? '✓' : ''}</div>
          </button>
        {/if}
        <div class="habit-actions">
          {#if isHabitDueToday(h) && !h.skippedForDay}
            <button
              type="button"
              class="habit-action-btn text skip-action"
              title="Indiquer que tu ne peux pas aujourd’hui — la ligne se fige, hors XP, streak préservé. Ce n’est pas décocher une case."
              aria-label="Déclarer impossible pour aujourd’hui"
              disabled={dayBundleLocked}
              on:click|stopPropagation={() => declareHabitImpossible(h)}
            >Impossible</button>
          {:else if isHabitDueToday(h) && h.skippedForDay}
            <button
              type="button"
              class="habit-action-btn text skip-action"
              title="Retire la déclaration si tu peux faire l’habitude aujourd’hui ; tu pourras alors cocher."
              aria-label="Réactiver l’habitude pour aujourd’hui"
              disabled={dayBundleLocked}
              on:click|stopPropagation={() => revokeHabitImpossible(h)}
            >Réactiver</button>
          {/if}
          <button
            type="button"
            class="habit-action-btn text"
            title={h.origin === 'DAILY_OFFER' ? 'Jours de l’habitude du jour' : 'Modifier'}
            aria-label={h.origin === 'DAILY_OFFER' ? 'Choisir les jours (habitude du jour)' : 'Modifier l’habitude'}
            on:click|stopPropagation={() => { editHabit = h }}
          >Modifier</button>
          <button
            type="button"
            class="habit-action-btn text danger"
            title="Retirer cette habitude de ta liste"
            aria-label="Supprimer l’habitude"
            on:click|stopPropagation={() => deleteUserHabit(h)}
          >Retirer</button>
        </div>
      </div>
    {/each}
  </div>

  <!-- Sommeil -->
  <Card style="margin-bottom:13px; margin-top:13px">
    <div class="micro" style="color:var(--cyan); margin-bottom:10px">🌙 QUALITÉ DE SOMMEIL</div>
    <div class="sleep-grid">
      {#each Array.from({ length: 10 }, (_, i) => i + 1) as n}
        <button
          type="button"
          class="sleep-btn"
          class:sel={n <= sleep}
          style="--c:{n <= 4 ? 'var(--red)' : n <= 7 ? 'var(--gold)' : 'var(--green)'}"
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
{/if}

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
  .xp-mini-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
    min-height: 100%;
    justify-content: center;
  }
  .xp-mini-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    width: 100%;
  }
  .xp-total-num {
    font-size: 1.05rem;
    font-weight: 800;
    color: var(--text);
    font-family: 'Rajdhani', sans-serif;
  }
  .xp-sum-num {
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--cyan);
    font-family: 'Rajdhani', sans-serif;
  }
  .xp-proj-hint {
    margin: 0;
    max-width: 11rem;
    line-height: 1.35;
    font-size: 8px !important;
    letter-spacing: 0.06em;
  }
  .circle-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .circle-label { text-align: center; }

  .habit-list  { display: flex; flex-direction: column; gap: 8px; }
  .habit-row {
    display: flex;
    align-items: stretch;
    gap: 6px;
  }
  .habit-row.not-due {
    opacity: 0.55;
  }
  .habit-legend {
    margin: -2px 0 12px;
    line-height: 1.45;
    font-size: 9px;
    letter-spacing: 0.35px;
    max-width: 42rem;
  }
  .habit-row.day-skipped .habit--waived {
    border-color: color-mix(in srgb, var(--muted) 50%, var(--border));
    border-style: dashed;
    background: color-mix(in srgb, var(--surface) 90%, var(--muted));
  }
  .habit--waived {
    cursor: default;
    user-select: none;
  }
  .habit-name--waived {
    color: var(--text-dim);
  }
  .habit-xp.skip-line {
    font-size: 10px;
    color: var(--muted);
    letter-spacing: 0.2px;
    line-height: 1.35;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
  }
  .habit-xp.skip-line .skip-label {
    font-weight: 700;
    color: var(--text-dim);
  }
  .habit-xp.skip-line .skip-detail {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.25px;
    color: var(--muted);
    opacity: 0.95;
  }
  .habit-xp.not-today {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    font-size: 10px;
    color: var(--muted);
    letter-spacing: 0.3px;
    line-height: 1.25;
  }
  .habit-xp.not-today .not-today-line {
    font-weight: 700;
    color: var(--muted);
  }
  .habit-xp.not-today .active-days {
    font-size: 10px;
    color: var(--cyan);
    opacity: 0.95;
  }
  .habit-row .habit,
  .habit-row .habit--waived {
    flex: 1;
    min-width: 0;
  }
  .habit-actions {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    flex-shrink: 0;
  }
  .habit-action-btn {
    border-radius: 8px;
    border: 1px solid var(--border-btn);
    background: var(--surface);
    cursor: pointer;
    line-height: 1.15;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.15s, background 0.15s, color 0.15s;
  }
  .habit-action-btn.text {
    min-width: 4.5rem;
    padding: 7px 8px;
    font-size: 9px;
    font-weight: 800;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.55px;
    text-transform: uppercase;
    color: var(--muted);
  }
  .habit-action-btn.text:hover {
    color: var(--text);
  }
  .habit-action-btn.skip-action.text {
    color: color-mix(in srgb, var(--cyan) 92%, var(--muted));
  }
  .habit-action-btn.skip-action.text:hover {
    color: var(--cyan);
    border-color: color-mix(in srgb, var(--cyan) 45%, var(--border-btn));
    background: color-mix(in srgb, var(--cyan) 10%, var(--surface));
  }
  .habit-action-btn.text:not(.skip-action):not(.danger):hover {
    border-color: var(--accent);
    background: var(--border);
  }
  .habit-action-btn.danger:hover {
    border-color: var(--red);
    background: color-mix(in srgb, var(--red) 14%, var(--surface));
    color: var(--red);
  }
  .habit-action-btn.skip-action:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .habit,
  .habit--waived {
    background: var(--surface); border: 1.5px solid var(--border); border-radius: 14px;
    padding: 11px 14px; display: flex; align-items: center; justify-content: space-between;
    width: 100%; text-align: left;
  }
  .habit {
    cursor: pointer; transition: all 0.18s;
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
  .check--waived {
    background: color-mix(in srgb, var(--muted) 22%, var(--border));
    border: 2px dashed color-mix(in srgb, var(--muted) 55%, var(--accent-dark));
    color: var(--muted);
    font-size: 15px;
    font-weight: 700;
    opacity: 0.95;
  }

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
  
  .add-habit-btn {
    background: transparent;
    border: 1px solid var(--accent);
    border-radius: 6px;
    color: var(--accent);
    font-size: 11px;
    padding: 4px 10px;
    cursor: pointer;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.5px;
    transition: all 0.2s;
  }
  .add-habit-btn:hover:not(:disabled) {
    background: var(--accent);
    color: var(--bg);
  }
  .add-habit-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    border-color: var(--border);
    color: var(--muted);
  }

  .educator-home .cta-groupe {
    width: 100%;
    margin-top: 4px;
    padding: 12px 16px;
    border: none;
    border-radius: 12px;
    background: var(--grad-cta);
    color: #fff;
    font-weight: 800;
    font-size: 0.95rem;
    cursor: pointer;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.5px;
    box-shadow: 0 0 18px var(--accent)44;
  }
  .educator-home .edu-section-label { margin: 18px 0 10px; }
  .edu-board {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .edu-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    width: 100%;
    text-align: left;
    cursor: pointer;
    font: inherit;
    color: inherit;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .edu-row:hover:not(:disabled) {
    border-color: var(--accent);
    box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 25%, transparent);
  }
  .edu-row:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .edu-rank {
    font-family: 'Rajdhani', sans-serif;
    font-weight: 800;
    color: var(--muted);
    min-width: 32px;
  }
  .edu-ava { font-size: 1.35rem; }
  .edu-name { flex: 1; font-weight: 700; min-width: 0; }
  .edu-xp {
    font-weight: 800;
    color: var(--gold);
    font-size: 0.9rem;
    font-family: 'Rajdhani', sans-serif;
  }
  .hint-edu {
    margin-top: 14px;
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--text);
  }

  .link-agenda {
    background: transparent;
    border: 1px solid var(--gold);
    color: var(--gold);
    font-size: 10px;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    letter-spacing: 1px;
    padding: 4px 10px;
    border-radius: 8px;
    cursor: pointer;
  }
  .link-agenda:hover {
    background: color-mix(in srgb, var(--gold) 18%, transparent);
  }
  .appt-home-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .appt-home-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
  }
  .appt-home-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  .appt-home-title {
    font-weight: 700;
    font-size: 0.95rem;
  }
  .appt-home-notes {
    font-size: 0.82rem;
    color: var(--muted);
    margin: 6px 0 0;
    line-height: 1.4;
  }
  .appt-home-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }
  .appt-home-btns {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    flex-shrink: 0;
  }
  .appt-val-btn {
    flex-shrink: 0;
    padding: 8px 14px;
    border: none;
    border-radius: 10px;
    background: var(--grad-cta);
    color: #fff;
    font-weight: 800;
    font-size: 11px;
    font-family: 'Rajdhani', sans-serif;
    cursor: pointer;
    box-shadow: 0 0 12px var(--accent)44;
  }
  .appt-cancel-btn {
    padding: 7px 12px;
    border-radius: 10px;
    border: 1px solid var(--border-btn);
    background: var(--surface);
    color: var(--muted);
    font-weight: 700;
    font-size: 10px;
    font-family: 'Rajdhani', sans-serif;
    cursor: pointer;
  }
  .appt-cancel-btn:hover {
    border-color: var(--accent);
    color: var(--text);
  }
  .appt-decline-hint {
    margin: 6px 0 4px;
    max-width: 16rem;
  }
  .appt-decline-ta {
    width: 100%;
    max-width: 16rem;
    margin-top: 4px;
    padding: 8px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font-size: 12px;
    resize: vertical;
    min-height: 44px;
    font-family: inherit;
  }

  .appt-missed-details {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid var(--border);
  }

  .appt-pending-empty {
    margin: 0 0 8px;
    line-height: 1.4;
  }

  .appt-done-summary {
    color: var(--green);
  }

  .appt-done-details .appt-done-summary::before {
    color: var(--green);
  }

  .appt-missed-summary {
    cursor: pointer;
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--muted);
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.5px;
    list-style: none;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .appt-missed-summary::-webkit-details-marker {
    display: none;
  }

  .appt-missed-summary::before {
    content: '▸';
    display: inline-block;
    transition: transform 0.15s ease;
    color: var(--accent);
  }

  .appt-missed-details[open] .appt-missed-summary::before {
    transform: rotate(90deg);
  }

  .appt-missed-inner {
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .appt-missed-row {
    padding: 10px;
    border-radius: 10px;
    background: var(--bg);
    border: 1px solid var(--border);
  }

  .appt-missed-hint {
    margin-top: 8px;
    line-height: 1.35;
  }

  .dayMessageRow {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 13px;
  }
  .shopAside {
    flex: 0 0 auto;
    padding-top: 2px;
    align-self: flex-start;
  }
  .shopBtn {
    appearance: none;
    min-height: 44px;
    min-width: 88px;
    padding: 10px 18px;
    border-radius: 12px;
    font: inherit;
    font-weight: 600;
    letter-spacing: 0.06em;
    color: var(--text);
    cursor: pointer;
    border: 1px solid rgba(6, 182, 212, 0.42);
    background: linear-gradient(165deg, rgba(6, 182, 212, 0.14) 0%, var(--bg) 100%);
    box-shadow:
      0 0 0 1px rgba(6, 182, 212, 0.12),
      0 4px 20px rgba(6, 182, 212, 0.14);
    transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
  }
  .shopBtn:hover {
    border-color: rgba(6, 182, 212, 0.55);
    box-shadow:
      0 0 0 1px rgba(6, 182, 212, 0.18),
      0 6px 26px rgba(6, 182, 212, 0.2);
    transform: translateY(-1px);
  }
  .shopBtn:active {
    transform: translateY(0);
  }
  @media (max-width: 480px) {
    .dayMessageRow {
      flex-direction: column;
      align-items: stretch;
    }
    .shopAside {
      padding-top: 0;
    }
    .shopBtn {
      width: 100%;
    }
  }
</style>

{#if !$isEducatorAssociation && showAddHabitModal}
  <AddHabitModal on:created={handleHabitCreated} on:close={() => showAddHabitModal = false} />
{/if}
{#if !$isEducatorAssociation && editHabit}
  <EditHabitModal habit={editHabit} on:saved={handleHabitEditSaved} on:close={() => (editHabit = null)} />
{/if}

{#if $isEducatorAssociation && followMember && $educatorAssociationGroupId}
  <EducatorMemberFollowupModal
    groupId={$educatorAssociationGroupId}
    member={followMember}
    on:close={() => (followMember = null)}
  />
{/if}
