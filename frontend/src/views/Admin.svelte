<script>
  import { onMount } from 'svelte'
  import { authStore, clearAuth } from '../stores/auth.js'
  import { adminApi } from '../api/admin.js'
  import Card from '../components/ui/Card.svelte'

  let users = []
  let total = 0
  let page = 0
  let limit = 25
  let loading = true
  let err = ''

  let enc = ''
  let maint = ''
  let fel = ''
  let msgLoading = true
  let msgErr = ''
  let msgOk = ''

  let auditItems = []
  let groups = []
  let auditLoading = true

  let dailyTemplates = []
  let dailyErr = ''
  let dailyOk = ''
  let dailyLoading = true

  let pushHour = 14
  let pushErr = ''
  let pushOk = ''
  let pushSaveBusy = false
  let pushTestBusy = false
  let pushTestMessage = ''

  /** E-mail (Gmail serveur) */
  let emailMode = 'all'
  let emailUserId = ''
  let emailSubject = ''
  let emailBody = ''
  let emailErr = ''
  let emailOk = ''
  let emailBusy = false
  let emailSaveBusy = false
  let emailRecipients = []
  let emailRecipLoading = true

  const auditActionLabel = (code) =>
    ({
      USER_DELETE: 'Suppression compte',
      USER_SUSPEND: 'Suspension compte',
      USER_UNSUSPEND: 'Réactivation compte',
      DAY_MESSAGES_REPLACE: 'Messages du jour (remplacement)',
      DAILY_HABIT_TEMPLATES_REPLACE: 'Habitudes du jour (pool)',
      PUSH_SETTINGS_UPDATE: 'Notifications — heure rappel par défaut',
      PUSH_TEST_GIFT: 'Notifications — test push (message admin)',
      ADMIN_EMAIL_DEFAULTS_SAVE: 'E-mail — modèle par défaut (titre + corps)',
      ADMIN_EMAIL_SEND: 'E-mail — envoi (tous ou un utilisateur)',
    }[code] ?? code)

  const loadUsers = async () => {
    err = ''
    try {
      const res = await adminApi.users({ page, limit })
      users = res.users ?? []
      total = res.total ?? 0
    } catch (e) {
      err = e.message || 'Erreur chargement utilisateurs'
      users = []
    }
  }

  const loadAudit = async () => {
    try {
      const res = await adminApi.audit({ limit: 40 })
      auditItems = res.items ?? []
    } catch {
      auditItems = []
    }
  }

  const loadGroups = async () => {
    try {
      const res = await adminApi.groups()
      groups = res.groups ?? []
    } catch {
      groups = []
    }
  }

  const loadMessages = async () => {
    msgErr = ''
    msgOk = ''
    try {
      const data = await adminApi.getDayMessages()
      enc = (data.encouragement?.phrases ?? []).join('\n')
      maint = (data.maintien?.phrases ?? []).join('\n')
      fel = (data.felicitation?.phrases ?? []).join('\n')
    } catch (e) {
      msgErr = e.message || 'Erreur chargement messages'
    }
  }

  const loadDailyTemplates = async () => {
    dailyErr = ''
    try {
      const r = await adminApi.getDailyHabitTemplates()
      dailyTemplates = (r.templates ?? []).map((t) => ({ ...t }))
    } catch (e) {
      dailyErr = e.message || 'Erreur chargement pool daily'
      dailyTemplates = []
    }
  }

  const saveDailyTemplates = async () => {
    dailyErr = ''
    dailyOk = ''
    dailyLoading = true
    try {
      await adminApi.putDailyHabitTemplates({
        templates: dailyTemplates.map((t, i) => ({
          id: t.id,
          title: String(t.title ?? '').trim(),
          icon: String(t.icon ?? '').trim(),
          xpTotal: Number(t.xpTotal) || 15,
          sortOrder: t.sortOrder ?? i,
          isActive: t.isActive !== false,
        })),
      })
      dailyOk = 'Pool « habitude du jour » enregistré.'
      await loadDailyTemplates()
      await loadAudit()
    } catch (e) {
      dailyErr = e.message || 'Erreur enregistrement'
    } finally {
      dailyLoading = false
    }
  }

  const addDailyTemplateRow = () => {
    dailyTemplates = [
      ...dailyTemplates,
      { title: '', icon: '📝', xpTotal: 15, sortOrder: dailyTemplates.length, isActive: true },
    ]
  }

  const removeDailyTemplateRow = (idx) => {
    dailyTemplates = dailyTemplates.filter((_, i) => i !== idx)
  }

  onMount(async () => {
    loading = true
    auditLoading = true
    await Promise.all([
      loadUsers(),
      loadMessages(),
      loadDailyTemplates(),
      loadAudit(),
      loadGroups(),
      loadPushSettings(),
      loadEmailDefaults(),
      loadEmailRecipients(),
    ])
    loading = false
    auditLoading = false
    msgLoading = false
    dailyLoading = false
  })

  const nextPage = async () => {
    if ((page + 1) * limit >= total) return
    page += 1
    loading = true
    await loadUsers()
    loading = false
  }

  const prevPage = async () => {
    if (page <= 0) return
    page -= 1
    loading = true
    await loadUsers()
    loading = false
  }

  const linesToPhrases = (t) =>
    String(t)
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)

  const saveMessages = async () => {
    msgErr = ''
    msgOk = ''
    msgLoading = true
    try {
      await adminApi.putDayMessages({
        encouragement: { phrases: linesToPhrases(enc) },
        maintien: { phrases: linesToPhrases(maint) },
        felicitation: { phrases: linesToPhrases(fel) },
      })
      msgOk = 'Messages enregistrés.'
      await loadAudit()
    } catch (e) {
      msgErr = e.message || 'Erreur enregistrement'
    } finally {
      msgLoading = false
    }
  }

  const removeUser = async (u) => {
    if (!confirm(`Supprimer définitivement le compte « ${u.username} » (${u.email ?? 'sans e-mail'}) ? Données associées supprimées (RGPD).`))
      return
    err = ''
    try {
      await adminApi.deleteUser(u.id)
      await Promise.all([loadUsers(), loadAudit()])
    } catch (e) {
      err = e.message || 'Suppression impossible'
    }
  }

  const toggleSuspend = async (u) => {
    err = ''
    try {
      await adminApi.patchUserSuspension(u.id, !u.isSuspended)
      await Promise.all([loadUsers(), loadAudit()])
    } catch (e) {
      err = e.message || 'Action impossible'
    }
  }

  const loadPushSettings = async () => {
    pushErr = ''
    try {
      const r = await adminApi.getPushSettings()
      pushHour = r.defaultReminderHour ?? 14
    } catch (e) {
      pushErr = e.message || 'Chargement réglages push impossible'
    }
  }

  const savePushSettings = async () => {
    pushErr = ''
    pushOk = ''
    pushSaveBusy = true
    try {
      const h = Math.min(23, Math.max(0, parseInt(String(pushHour), 10)))
      await adminApi.putPushSettings({ defaultReminderHour: h })
      pushOk = 'Heure de rappel par défaut enregistrée.'
      await loadAudit()
    } catch (e) {
      pushErr = e.message || 'Enregistrement impossible'
    } finally {
      pushSaveBusy = false
    }
  }

  const loadEmailDefaults = async () => {
    emailErr = ''
    try {
      const d = await adminApi.getEmailDefaults()
      emailSubject = d.subject ?? ''
      emailBody = d.body ?? ''
    } catch (e) {
      emailErr = e.message || 'Chargement modèle e-mail impossible'
    }
  }

  const loadEmailRecipients = async () => {
    try {
      const r = await adminApi.getEmailRecipients()
      emailRecipients = r.users ?? []
    } catch {
      emailRecipients = []
    } finally {
      emailRecipLoading = false
    }
  }

  const saveEmailDefaults = async () => {
    emailErr = ''
    emailOk = ''
    emailSaveBusy = true
    try {
      await adminApi.putEmailDefaults({
        subject: String(emailSubject ?? ''),
        body: String(emailBody ?? ''),
      })
      emailOk = 'Modèle enregistré (titre + corps par défaut).'
      await loadAudit()
    } catch (e) {
      emailErr = e.message || 'Enregistrement impossible'
    } finally {
      emailSaveBusy = false
    }
  }

  const sendAdminEmail = async () => {
    emailErr = ''
    emailOk = ''
    const subj = String(emailSubject ?? '').trim()
    const bod = String(emailBody ?? '').trim()
    if (!subj || !bod) {
      emailErr = 'Renseigne un titre et un corps de message.'
      return
    }
    if (emailMode === 'one' && !emailUserId) {
      emailErr = 'Choisis un utilisateur dans la liste.'
      return
    }
    const confirmMsg =
      emailMode === 'all'
        ? 'Envoyer cet e-mail à tous les comptes ayant une adresse e-mail (non suspendus) ?'
        : 'Envoyer cet e-mail à cet utilisateur ?'
    if (!confirm(confirmMsg)) return

    emailBusy = true
    try {
      const r = await adminApi.postEmailSend({
        mode: emailMode,
        ...(emailMode === 'one' ? { userId: emailUserId } : {}),
        subject: subj,
        body: bod,
      })
      const sent = r?.sent ?? 0
      const total = r?.total ?? sent
      const failed = Array.isArray(r?.failed) ? r.failed : []
      emailOk =
        failed.length === 0
          ? `Envoyé : ${sent} / ${total}.`
          : `Envoyé : ${sent} / ${total}. Échecs : ${failed.length} (voir journal).`
      await loadAudit()
    } catch (e) {
      emailErr = e.message || 'Envoi impossible'
    } finally {
      emailBusy = false
    }
  }

  const sendPushTest = async () => {
    pushErr = ''
    pushOk = ''
    const msg = String(pushTestMessage ?? '').trim()
    if (!msg) {
      pushErr = 'Saisis un message pour la notification.'
      return
    }
    pushTestBusy = true
    try {
      const r = await adminApi.postPushTest({ message: msg })
      const n = typeof r?.sent === 'number' ? r.sent : 0
      const t = typeof r?.total === 'number' ? r.total : n
      pushOk =
        n > 0
          ? `Notification envoyée à ${n} appareil(s) sur ${t}.`
          : 'Notification envoyée.'
      await loadAudit()
    } catch (e) {
      pushErr = e.message || 'Envoi test impossible'
    } finally {
      pushTestBusy = false
    }
  }
</script>

<div class="admin">
  <header class="head">
    <div>
      <div class="sup">ADMINISTRATION</div>
      <h1>Tableau de bord</h1>
    </div>
    <button type="button" class="btn-out" on:click={() => clearAuth()}>Déconnexion</button>
  </header>

  {#if err}<p class="err">{err}</p>{/if}

  <Card style="margin-bottom:14px">
    <div class="sup muted">UTILISATEURS — {total} compte(s)</div>
    {#if loading}
      <p class="muted">Chargement…</p>
    {:else if !users.length}
      <p class="muted">Aucun utilisateur sur cette page.</p>
    {:else}
      <div class="table">
        {#each users as u}
          <div class="row">
            <div class="cell grow">
              <div class="uname">{u.username}</div>
              <div class="mail">{u.email ?? '—'}</div>
              <div class="tags">
                {#if u.isAdmin}<span class="tag">admin</span>{/if}
                {#if u.isPending}<span class="tag pending">pending</span>{/if}
                {#if u.isSuspended}<span class="tag susp">suspendu</span>{/if}
                {#if (u.pushSubscriptionCount ?? 0) > 0}
                  <span class="tag push" title="Web Push enregistré pour ce compte">
                    abonné aux notifications{#if u.pushSubscriptionCount > 1} ({u.pushSubscriptionCount} appareils){/if}
                  </span>
                {/if}
              </div>
              <div class="dates">
                <span>Créé : {new Date(u.createdAt).toLocaleString('fr-FR')}</span>
                <span>Dernière connexion : {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('fr-FR') : '—'}</span>
              </div>
            </div>
            <div class="cell actions">
              {#if u.id !== $authStore.user?.id}
                {#if u.isSuspended}
                  <button type="button" class="btn-susp" on:click={() => toggleSuspend(u)}>Réactiver</button>
                {:else}
                  <button type="button" class="btn-susp" on:click={() => toggleSuspend(u)}>Suspendre</button>
                {/if}
              {/if}
              {#if !(u.isAdmin && u.id === $authStore.user?.id)}
                <button type="button" class="btn-del" on:click={() => removeUser(u)}>Supprimer</button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
      <div class="pager">
        <button type="button" disabled={page === 0} on:click={prevPage}>Précédent</button>
        <span class="muted">Page {page + 1}</span>
        <button type="button" disabled={(page + 1) * limit >= total} on:click={nextPage}>Suivant</button>
      </div>
    {/if}
  </Card>

  <Card style="margin-bottom:14px">
    <div class="sup muted">NOTIFICATIONS PUSH</div>
    {#if pushErr}<p class="err">{pushErr}</p>{/if}
    {#if pushOk}<p class="ok">{pushOk}</p>{/if}
    <p class="muted" style="margin:8px 0 10px;font-size:0.85rem">
      Heure locale (fuseau Europe/Paris par défaut côté utilisateur) du rappel « habitudes du jour ». Les utilisateurs
      sans abonnement push ou déjà à jour ne reçoivent rien. Le bouton test envoie à <strong>tous</strong> les appareils
      abonnés en base (pas seulement le compte admin).
    </p>
    <div class="push-row" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:10px">
      <label>
        Heure par défaut (0–23)
        <input type="number" min="0" max="23" bind:value={pushHour} style="width:4rem;margin-left:6px" />
      </label>
      <button type="button" class="btn-save" disabled={pushSaveBusy} on:click={savePushSettings}>
        {pushSaveBusy ? '…' : 'Enregistrer'}
      </button>
    </div>
    <div class="push-test-block">
      <label class="push-test-label" for="push-test-msg">Message de la notification</label>
      <div class="push-test-row">
        <input
          id="push-test-msg"
          type="text"
          class="push-test-input"
          maxlength="200"
          placeholder="Ex. Rappel : pense à valider tes habitudes !"
          bind:value={pushTestMessage}
          disabled={pushTestBusy}
        />
        <button type="button" class="btn-secondary" disabled={pushTestBusy} on:click={sendPushTest}>
          {pushTestBusy ? '…' : 'Envoyer'}
        </button>
      </div>
      <p class="muted push-test-hint">Max. 200 caractères — envoyé à tous les appareils abonnés.</p>
    </div>
  </Card>

  <Card style="margin-bottom:14px">
    <div class="sup muted">E-MAIL (Gmail — serveur)</div>
    {#if emailErr}<p class="err">{emailErr}</p>{/if}
    {#if emailOk}<p class="ok">{emailOk}</p>{/if}
    <p class="muted" style="margin:8px 0 10px;font-size:0.85rem">
      Même configuration que sur le VPS : <code>GMAIL_USER</code> + <code>GMAIL_APP_PASSWORD</code>. Tu peux
      enregistrer un <strong>modèle</strong> (titre + corps) puis envoyer à <strong>tout le monde</strong> (comptes avec
      e-mail, non suspendus) ou à <strong>un seul</strong> utilisateur. Placeholders :
      <code>{'{{username}}'}</code> et <code>{'{{email}}'}</code>.
    </p>
    <div class="email-mode" style="margin-bottom:10px">
      <label class="email-radio"
        ><input type="radio" name="emode" value="all" bind:group={emailMode} /> Tous (avec e-mail)</label
      >
      <label class="email-radio"
        ><input type="radio" name="emode" value="one" bind:group={emailMode} /> Un utilisateur</label
      >
    </div>
    {#if emailMode === 'one'}
      <div style="margin-bottom:10px">
        {#if emailRecipLoading}
          <p class="muted">Chargement des destinataires…</p>
        {:else}
          <label>
            Destinataire
            <select class="email-select" bind:value={emailUserId}>
              <option value="">— Choisir —</option>
              {#each emailRecipients as r}
                <option value={r.id}>{r.username} · {r.email}</option>
              {/each}
            </select>
          </label>
        {/if}
      </div>
    {/if}
    <label class="email-lbl">
      <span>Titre (objet)</span>
      <input type="text" class="email-subj" maxlength="500" bind:value={emailSubject} placeholder="[Confiance+] …" />
    </label>
    <label class="email-lbl">
      <span>Corps du message</span>
      <textarea class="email-body" rows="8" bind:value={emailBody} spellcheck="true"></textarea>
    </label>
    <div class="email-actions" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px">
      <button type="button" class="btn-secondary" disabled={emailSaveBusy} on:click={saveEmailDefaults}>
        {emailSaveBusy ? '…' : 'Enregistrer le modèle'}
      </button>
      <button type="button" class="btn-save" disabled={emailBusy} on:click={sendAdminEmail}>
        {emailBusy ? 'Envoi…' : 'Envoyer'}
      </button>
    </div>
  </Card>

  <Card style="margin-bottom:14px">
    <div class="sup muted">GROUPES (lecture seule)</div>
    {#if !groups.length}
      <p class="muted" style="margin-top:8px">Aucun groupe.</p>
    {:else}
      <div class="groups">
        {#each groups as g}
          <div class="grow">
            <span class="uname">{g.name}</span>
            <span class="gmeta">{g.type} · {g.memberCount} membre(s) · code {g.inviteCode}</span>
          </div>
        {/each}
      </div>
    {/if}
  </Card>

  <Card style="margin-bottom:14px">
    <div class="sup muted">HABITUDE DU JOUR — pool (tirage aléatoire, pas 2× le même modèle en 7 jours)</div>
    {#if dailyErr}<p class="err">{dailyErr}</p>{/if}
    {#if dailyOk}<p class="ok">{dailyOk}</p>{/if}
    {#if dailyLoading && !dailyTemplates.length}
      <p class="muted" style="margin-top:8px">Chargement…</p>
    {:else}
      <p class="muted" style="margin:8px 0 10px;font-size:0.85rem">
        Emoji + titre + XP totale (ex. 15 = +10 habituel +5 bonus). Les entrées retirées de la liste sont désactivées côté serveur.
      </p>
      <div class="daily-grid">
        {#each dailyTemplates as t, idx}
          <div class="daily-row">
            <input class="daily-ico" bind:value={t.icon} maxlength="16" aria-label="Icône" placeholder="🙂" />
            <input class="daily-title" bind:value={t.title} maxlength="120" placeholder="Intitulé" />
            <input
              class="daily-xp"
              type="number"
              min="5"
              max="100"
              bind:value={t.xpTotal}
              aria-label="XP totale"
            />
            <label class="daily-act"
              ><input type="checkbox" bind:checked={t.isActive} /> actif</label
            >
            <button type="button" class="btn-del" on:click={() => removeDailyTemplateRow(idx)}>Retirer</button>
          </div>
        {/each}
      </div>
      <div class="daily-actions">
        <button type="button" class="btn-secondary" on:click={addDailyTemplateRow}>+ Ligne</button>
        <button type="button" class="btn-save" disabled={dailyLoading} on:click={saveDailyTemplates}>
          {dailyLoading ? 'Enregistrement…' : 'Enregistrer le pool'}
        </button>
      </div>
    {/if}
  </Card>

  <Card style="margin-bottom:14px">
    <div class="sup muted">JOURNAL ADMIN (récent)</div>
    {#if auditLoading}
      <p class="muted" style="margin-top:8px">Chargement…</p>
    {:else if !auditItems.length}
      <p class="muted" style="margin-top:8px">Aucune entrée.</p>
    {:else}
      <ul class="audit">
        {#each auditItems as a}
          <li>
            <time datetime={a.createdAt}>{new Date(a.createdAt).toLocaleString('fr-FR')}</time>
            <span class="aud-act">{auditActionLabel(a.action)}</span>
            <span class="aud-meta">
              acteur {a.actorId.slice(0, 8)}…
              {#if a.targetId} · cible {a.targetId.slice(0, 8)}…{/if}
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  </Card>

  <Card>
    <div class="sup muted">MESSAGES DU JOUR (une phrase par ligne)</div>
    {#if msgErr}<p class="err">{msgErr}</p>{/if}
    {#if msgOk}<p class="ok">{msgOk}</p>{/if}
    <div class="grid-msg">
      <label>
        <span class="lbl">Encouragement</span>
        <textarea bind:value={enc} rows="6" spellcheck="false"></textarea>
      </label>
      <label>
        <span class="lbl">Maintien</span>
        <textarea bind:value={maint} rows="6" spellcheck="false"></textarea>
      </label>
      <label>
        <span class="lbl">Félicitation</span>
        <textarea bind:value={fel} rows="6" spellcheck="false"></textarea>
      </label>
    </div>
    <button type="button" class="btn-save" disabled={msgLoading} on:click={saveMessages}>
      {msgLoading ? 'Enregistrement…' : 'Enregistrer les messages'}
    </button>
  </Card>
</div>

<style>
  .admin {
    max-width: 800px;
    margin: 0 auto;
    padding: 16px 14px 40px;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 18px;
  }
  h1 {
    font-size: 1.35rem;
    font-weight: 900;
    font-family: 'Rajdhani', sans-serif;
    margin: 4px 0 0;
  }
  .sup {
    font-size: 10px;
    letter-spacing: 2px;
    font-family: 'Rajdhani', sans-serif;
    color: var(--gold);
  }
  .muted {
    color: var(--muted);
  }
  .btn-out {
    border: 1px solid var(--border);
    background: transparent;
    color: var(--muted);
    padding: 8px 14px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 0.85rem;
  }
  .btn-out:hover {
    border-color: var(--accent);
    color: var(--text);
  }
  .err {
    color: var(--red);
    font-size: 0.88rem;
    margin-bottom: 10px;
  }
  .ok {
    color: var(--green);
    font-size: 0.88rem;
    margin-bottom: 8px;
  }
  .table {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
  }
  .cell {
    font-size: 0.88rem;
  }
  .cell.grow {
    flex: 1 1 200px;
    min-width: 0;
  }
  .uname {
    font-weight: 800;
  }
  .mail {
    color: var(--muted);
    font-size: 0.82rem;
    word-break: break-all;
  }
  .tags {
    display: flex;
    gap: 6px;
    margin-top: 4px;
  }
  .tag {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 6px;
    background: var(--gold)22;
    color: var(--gold);
    font-family: 'Rajdhani', sans-serif;
  }
  .tag.pending {
    background: var(--cyan)22;
    color: var(--cyan);
  }
  .tag.susp {
    background: #f59e0b22;
    color: #fbbf24;
  }
  .tag.push {
    background: var(--green)22;
    color: var(--green);
  }
  .cell.actions {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    min-width: 100px;
  }
  .btn-susp {
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--muted);
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 0.78rem;
    cursor: pointer;
  }
  .btn-susp:hover {
    border-color: #f59e0b88;
    color: var(--text);
  }
  .groups {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 10px;
  }
  .groups .grow {
    padding: 8px 10px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
  }
  .gmeta {
    display: block;
    font-size: 0.75rem;
    color: var(--muted);
    margin-top: 4px;
    word-break: break-all;
    font-family: 'Rajdhani', sans-serif;
  }
  .audit {
    list-style: none;
    margin: 10px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 0.78rem;
  }
  .audit li {
    padding: 8px 10px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    font-family: 'Rajdhani', sans-serif;
  }
  .audit time {
    display: block;
    color: var(--muted);
    font-size: 0.72rem;
    margin-bottom: 4px;
  }
  .aud-act {
    font-weight: 800;
    color: var(--gold);
  }
  .aud-meta {
    display: block;
    color: var(--muted);
    margin-top: 4px;
    font-size: 0.72rem;
  }
  .dates {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-top: 8px;
    font-size: 0.75rem;
    color: var(--muted);
    font-family: 'Rajdhani', sans-serif;
    line-height: 1.35;
  }
  .btn-del {
    border: 1px solid var(--red)55;
    background: transparent;
    color: var(--red);
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 0.78rem;
    cursor: pointer;
  }
  .btn-del:hover {
    background: var(--red)18;
  }
  .pager {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 12px;
  }
  .pager button {
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .pager button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .grid-msg {
    display: grid;
    gap: 12px;
    margin: 12px 0;
  }
  @media (min-width: 640px) {
    .grid-msg {
      grid-template-columns: 1fr 1fr 1fr;
    }
  }
  .lbl {
    display: block;
    font-size: 10px;
    letter-spacing: 1px;
    color: var(--muted);
    margin-bottom: 4px;
    font-family: 'Rajdhani', sans-serif;
  }
  textarea {
    width: 100%;
    box-sizing: border-box;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    padding: 8px;
    font-size: 0.82rem;
    resize: vertical;
    font-family: 'Exo 2', sans-serif;
  }
  .btn-save {
    margin-top: 8px;
    padding: 10px 18px;
    border: none;
    border-radius: 10px;
    background: var(--grad-cta);
    color: #fff;
    font-weight: 800;
    cursor: pointer;
    font-family: 'Rajdhani', sans-serif;
  }
  .btn-save:disabled {
    opacity: 0.55;
    cursor: wait;
  }
  .daily-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 10px 0;
  }
  .daily-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
  }
  .daily-ico {
    width: 3rem;
    text-align: center;
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-size: 1.1rem;
  }
  .daily-title {
    flex: 1 1 160px;
    min-width: 120px;
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-size: 0.85rem;
  }
  .daily-xp {
    width: 4rem;
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-size: 0.85rem;
  }
  .daily-act {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    color: var(--muted);
    white-space: nowrap;
  }
  .daily-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    margin-top: 10px;
  }
  .push-test-block {
    margin-top: 14px;
  }
  .push-test-label {
    display: block;
    font-size: 0.78rem;
    color: var(--muted);
    margin-bottom: 6px;
  }
  .push-test-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }
  .push-test-input {
    flex: 1;
    min-width: 200px;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font-size: 0.9rem;
    font-family: inherit;
  }
  .push-test-input:focus {
    outline: none;
    border-color: var(--accent);
  }
  .push-test-hint {
    margin: 6px 0 0;
    font-size: 0.75rem;
  }
  .btn-secondary {
    padding: 8px 14px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    font-size: 0.85rem;
    font-family: 'Rajdhani', sans-serif;
  }
  .btn-secondary:hover {
    border-color: var(--accent);
  }
  .email-mode {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
  }
  .email-radio {
    font-size: 0.88rem;
    cursor: pointer;
  }
  .email-lbl {
    display: block;
    margin-bottom: 10px;
  }
  .email-lbl span {
    display: block;
    font-size: 10px;
    letter-spacing: 1px;
    color: var(--muted);
    margin-bottom: 4px;
    font-family: 'Rajdhani', sans-serif;
  }
  .email-subj {
    width: 100%;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    box-sizing: border-box;
  }
  .email-body {
    width: 100%;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font-family: inherit;
    resize: vertical;
    box-sizing: border-box;
  }
  .email-select {
    display: block;
    margin-top: 4px;
    width: 100%;
    max-width: 100%;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    box-sizing: border-box;
  }
</style>
