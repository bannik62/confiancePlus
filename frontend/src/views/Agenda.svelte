<script>
  import { onMount } from 'svelte'
  import { get } from 'svelte/store'
  import Card from '../components/ui/Card.svelte'
  import Tag from '../components/ui/Tag.svelte'
  import { localDateString } from '../lib/dateLocal.js'
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
    ? heatMapFromManaged(managedRows, year)
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

  /**
   * Bandeaux mois : une cellule grille par mois, largeur = nombre de semaines du mois (noms complets, plus de "Ja..").
   * @param {number} y
   * @param {{ ymd: string, inRange: boolean, d: Date }[][]} weeks
   */
  const computeMonthBands = (y, weeks) => {
    const bands = []
    for (let m = 0; m < 12; m++) {
      const mm = String(m + 1).padStart(2, '0')
      const ymdFirst = `${y}-${mm}-01`
      const startCol = weeks.findIndex((week) => week.some((d) => d.inRange && d.ymd === ymdFirst))
      if (startCol < 0) continue
      let endCol
      if (m === 11) {
        endCol = weeks.length - 1
      } else {
        const mmNext = String(m + 2).padStart(2, '0')
        const ymdNext = `${y}-${mmNext}-01`
        const nextCol = weeks.findIndex((week) => week.some((d) => d.inRange && d.ymd === ymdNext))
        endCol = nextCol > 0 ? nextCol - 1 : weeks.length - 1
      }
      const label = new Date(y, m, 1).toLocaleDateString('fr-FR', { month: 'long' })
      bands.push({
        label,
        gridColumn: `${startCol + 1} / ${endCol + 2}`,
        key: `m-${m}`,
      })
    }
    return bands
  }

  /**
   * Grille type GitHub : colonnes = semaines (lun→dim), dates locales.
   * @param {number} y
   */
  const buildYearGrid = (y) => {
    const jan1 = new Date(y, 0, 1)
    const dec31 = new Date(y, 11, 31)
    const mondayOf = (dt) => {
      const d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
      const dow = (d.getDay() + 6) % 7
      d.setDate(d.getDate() - dow)
      return d
    }
    const firstMonday = mondayOf(jan1)
    const lastMonday = mondayOf(dec31)
    const weeks = []
    for (let cursor = new Date(firstMonday); cursor <= lastMonday; cursor.setDate(cursor.getDate() + 7)) {
      const days = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(cursor)
        d.setDate(cursor.getDate() + i)
        const inRange = d >= jan1 && d <= dec31
        days.push({ ymd: localDateString(d), inRange, d })
      }
      weeks.push(days)
    }
    const weekMetas = weeks.map((week) => {
      const firstOfMonth = week.find((x) => x.inRange && x.d.getDate() === 1)
      const monthStart = !!firstOfMonth
      return { monthStart }
    })
    const monthBands = computeMonthBands(y, weeks)
    return { weeks, weekMetas, monthBands, weekCount: weeks.length }
  }

  $: grid = buildYearGrid(year)
  $: todayYmd = localDateString()

  const loadCalendarStudent = async () => {
    loading = true
    err = ''
    try {
      const cal = await appointmentsApi.calendar(year)
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
      const rows = await appointmentsApi.managed(gid, year)
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
    year
    void loadEducator()
  } else {
    year
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

  const onCellClick = (day) => {
    if (!day.inRange) return
    if ($isEducatorAssociation) openEducatorDayModal(day.ymd)
    else openDayModal(day.ymd)
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
      Chaque colonne = une semaine (lun → dim). <strong>Fais défiler horizontalement</strong> pour parcourir l’année — les cases gardent une taille lisible. Touche un jour pour gérer les RDV.
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

    <div class="github-grid" class:dim={loading}>
      <div class="dow-col" aria-hidden="true">
        {#each DOW_LETTERS as L}
          <span class="dow">{L}</span>
        {/each}
      </div>
      <div class="gh-scroll" style="--week-count: {grid.weekCount}">
        <div
          class="gh-months"
          style="grid-template-columns: repeat({grid.weekCount}, var(--week-col-min));"
        >
          {#each grid.monthBands as band (band.key)}
            <div class="month-band" style="grid-column: {band.gridColumn};">
              <span class="month-band__txt">{band.label}</span>
            </div>
          {/each}
        </div>
        <div
          class="gh-weeks"
          style="grid-template-columns: repeat({grid.weekCount}, var(--week-col-min));"
        >
          {#each grid.weeks as week, wi}
            <div class="week-col" class:month-start={grid.weekMetas[wi]?.monthStart}>
              {#each week as day}
                <button
                  type="button"
                  class="gh-cell"
                  class:pad={!day.inRange}
                  class:today={day.inRange && day.ymd === todayYmd}
                  class:has-appt={day.inRange && (heatByDate[day.ymd]?.scheduled ?? 0) > 0}
                  disabled={!day.inRange}
                  style={day.inRange
                    ? `background:${cellColor(heatByDate[day.ymd]?.intensity ?? 0)}`
                    : ''}
                  title={day.inRange
                    ? `${day.ymd} — ${heatByDate[day.ymd]?.scheduled ?? 0} RDV`
                    : ''}
                  on:click={() => onCellClick(day)}
                >
                  {#if day.inRange}
                    <span class="cell-num">{day.d.getDate()}</span>
                  {/if}
                </button>
              {/each}
            </div>
          {/each}
        </div>
      </div>
    </div>
  </Card>

  {#if $isEducatorAssociation && managedRows.length > 0}
    <Card style="margin-top:12px">
      <div class="micro muted" style="margin-bottom:8px">TOUS LES RDV ({year})</div>
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
    padding-bottom: 12px;
  }
  .head {
    margin-bottom: 12px;
  }
  .sup {
    font-size: 10px;
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
    font-size: 12px;
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
    font-size: 10px;
    color: var(--muted);
    letter-spacing: 2px;
    font-family: 'Rajdhani', sans-serif;
  }
  .muted {
    color: var(--muted);
  }
  .small {
    font-size: 0.85rem;
  }
  .err {
    color: var(--red);
    font-size: 0.9rem;
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

  .github-grid {
    /* Colonnes semaine = largeur fixe → scroll horizontal (pas d’écrasement sur mobile). */
    --week-col-min: 52px;
    --month-row-h: clamp(2.2rem, 6vmin, 2.85rem);
    --cell-gap: 6px;
    display: flex;
    gap: clamp(8px, 2.2vmin, 14px);
    align-items: stretch;
    width: 100%;
    min-height: 0;
    padding: clamp(8px, 2vmin, 18px) 0 clamp(10px, 2.5vmin, 22px);
    box-sizing: border-box;
  }
  .github-grid.dim {
    opacity: 0.55;
  }
  .dow-col {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: var(--cell-gap);
    padding-top: var(--month-row-h);
    flex-shrink: 0;
    width: clamp(22px, 6vmin, 32px);
  }
  .dow {
    font-size: clamp(10px, 2.6vmin, 13px);
    color: var(--muted);
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    text-align: center;
    line-height: 1;
    height: var(--week-col-min);
    min-height: var(--week-col-min);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .gh-scroll {
    --week-col-min: 52px;
    flex: 1;
    min-width: 0;
    width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
    padding-bottom: clamp(8px, 2vmin, 14px);
    scrollbar-width: thin;
  }
  .gh-months {
    display: grid;
    width: max-content;
    min-width: calc(
      var(--week-count, 53) * var(--week-col-min) + (var(--week-count, 53) - 1) * var(--cell-gap)
    );
    box-sizing: border-box;
    gap: 0;
    column-gap: var(--cell-gap);
    row-gap: 0;
    margin-bottom: clamp(10px, 2.4vmin, 16px);
    min-height: var(--month-row-h);
    align-items: stretch;
  }
  .month-band {
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: clamp(6px, 1.6vmin, 10px) clamp(4px, 1vmin, 8px);
    border-bottom: 2px solid color-mix(in srgb, var(--accent) 35%, var(--border));
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--accent) 12%, transparent),
      color-mix(in srgb, var(--accent) 4%, transparent)
    );
    border-radius: 10px 10px 0 0;
    box-sizing: border-box;
  }
  .month-band__txt {
    font-size: clamp(11px, 3vmin, 15px);
    font-weight: 800;
    font-family: 'Rajdhani', sans-serif;
    color: var(--accent-light);
    text-transform: capitalize;
    text-align: center;
    line-height: 1.15;
    width: 100%;
    hyphens: none;
    word-break: break-word;
  }
  .gh-weeks {
    display: grid;
    width: max-content;
    min-width: calc(
      var(--week-count, 53) * var(--week-col-min) + (var(--week-count, 53) - 1) * var(--cell-gap)
    );
    box-sizing: border-box;
    gap: var(--cell-gap);
    align-items: start;
  }
  .week-col {
    display: flex;
    flex-direction: column;
    gap: var(--cell-gap);
    width: var(--week-col-min);
    min-width: var(--week-col-min);
    border-radius: 4px;
  }
  .week-col.month-start {
    box-shadow: inset 3px 0 0 color-mix(in srgb, var(--accent) 78%, transparent);
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--accent) 11%, transparent),
      transparent 68%
    );
    border-radius: 6px;
  }
  .gh-cell {
    width: 100%;
    aspect-ratio: 1;
    height: auto;
    min-height: var(--week-col-min);
    border-radius: clamp(3px, 1vw, 6px);
    border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
    padding: 0;
    cursor: pointer;
    flex-shrink: 0;
    transition: transform 0.1s, box-shadow 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    box-sizing: border-box;
  }
  .cell-num {
    font-size: clamp(8px, 2.4vmin, 12px);
    font-weight: 800;
    font-family: 'Rajdhani', sans-serif;
    color: color-mix(in srgb, var(--text) 72%, transparent);
    line-height: 1;
    pointer-events: none;
    user-select: none;
    opacity: 0.92;
  }
  .gh-cell.has-appt .cell-num {
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
  }
  .gh-cell.today .cell-num {
    color: var(--cyan);
    text-shadow: none;
  }
  .gh-cell:hover:not(:disabled) {
    transform: scale(1.08);
    box-shadow: 0 0 0 1px var(--accent);
    z-index: 1;
  }
  .gh-cell.pad {
    background: transparent !important;
    border-color: transparent;
    cursor: default;
    pointer-events: none;
    opacity: 0.2;
    min-height: var(--week-col-min);
  }
  .gh-cell.today {
    box-shadow: 0 0 0 2px var(--cyan);
  }
  .gh-cell.has-appt {
    border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
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
    font-size: 11px;
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
    font-size: 11px;
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
    font-size: 12px;
  }
  .field span {
    color: var(--muted);
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 1px;
    font-size: 10px;
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
    font-size: 0.9rem;
    cursor: pointer;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.5px;
    box-shadow: 0 0 16px var(--accent)44;
  }
  .cta.small,
  .cta.inline {
    width: auto;
    padding: 8px 14px;
    font-size: 0.82rem;
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
    font-size: 12px;
    cursor: pointer;
  }
  .btn-sec.small {
    padding: 6px 12px;
    font-size: 11px;
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
    font-size: 12px;
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
    font-size: 0.85rem;
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
    font-size: 12px;
    resize: vertical;
    min-height: 44px;
    font-family: inherit;
  }
</style>
