<script>
  import { onMount } from 'svelte'
  import { get } from 'svelte/store'
  import Card from '../components/ui/Card.svelte'
  import Tag from '../components/ui/Tag.svelte'
  import { localDateString, mondayFirstWeekdayIndex } from '../lib/dateLocal.js'
  import { appointmentsApi } from '../api/appointments.js'
  import { loadProfile } from '../stores/profile.js'
  import {
    isEducatorAssociation,
    loadGroupData,
    groupLeaderboard,
    educatorAssociationGroupId,
  } from '../stores/group.js'

  const currentYear = () => new Date().getFullYear()
  const DOW_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  /** XP fixe côté produit — pas modifiable par l’utilisateur */
  const APPT_XP_FIXED = 30

  let year = currentYear()
  /** Coercion entière (bind input number peut être string). */
  $: agendaYearNum = typeof year === 'number' ? year : Math.floor(Number(year)) || currentYear()

  /** @type {{ date: string, scheduled: number, completed: number, intensity: number }[]} */
  let heatDays = []
  /** @type {any[]} */
  let managedRows = []

  const ymdFromIso = (v) => (typeof v === 'string' ? v.slice(0, 10) : '')

  const heatMapFromManaged = (rows, y) => {
    const map = {}
    for (const r of rows) {
      const k = ymdFromIso(r.date)
      if (!k || !k.startsWith(`${y}-`)) continue
      const n = (map[k]?.scheduled ?? 0) + 1
      const intensity = n === 0 ? 0 : Math.min(100, 12 + n * 22)
      map[k] = { date: k, scheduled: n, completed: 0, intensity }
    }
    return map
  }

  /** @type {Record<string, { date: string, scheduled: number, completed: number, intensity: number }>} */
  $: heatByDate = $isEducatorAssociation
    ? heatMapFromManaged(managedRows, agendaYearNum)
    : Object.fromEntries((heatDays ?? []).map((d) => [d.date, d]))
  /** @type {{ id: string, title: string, notes?: string, date: string, timeHm: string, xpReward: number, done: boolean, notDone?: boolean }[]} */
  let modalDayRows = []
  let apptDeclineOpenId = null
  let apptDeclineReason = ''

  let loading = false
  let modalLoading = false
  let err = ''

  let modalOpen = false
  /** @type {string | null} */
  let modalDate = null

  let newTitle = ''
  let newNotes = ''
  /** format input time HTML : HH:mm */
  let newTimeHm = '09:00'

  /** @type {string | null} */
  let editingId = null
  /** @type {{ done?: boolean } | null} */
  let editingRow = null
  let editTitle = ''
  let editNotes = ''
  let editDate = ''
  let editTimeHm = '09:00'

  let eduTitle = ''
  let eduNotes = ''
  let eduTimeHm = '09:00'
  let eduMemberId = ''

  /** @type {string | null} */
  let eduEditingId = null
  /** @type {any} */
  let eduEditingRow = null
  let eduEditTitle = ''
  let eduEditNotes = ''
  let eduEditDate = ''
  let eduEditTimeHm = '09:00'

  const completePayload = () => ({ today: localDateString() })

  /** 6 lignes × 7 jours, semaine lun → dim — mois mural classique. */
  const MONTH_GRID_CELLS = 42

  /**
   * @param {number} y année civile locale
   * @param {number} m 0–11
   */
  const buildMonthBloc = (y, m) => {
    const firstOfMonth = new Date(y, m, 1)
    const leading = mondayFirstWeekdayIndex(firstOfMonth)
    const anchor = new Date(y, m, 1)
    anchor.setDate(1 - leading)
    const cells = []
    for (let i = 0; i < MONTH_GRID_CELLS; i++) {
      const d = new Date(anchor)
      d.setDate(anchor.getDate() + i)
      const ymd = localDateString(d)
      const inMonth = d.getFullYear() === y && d.getMonth() === m
      cells.push({ ymd, d, inMonth })
    }
    const label = firstOfMonth.toLocaleDateString('fr-FR', { month: 'long' })
    return { monthIndex: m, key: `${y}-${String(m + 1).padStart(2, '0')}`, label, cells }
  }

  /** @param {number} y */
  const buildYearMonths = (y) => {
    if (!Number.isFinite(y) || y < 1900 || y > 2600) return []
    /** @type {ReturnType<typeof buildMonthBloc>[]} */
    const out = []
    for (let m = 0; m < 12; m++) out.push(buildMonthBloc(y, m))
    return out
  }

  $: yearMonths = buildYearMonths(agendaYearNum)
  $: todayYmd = localDateString()

  const loadCalendarStudent = async () => {
    loading = true
    err = ''
    try {
      const cal = await appointmentsApi.calendar(agendaYearNum)
      heatDays = cal?.days ?? []
    } catch (e) {
      err = e.message || 'Impossible de charger le calendrier'
      heatDays = []
    } finally {
      loading = false
    }
  }

  const loadEducator = async () => {
    const gid = get(educatorAssociationGroupId)
    if (!gid) {
      managedRows = []
      return
    }
    loading = true
    err = ''
    try {
      const rows = await appointmentsApi.managed(gid, agendaYearNum)
      managedRows = Array.isArray(rows) ? rows : []
    } catch (e) {
      err = e.message || 'Impossible de charger les RDV'
      managedRows = []
    } finally {
      loading = false
    }
  }

  $: gid = $educatorAssociationGroupId
  $: if ($isEducatorAssociation) {
    gid
    agendaYearNum
    void loadEducator()
  } else {
    agendaYearNum
    void loadCalendarStudent()
  }

  const loadModalDayStudent = async () => {
    if (!modalDate) return
    modalLoading = true
    try {
      const day = await appointmentsApi.day(modalDate)
      modalDayRows = Array.isArray(day) ? day : []
    } catch {
      modalDayRows = []
    } finally {
      modalLoading = false
    }
  }

  const openDayModal = async (ymd) => {
    if (!ymd) return
    modalDate = ymd
    modalOpen = true
    editingId = null
    newTitle = ''
    newNotes = ''
    newTimeHm = '09:00'
    err = ''
    await loadModalDayStudent()
  }

  const closeModal = () => {
    modalOpen = false
    modalDate = null
    modalDayRows = []
    editingId = null
    editingRow = null
    eduEditingId = null
    eduEditingRow = null
    apptDeclineOpenId = null
    apptDeclineReason = ''
  }

  const cellColor = (intensity) => {
    if (intensity <= 0) return 'var(--border)'
    const a = 0.2 + (intensity / 100) * 0.85
    return `color-mix(in srgb, var(--accent) ${Math.round(a * 100)}%, var(--bg))`
  }

  const createMine = async () => {
    if (!modalDate || !newTitle.trim()) return
    err = ''
    try {
      await appointmentsApi.create({
        title: newTitle.trim(),
        notes: newNotes.trim() || undefined,
        date: modalDate,
        timeHm: newTimeHm,
      })
      newTitle = ''
      newNotes = ''
      newTimeHm = '09:00'
      await loadProfile()
      await loadCalendarStudent()
      await loadModalDayStudent()
    } catch (e) {
      err = e.message || 'Création impossible'
    }
  }

  const startEdit = (a) => {
    editingId = a.id
    editingRow = a
    editTitle = a.title
    editNotes = a.notes ?? ''
    editDate = a.date
    editTimeHm = a.timeHm ?? '09:00'
  }

  const cancelEdit = () => {
    editingId = null
    editingRow = null
  }

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) return
    err = ''
    try {
      const body = editingRow?.done
        ? { title: editTitle.trim(), notes: editNotes.trim() || null }
        : {
            title: editTitle.trim(),
            notes: editNotes.trim() || null,
            date: editDate,
            timeHm: editTimeHm,
          }
      await appointmentsApi.update(editingId, body)
      editingId = null
      editingRow = null
      await loadProfile()
      await loadCalendarStudent()
      await loadModalDayStudent()
    } catch (e) {
      err = e.message || 'Modification impossible'
    }
  }

  const completeOne = async (a) => {
    err = ''
    try {
      await appointmentsApi.complete(a.id, completePayload())
      await loadProfile()
      await loadCalendarStudent()
      await loadModalDayStudent()
    } catch (e) {
      err = e.message || 'Validation impossible'
    }
  }

  const declineOne = async (a) => {
    err = ''
    try {
      await appointmentsApi.notDone(a.id, {
        today: localDateString(),
        reason: apptDeclineReason.trim() || undefined,
      })
      apptDeclineOpenId = null
      apptDeclineReason = ''
      await loadProfile()
      await loadCalendarStudent()
      await loadModalDayStudent()
    } catch (e) {
      err = e.message || 'Enregistrement impossible'
    }
  }

  const cancelDeclineAppt = () => {
    apptDeclineOpenId = null
    apptDeclineReason = ''
  }

  const removeOne = async (id) => {
    if (!confirm('Supprimer ce rendez-vous ?')) return
    err = ''
    try {
      await appointmentsApi.remove(id)
      await loadCalendarStudent()
      await loadModalDayStudent()
    } catch (e) {
      err = e.message || 'Suppression impossible'
    }
  }

  const createForMember = async () => {
    const gid = get(educatorAssociationGroupId)
    if (!gid || !eduMemberId || !modalDate || !eduTitle.trim()) return
    err = ''
    try {
      await appointmentsApi.createForMember({
        groupId: gid,
        memberUserId: eduMemberId,
        title: eduTitle.trim(),
        notes: eduNotes.trim() || undefined,
        date: modalDate,
        timeHm: eduTimeHm,
      })
      eduTitle = ''
      eduNotes = ''
      eduTimeHm = '09:00'
      await loadEducator()
    } catch (e) {
      err = e.message || 'Assignation impossible'
    }
  }

  const startEduEdit = (r) => {
    eduEditingId = r.id
    eduEditingRow = r
    eduEditTitle = r.title
    eduEditNotes = r.notes ?? ''
    eduEditDate = ymdFromIso(r.date)
    eduEditTimeHm = r.timeHm ?? '09:00'
  }

  const saveEduEdit = async () => {
    if (!eduEditingId || !eduEditTitle.trim()) return
    err = ''
    try {
      const body = eduEditingRow?.hasCompletion
        ? { title: eduEditTitle.trim(), notes: eduEditNotes.trim() || null }
        : {
            title: eduEditTitle.trim(),
            notes: eduEditNotes.trim() || null,
            date: eduEditDate,
            timeHm: eduEditTimeHm,
          }
      await appointmentsApi.update(eduEditingId, body)
      eduEditingId = null
      eduEditingRow = null
      await loadEducator()
    } catch (e) {
      err = e.message || 'Modification impossible'
    }
  }

  const removeManaged = async (id) => {
    if (!confirm('Retirer ce RDV ?')) return
    err = ''
    try {
      await appointmentsApi.remove(id)
      await loadEducator()
    } catch (e) {
      err = e.message || 'Suppression impossible'
    }
  }

  const openEducatorDayModal = (ymd) => {
    if (!ymd) return
    modalDate = ymd
    modalOpen = true
    eduEditingId = null
    eduTitle = ''
    eduNotes = ''
    eduTimeHm = '09:00'
    err = ''
  }

  $: eduMembers = $groupLeaderboard
  $: if (eduMembers.length && !eduMembers.some((m) => m.id === eduMemberId)) {
    eduMemberId = eduMembers[0].id
  }

  $: managedForModal =
    $isEducatorAssociation && modalDate
      ? managedRows.filter((r) => ymdFromIso(r.date) === modalDate)
      : []

  const onCellClick = (ymd) => {
    if ($isEducatorAssociation) openEducatorDayModal(ymd)
    else openDayModal(ymd)
  }

  onMount(async () => {
    if (get(isEducatorAssociation)) {
      await loadGroupData()
      if (get(groupLeaderboard).length && !eduMemberId) {
        eduMemberId = get(groupLeaderboard)[0]?.id ?? ''
      }
    }
  })

  const fmtModalTitle = (ymd) => {
    const [yy, mm, dd] = ymd.split('-').map(Number)
    const dt = new Date(yy, mm - 1, dd)
    return dt.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

</script>

<div class="view">
  <div class="head">
    <div class="sup">AGENDA</div>
    <h1 class="title">Rendez-vous</h1>
    <label class="year-row">
      <span class="micro">Année</span>
      <input type="number" min="2020" max="2100" bind:value={year} />
    </label>
    <p class="sub">
      Chaque bloc = un mois (lun → dim en-tête puis les jours). <strong>Fais défiler horizontalement</strong> pour parcourir les 12 mois. Touche un jour pour les RDV.
    </p>
  </div>

  {#if err && !modalOpen}
    <p class="err">{err}</p>
  {/if}

  <Card style="width:100%;box-sizing:border-box">
    <div class="gh-toolbar">
      <span class="micro muted">Moins d’activité</span>
      <div class="legend-scale" aria-hidden="true"></div>
      <span class="micro muted">Plus d’activité</span>
    </div>

    <div class="months-strip-wrap" class:dim={loading}>
      <div class="year-cal-scroll" aria-label="Calendrier de l’année">
        {#each yearMonths as bloc (bloc.key)}
          <section class="month-card">
            <h2 class="month-card-title">{bloc.label}</h2>
            <div class="month-dow" aria-hidden="true">
              {#each DOW_LETTERS as L}<span>{L}</span>{/each}
            </div>
            <div class="month-cell-grid">
              {#each bloc.cells as cell (bloc.key + ':' + cell.ymd)}
                <button
                  type="button"
                  class="month-cell"
                  class:omc={!cell.inMonth}
                  class:today={cell.inMonth && cell.ymd === todayYmd}
                  class:has-appt={cell.inMonth && (heatByDate[cell.ymd]?.scheduled ?? 0) > 0}
                  disabled={!cell.inMonth}
                  style={cell.inMonth
                    ? `background:${cellColor(heatByDate[cell.ymd]?.intensity ?? 0)}`
                    : undefined}
                  title={cell.inMonth
                    ? `${cell.ymd} — ${heatByDate[cell.ymd]?.scheduled ?? 0} RDV`
                    : ''}
                  aria-hidden={!cell.inMonth ? true : undefined}
                  on:click={() => onCellClick(cell.ymd)}
                >
                  {#if cell.inMonth}
                    <span class="month-cell-num">{cell.d.getDate()}</span>
                  {/if}
                </button>
              {/each}
            </div>
          </section>
        {/each}
      </div>
    </div>
  </Card>

  {#if $isEducatorAssociation && managedRows.length > 0}
    <Card style="margin-top:12px">
      <div class="micro muted" style="margin-bottom:8px">TOUS LES RDV ({agendaYearNum})</div>
      <ul class="compact-list">
        {#each managedRows as r}
          <li>
            <button type="button" class="link-row" on:click={() => openEducatorDayModal(ymdFromIso(r.date))}>
              <span class="r-date">{ymdFromIso(r.date)}</span>
              <span class="r-title">{r.title}</span>
              <span class="r-who">{r.assignee?.username ?? '?'}</span>
            </button>
          </li>
        {/each}
      </ul>
    </Card>
  {/if}
</div>

{#if modalOpen && modalDate}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="overlay" role="presentation" on:click={closeModal}></div>
  <div class="modal-wrap" role="dialog" aria-modal="true" aria-labelledby="modal-day-title">
    <Card style="max-width: 420px; width: 100%; position: relative; max-height: 85vh; overflow: auto">
      <button type="button" class="modal-x" on:click={closeModal} aria-label="Fermer">×</button>
      <h2 id="modal-day-title" class="modal-h2">{fmtModalTitle(modalDate)}</h2>
      <p class="modal-ymd micro muted">{modalDate}</p>

      {#if err}
        <p class="err modal-err">{err}</p>
      {/if}

      {#if !$isEducatorAssociation}
        {#if modalLoading}
          <p class="muted">Chargement…</p>
        {:else}
          <div class="modal-section">
            <div class="micro" style="color:var(--cyan)">NOUVEAU RDV CE JOUR</div>
            <label class="field">
              <span>Titre</span>
              <input type="text" maxlength="120" bind:value={newTitle} placeholder="Ex. Appel coach" />
            </label>
            <label class="field">
              <span>Notes</span>
              <textarea rows="2" bind:value={newNotes} placeholder="Optionnel"></textarea>
            </label>
            <label class="field">
              <span>Heure</span>
              <input type="time" bind:value={newTimeHm} />
            </label>
            <p class="xp-fixed-hint micro muted">+{APPT_XP_FIXED} XP à la validation (montant fixe)</p>
            <button type="button" class="cta" on:click={createMine}>Ajouter le RDV</button>
          </div>

          <div class="modal-section">
            <div class="micro muted">RDV DE CE JOUR ({modalDayRows.length})</div>
            {#if !modalDayRows.length}
              <p class="muted small">Aucun pour l’instant — ajoute-en un ci-dessus.</p>
            {:else}
              <ul class="appt-list">
                {#each modalDayRows as a}
                  <li class="appt-item">
                    {#if editingId === a.id}
                      <div class="edit-form">
                        <label class="field">
                          <span>Titre</span>
                          <input type="text" bind:value={editTitle} maxlength="120" />
                        </label>
                        <label class="field">
                          <span>Notes</span>
                          <textarea rows="2" bind:value={editNotes}></textarea>
                        </label>
                        <div class="row2">
                          <label class="field">
                            <span>Date</span>
                            <input type="date" bind:value={editDate} disabled={a.done} />
                          </label>
                          <label class="field">
                            <span>Heure</span>
                            <input type="time" bind:value={editTimeHm} disabled={a.done} />
                          </label>
                        </div>
                        <div class="btn-row">
                          <button type="button" class="btn-sec" on:click={cancelEdit}>Annuler</button>
                          <button type="button" class="cta inline" on:click={saveEdit}>Enregistrer</button>
                        </div>
                      </div>
                    {:else}
                      <div class="appt-main">
                        <div class="appt-title">{a.title}</div>
                        <div class="appt-meta">
                          <Tag color="var(--cyan)">{a.timeHm ?? '—'}</Tag>
                          <Tag color="var(--gold)">+{APPT_XP_FIXED} XP</Tag>
                          {#if a.done}
                            <Tag color="var(--green)">Validé</Tag>
                          {:else if a.notDone}
                            <Tag color="var(--red)">Non fait</Tag>
                          {/if}
                        </div>
                        {#if a.notes}
                          <p class="notes">{a.notes}</p>
                        {/if}
                        {#if apptDeclineOpenId === a.id && !a.notDone}
                          <p class="appt-decline-hint micro muted">Raison optionnelle — visible dans Stats → calendrier.</p>
                          <textarea
                            class="appt-decline-ta"
                            rows="2"
                            maxlength="500"
                            placeholder="Optionnel"
                            bind:value={apptDeclineReason}
                          ></textarea>
                          <div class="btn-row">
                            <button type="button" class="cta small" on:click={() => declineOne(a)}>Confirmer non fait</button>
                            <button type="button" class="btn-sec small" on:click={cancelDeclineAppt}>Annuler</button>
                          </div>
                        {:else}
                          <div class="btn-row">
                            {#if !a.done}
                              {#if a.notDone}
                                <p class="micro muted appt-missed-inline">
                                  Raté — plus d’XP. Supprime le RDV si tu veux l’ôter de la liste.
                                </p>
                                <button type="button" class="btn-sec small" on:click={() => startEdit(a)}>Modifier</button>
                              {:else if localDateString() === a.date}
                                <button type="button" class="cta small" on:click={() => completeOne(a)}>Valider (XP)</button>
                                <button
                                  type="button"
                                  class="btn-sec small"
                                  on:click={() => {
                                    apptDeclineOpenId = a.id
                                    apptDeclineReason = ''
                                  }}
                                >Non fait</button>
                                <button type="button" class="btn-sec small" on:click={() => startEdit(a)}>Modifier</button>
                              {:else}
                                <span class="micro wait">Validation le jour J</span>
                                <button type="button" class="btn-sec small" on:click={() => startEdit(a)}>Modifier</button>
                              {/if}
                            {:else}
                              <button type="button" class="btn-sec small" on:click={() => startEdit(a)}>Modifier titre / notes</button>
                            {/if}
                            <button type="button" class="btn-del-txt" on:click={() => removeOne(a.id)}>Supprimer</button>
                          </div>
                        {/if}
                      </div>
                    {/if}
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        {/if}
      {:else}
        <div class="modal-section">
          <div class="micro" style="color:var(--gold)">NOUVEAU RDV POUR UN MEMBRE</div>
          {#if !$educatorAssociationGroupId}
            <p class="muted">Aucun groupe association.</p>
          {:else if !eduMembers.length}
            <p class="muted">Aucun apprenant — onglet Groupe.</p>
          {:else}
            <label class="field">
              <span>Membre</span>
              <select bind:value={eduMemberId}>
                {#each eduMembers as m}
                  <option value={m.id}>{m.username}</option>
                {/each}
              </select>
            </label>
            <label class="field">
              <span>Titre</span>
              <input type="text" maxlength="120" bind:value={eduTitle} placeholder="Ex. Point hebdo" />
            </label>
            <label class="field">
              <span>Notes</span>
              <textarea rows="2" bind:value={eduNotes} placeholder="Optionnel"></textarea>
            </label>
            <label class="field">
              <span>Heure</span>
              <input type="time" bind:value={eduTimeHm} />
            </label>
            <p class="xp-fixed-hint micro muted">+{APPT_XP_FIXED} XP à la validation (montant fixe)</p>
            <button type="button" class="cta" on:click={createForMember}>Assigner</button>
          {/if}
        </div>

        <div class="modal-section">
          <div class="micro muted">RDV CE JOUR ({managedForModal.length})</div>
          {#if !managedForModal.length}
            <p class="muted small">Aucun — crée-en un ci-dessus.</p>
          {:else}
            <ul class="appt-list">
              {#each managedForModal as r}
                <li class="appt-item">
                  {#if eduEditingId === r.id}
                    <div class="edit-form">
                      <label class="field">
                        <span>Membre (lecture)</span>
                        <input type="text" value={r.assignee?.username ?? ''} disabled />
                      </label>
                      <label class="field">
                        <span>Titre</span>
                        <input type="text" bind:value={eduEditTitle} maxlength="120" />
                      </label>
                      <label class="field">
                        <span>Notes</span>
                        <textarea rows="2" bind:value={eduEditNotes}></textarea>
                      </label>
                      <div class="row2">
                        <label class="field">
                          <span>Date</span>
                          <input type="date" bind:value={eduEditDate} disabled={eduEditingRow?.hasCompletion} />
                        </label>
                        <label class="field">
                          <span>Heure</span>
                          <input type="time" bind:value={eduEditTimeHm} disabled={eduEditingRow?.hasCompletion} />
                        </label>
                      </div>
                      <div class="btn-row">
                        <button
                          type="button"
                          class="btn-sec"
                          on:click={() => {
                            eduEditingId = null
                            eduEditingRow = null
                          }}>Annuler</button>
                        <button type="button" class="cta inline" on:click={saveEduEdit}>Enregistrer</button>
                      </div>
                    </div>
                  {:else}
                    <div class="appt-main">
                      <div class="appt-title">{r.title}</div>
                      <div class="appt-meta">
                        <Tag color="var(--cyan)">{r.assignee?.username ?? '?'}</Tag>
                        <Tag color="var(--accent)">{r.timeHm ?? '—'}</Tag>
                        <Tag color="var(--gold)">+{APPT_XP_FIXED} XP</Tag>
                        {#if r.hasCompletion}
                          <Tag color="var(--green)">Validé</Tag>
                        {/if}
                      </div>
                      {#if r.notes}
                        <p class="notes">{r.notes}</p>
                      {/if}
                      <div class="btn-row">
                        <button type="button" class="btn-sec small" on:click={() => startEduEdit(r)}>Modifier</button>
                        <button type="button" class="btn-del-txt" on:click={() => removeManaged(r.id)}>Supprimer</button>
                      </div>
                    </div>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/if}
    </Card>
  </div>
{/if}

<style>
  .view {
    display: flex;
    flex-direction: column;
    padding: 12px 0 16px;
    box-sizing: border-box;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    isolation: isolate;
  }
  .head {
    margin-bottom: 12px;
    padding: 6px clamp(15px, 3.5vw, 22px) 2px;
    box-sizing: border-box;
  }
  .sup {
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    letter-spacing: 2px;
    font-family: 'Rajdhani', sans-serif;
    color: var(--muted);
    margin-bottom: 4px;
  }
  .title {
    font-size: 1.35rem;
    font-weight: 800;
    margin: 0 0 8px;
    font-family: 'Rajdhani', sans-serif;
  }
  .sub {
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    color: var(--muted);
    line-height: 1.45;
    margin: 8px 0 0;
  }
  .year-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .year-row input {
    width: 100px;
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font-family: 'Rajdhani', sans-serif;
  }
  .micro {
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    color: var(--muted);
    letter-spacing: 2px;
    font-family: 'Rajdhani', sans-serif;
  }
  .muted {
    color: var(--muted);
  }
  .small {
    font-size: max(15px, 0.85rem);
  }
  .err {
    color: var(--red);
    font-size: max(15px, 0.9rem);
    margin-bottom: 10px;
  }
  .modal-err {
    margin-top: 8px;
  }
  .xp-fixed-hint {
    margin: -4px 0 10px;
    letter-spacing: 0.5px;
  }

  .gh-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }
  .legend-scale {
    flex: 1;
    height: 10px;
    border-radius: 4px;
    background: linear-gradient(
      90deg,
      var(--border),
      color-mix(in srgb, var(--accent) 35%, var(--bg)),
      color-mix(in srgb, var(--accent) 85%, var(--bg))
    );
  }

  /* Bandeau horizontal : une carte par mois, grille 7 cols type calendrier mural. */
  .months-strip-wrap {
    width: 100%;
    padding: clamp(15px, 2vmin, 18px) 0 clamp(12px, 2.5vmin, 20px);
    box-sizing: border-box;
    min-height: 0;
  }
  .months-strip-wrap.dim {
    opacity: 0.55;
  }
  .year-cal-scroll {
    display: flex;
    flex-wrap: nowrap;
    align-items: flex-start;
    gap: clamp(14px, 3vmin, 22px);
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: clamp(14px, 2.8vmin, 20px);
    margin: 0;
    scrollbar-width: thin;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
    scroll-behavior: smooth;
    scroll-snap-type: x proximity;
    scroll-padding-inline: clamp(8px, 2vw, 14px);
  }
  .month-card {
    flex: 0 0 auto;
    width: clamp(268px, 78vw, 328px);
    scroll-snap-align: start;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--bg) 90%, transparent);
    padding: 12px 10px 14px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .month-card-title {
    margin: 0;
    padding-bottom: 6px;
    border-bottom: 1px solid color-mix(in srgb, var(--accent) 38%, var(--border));
    font-family: 'Rajdhani', sans-serif;
    font-size: clamp(1.02rem, 4vmin, 1.18rem);
    font-weight: 800;
    text-transform: capitalize;
    letter-spacing: 0.05em;
    color: var(--accent-light);
    text-align: center;
  }
  .month-dow {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    text-align: center;
    font-size: clamp(12px, 3.2vmin, 14px);
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    color: var(--muted);
  }
  .month-cell-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 5px;
  }
  .month-cell {
    aspect-ratio: 1;
    width: 100%;
    min-width: 0;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      transform 0.1s,
      box-shadow 0.1s;
    box-sizing: border-box;
  }
  .month-cell-num {
    font-size: clamp(12px, 3vmin, 14px);
    font-family: 'Rajdhani', sans-serif;
    font-weight: 800;
    pointer-events: none;
    color: color-mix(in srgb, var(--text) 78%, transparent);
  }
  /* Cases hors mois : vides, désactivées (pas de chiffre, pas de clic). */
  .month-cell:disabled,
  .month-cell.omc:disabled {
    cursor: default;
    opacity: 1;
    background: transparent !important;
    border-color: transparent;
    box-shadow: none !important;
    transform: none;
  }
  .month-cell.omc:disabled:hover {
    transform: none;
    box-shadow: none !important;
    z-index: auto;
  }
  .month-cell.has-appt .month-cell-num {
    color: #fff;
    text-shadow:
      0 1px 2px rgba(0, 0, 0, 0.4),
      0 0 1px rgba(0, 0, 0, 0.55);
  }
  .month-cell.today .month-cell-num {
    color: var(--cyan);
    font-weight: 900;
    text-shadow: none;
  }
  .month-cell:not(:disabled):hover {
    transform: scale(1.05);
    box-shadow: 0 0 0 1px var(--accent);
    z-index: 1;
  }
  .month-cell.today {
    z-index: 2;
    box-shadow:
      0 0 6px color-mix(in srgb, var(--cyan) 82%, transparent),
      0 0 14px color-mix(in srgb, var(--accent) 25%, transparent),
      inset 0 0 0 1px color-mix(in srgb, #fff 20%, transparent);
  }
  .month-cell.today:hover {
    box-shadow:
      0 0 10px color-mix(in srgb, var(--cyan) 55%, transparent),
      0 0 18px color-mix(in srgb, var(--accent) 28%, transparent),
      inset 0 0 0 1px color-mix(in srgb, #fff 25%, transparent);
  }
  .month-cell.has-appt {
    border-color: color-mix(in srgb, var(--accent) 52%, var(--border));
  }

  .compact-list {
    list-style: none;
    padding: 0;
    margin: 0;
    max-height: 200px;
    overflow: auto;
  }
  .compact-list li {
    border-bottom: 1px solid var(--border);
  }
  .link-row {
    width: 100%;
    display: grid;
    grid-template-columns: 88px 1fr auto;
    gap: 8px;
    align-items: center;
    padding: 8px 4px;
    background: none;
    border: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    border-radius: 8px;
  }
  .link-row:hover {
    background: var(--border)33;
  }
  .r-date {
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    font-family: 'Rajdhani', sans-serif;
    color: var(--muted);
  }
  .r-title {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .r-who {
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    color: var(--cyan);
  }

  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    z-index: 200;
    backdrop-filter: blur(4px);
  }
  .modal-wrap {
    position: fixed;
    inset: 0;
    z-index: 201;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    pointer-events: none;
  }
  .modal-wrap :global(.card) {
    pointer-events: auto;
  }
  .modal-x {
    position: absolute;
    top: 10px;
    right: 12px;
    width: 36px;
    height: 36px;
    border: none;
    background: transparent;
    color: var(--muted);
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    border-radius: 8px;
  }
  .modal-x:hover {
    color: var(--text);
    background: var(--border)44;
  }
  .modal-h2 {
    font-size: 1.05rem;
    font-weight: 800;
    margin: 0 32px 4px 0;
    font-family: 'Rajdhani', sans-serif;
    text-transform: capitalize;
  }
  .modal-ymd {
    margin: 0 0 14px;
  }
  .modal-section {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
  }
  .modal-section:first-of-type {
    border-top: none;
    padding-top: 0;
    margin-top: 0;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 10px;
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
  }
  .field span {
    color: var(--muted);
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 1px;
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
  }
  .field input,
  .field select,
  .field textarea {
    width: 100%;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font-family: 'Exo 2', sans-serif;
  }
  .row2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .cta {
    width: 100%;
    margin-top: 4px;
    padding: 11px 16px;
    border: none;
    border-radius: 12px;
    background: var(--grad-cta);
    color: #fff;
    font-weight: 800;
    font-size: max(15px, 0.9rem);
    cursor: pointer;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.5px;
    box-shadow: 0 0 16px var(--accent)44;
  }
  .cta.small,
  .cta.inline {
    width: auto;
    padding: 8px 14px;
    font-size: max(15px, 0.82rem);
    margin-top: 0;
  }
  .btn-sec {
    padding: 8px 14px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    cursor: pointer;
  }
  .btn-sec.small {
    padding: 6px 12px;
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
  }
  .btn-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-top: 10px;
  }
  .btn-del-txt {
    background: none;
    border: none;
    color: var(--red);
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    cursor: pointer;
    text-decoration: underline;
    font-family: 'Rajdhani', sans-serif;
  }
  .appt-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .appt-item {
    padding: 12px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 12px;
  }
  .appt-title {
    font-weight: 700;
    font-size: 0.95rem;
    margin-bottom: 6px;
  }
  .appt-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .notes {
    margin-top: 8px;
    font-size: max(15px, 0.85rem);
    color: var(--muted);
    line-height: 1.45;
  }
  .wait {
    color: var(--muted);
  }
  .appt-missed-inline {
    width: 100%;
    flex-basis: 100%;
    margin: 0 0 6px;
    line-height: 1.35;
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
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    resize: vertical;
    min-height: 44px;
    font-family: inherit;
  }
</style>
