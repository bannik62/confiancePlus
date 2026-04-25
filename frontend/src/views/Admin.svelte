<script>
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import { authStore, clearAuth } from '../stores/auth.js'
  import { adminApi } from '../api/admin.js'
  import { loadGameplay as refreshPublicGameplay } from '../stores/gameplay.js'
  import { DEFAULT_UI_ANIMATIONS } from '../lib/gameplayUiDefaults.js'
  import Card from '../components/ui/Card.svelte'
  import AdminEmojiField from '../components/ui/AdminEmojiField.svelte'

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

  /** Saisie crédit cristaux par user id (admin) */
  let crystalGrantInput = {}
  let grantCristauxBusyId = ''

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

  /** État éditable (copie profonde de la config serveur). */
  let gpEdit = null
  let gpHasDb = false
  let gpLoading = true
  let gpErr = ''
  let gpOk = ''
  let gpBusy = false
  let gpResetBusy = false
  /** Paliers streak (saisie « 7,14,30… ») */
  let streakBadgesStr = '7,14,30,60,100,365'

  const cloneGameplay = (c) => JSON.parse(JSON.stringify(c))

  const DEFAULT_STREAK_REWARDS = [
    {
      at: 7,
      key: 'streak_7',
      icon: '🔥',
      title: '7 jours de flamme !',
      body: 'Tu enchaînes 7 jours d’affilée. Réclame ton trophée : il apparaîtra dans tes objets.',
      heroImage: '/badges/fireStreackBadge/1000002186.png',
    },
  ]

  const DEFAULT_STREAK_BADGE_AT = [7, 14, 30, 60, 100, 365]

  /** Paliers profil + récompenses modale / claim — alignés sur `gameConfig.js`. */
  const ensureStreakGameplay = (gp) => {
    if (!gp) return
    if (!gp.streak) gp.streak = {}
    if (!Array.isArray(gp.streak.badgeAt) || !gp.streak.badgeAt.length) {
      gp.streak.badgeAt = [...DEFAULT_STREAK_BADGE_AT]
    }
    if (!Array.isArray(gp.streak.rewards) || !gp.streak.rewards.length) {
      gp.streak.rewards = JSON.parse(JSON.stringify(DEFAULT_STREAK_REWARDS))
    }
  }

  /** Complète `ui.animations` pour les configs anciennes ou partielles */
  const ensureGameplayUi = (gp) => {
    if (!gp?.ui) gp.ui = { animations: { ...DEFAULT_UI_ANIMATIONS } }
    if (!gp.ui.animations) gp.ui.animations = {}
    gp.ui.animations = { ...DEFAULT_UI_ANIMATIONS, ...gp.ui.animations }
    ensureStreakGameplay(gp)
  }

  /** Aide gameplay : ouverture au clic (téléphone sans hover). */
  const GP_TIPS = {
    intro:
      'Ces réglages pilotent l’XP, la courbe de niveaux, le nombre de places d’habitudes et les RDV côté serveur (total XP, création d’habitudes et de RDV). Enregistrer crée une surcharge en base ; « Réinitialiser » revient aux valeurs du fichier code.',
    xpBlock:
      'Utilisé dans le calcul d’XP du jour (habitudes cochées + bonus si tout est fait + bonus check-in / journal / sommeil). Aligné avec l’aperçu sur l’accueil une fois la config chargée.',
    habitBase:
      'XP attribuée par habitude cochée lorsque l’habitude n’a pas de valeur XP personnalisée en base.',
    bonusPerTask:
      'Coefficient du bonus « toutes les habitudes prévues ce jour sont cochées » : multiplicateur = max(1, bonusPerTask × nombre d’habitudes cochées).',
    checkInBonus:
      'XP ajoutée le jour où l’utilisateur a enregistré son humeur (check-in du jour).',
    journalBonus:
      'XP ajoutée si le journal du jour civil est renseigné (sauvegarde de la journée).',
    sleepBonus: 'XP ajoutée si la qualité du sommeil est renseignée pour ce jour.',
    newHabitDefault:
      'XP par défaut lors de la création manuelle d’une nouvelle habitude (avant toute édition du champ XP).',
    levelsBlock:
      'Détermine combien d’XP totale il faut pour atteindre chaque niveau, donc le rythme de progression et le titre affiché.',
    levelBase:
      'Facteur d’échelle de la courbe : avec l’exposant, fixe l’XP requise pour passer les premiers niveaux.',
    levelExponent:
      'Plus il est élevé, plus l’XP nécessaire augmente vite pour les niveaux hauts (courbe plus exigeante).',
    slotsBlock:
      'Nombre maximum d’habitudes « actives » selon le niveau du joueur : utilisé à la création d’habitude et pour l’offre du jour (places pleines).',
    baseSlots:
      'Nombre de places pour les niveaux jusqu’à levelAnchor inclus (avant d’ajouter bonusPerLevel par niveau).',
    levelAnchor:
      'Dernier niveau où l’on reste sur baseSlots ; à partir du niveau suivant, on ajoute bonusPerLevel par niveau gagné.',
    bonusPerLevelSlots:
      'Places supplémentaires par niveau au-delà de levelAnchor (jusqu’au plafond absoluteMax).',
    absoluteMax:
      'Plafond absolu du nombre d’habitudes actives, même si la formule en donnerait plus.',
    rdvBlock:
      'Règles d’XP pour les RDV validés le jour prévu : plafond par nombre de RDV « payants » et par somme d’XP RDV le même jour civil.',
    maxRdvXp:
      'Nombre maximum de RDV validés le même jour qui rapportent de l’XP ; les suivants sont enregistrés comme faits mais avec 0 XP.',
    maxXpRdvDay:
      'Somme maximale d’XP issue des RDV pour un même jour civil (la somme des xpEarned est plafonnée).',
    xpRdvCreate:
      'Valeur stockée sur chaque nouveau RDV : affichage dans l’agenda et plafond théorique par validation (sous réserve des plafonds journaliers).',
    streakBlock:
      'Paliers affichés dans le profil (badges de série) : nombres séparés par des virgules (ex. 7, 14, 30). Indépendant des trophées réclamables ci‑dessous, qui pilotent la modale et le claim côté serveur.',
    rewardsBlock:
      'Chaque ligne est un palier réclamable : quand la série (jours consécutifs avec au moins une habitude cochée) atteint « seuil (jours) », le joueur peut réclamer ce trophée une fois par « épisode » de série (remise à zéro si la série retombe à 0). Le champ « clé » doit rester stable et unique : le serveur valide la réclamation avec cette clé. « Image » : chemin sous /public (ex. /badges/…/fichier.png).',
    titlesBlock:
      'Libellé et emoji affichés selon le niveau : on prend la ligne dont « depuis » est le plus grand seuil inférieur ou égal au niveau actuel. L’ordre des lignes dans la liste n’a pas d’importance.',
    animationsUiBlock:
      'Durées d’animation des compteurs (ms) et des barres de l’onglet Stats. 0 = affichage instantané. Le navigateur peut réduire les animations si l’utilisateur a activé « réduire les mouvements ». Après enregistrement du gameplay, le store public est rechargé : pas besoin de redéployer le frontend.',
    animCountUpDefault:
      'Durée de secours si une clé manque côté client (fallback dans le code). Peut rester alignée sur la valeur par défaut du dépôt.',
    animHomeTotalXp:
      'Compteur « XP TOTAL (ACTUEL) » sur l’accueil (carte stats du jour).',
    animHomeToday:
      'Compteur « +… » pour l’aperçu XP des habitudes du jour sur l’accueil.',
    animHomeCombined:
      'Compteur « TOTAL (ACTUEL + AUJ.) » (indicatif) sur l’accueil.',
    animStatsCountUp:
      'Pourcentages affichés dans Stats (barres 7 jours, habitudes) et nombre de membres (vue éducateur).',
    animStatsBarsCss:
      'Durée CSS (ms) de la montée des barres verticales et du remplissage horizontal des pistes dans Stats — pas le compteur %, seulement le graphique.',
    animStatsLeaderboardXp:
      'Compteur XP dans le classement groupe (vue éducateur).',
    animStatsLeaderboardTag:
      'Compteurs niveau (LVL) et série (🔥) dans les pastilles du classement.',
    animInsightsTitle:
      'Compteur du nombre de jours analysés dans le titre de la carte Insights (Stats).',
    animInsightsBody:
      'Compteurs des scores et pourcentages dans le texte des insights (humeur, sommeil, meilleur jour, etc.).',
    animProfilTotalXp:
      'Compteur « XP TOTAL » sur la page Profil.',
  }

  let gpTipKey = null

  const toggleGpTip = (key) => {
    gpTipKey = gpTipKey === key ? null : key
  }

  const closeGpTip = () => {
    gpTipKey = null
  }

  const auditActionLabel = (code) =>
    ({
      USER_DELETE: 'Suppression compte',
      USER_SUSPEND: 'Suspension compte',
      USER_UNSUSPEND: 'Réactivation compte',
      USER_GRANT_CRISTAUX: 'Cristaux — crédit manuel',
      DAY_MESSAGES_REPLACE: 'Messages du jour (remplacement)',
      DAILY_HABIT_TEMPLATES_REPLACE: 'Habitudes du jour (pool)',
      PUSH_SETTINGS_UPDATE: 'Notifications — heure rappel par défaut',
      PUSH_TEST_GIFT: 'Notifications — test push (message admin)',
      ADMIN_EMAIL_DEFAULTS_SAVE: 'E-mail — modèle par défaut (titre + corps)',
      ADMIN_EMAIL_SEND: 'E-mail — envoi (tous ou un utilisateur)',
      GAMEPLAY_CONFIG_UPDATE: 'Gameplay — enregistrement config',
      GAMEPLAY_CONFIG_RESET: 'Gameplay — reset défaut code',
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
      loadGameplayAdmin(),
    ])
    loading = false
    auditLoading = false
    msgLoading = false
    dailyLoading = false
    gpLoading = false
  })

  onMount(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') closeGpTip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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

  const grantCristauxForUser = async (u) => {
    const raw = String(crystalGrantInput[u.id] ?? '').trim()
    const n = parseInt(raw, 10)
    if (!Number.isFinite(n) || n < 1) {
      err = 'Indique un nombre entier de cristaux (≥ 1).'
      return
    }
    if (n > 50000) {
      err = 'Plafond : 50 000 cristaux par opération.'
      return
    }
    err = ''
    grantCristauxBusyId = u.id
    try {
      const r = await adminApi.postGrantCristaux(u.id, { amount: n })
      const newBal = typeof r?.cristaux === 'number' ? r.cristaux : null
      if (newBal != null)
        users = users.map((x) => (x.id === u.id ? { ...x, cristaux: newBal } : x))
      crystalGrantInput = { ...crystalGrantInput, [u.id]: '' }
      await loadAudit()
    } catch (e) {
      err = e.message || 'Crédit impossible'
    } finally {
      grantCristauxBusyId = ''
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

  const loadGameplayAdmin = async () => {
    gpErr = ''
    gpOk = ''
    try {
      const r = await adminApi.getGameplay()
      gpHasDb = !!r.hasDbOverride
      gpEdit = cloneGameplay(r.config)
      ensureGameplayUi(gpEdit)
      streakBadgesStr = (gpEdit.streak?.badgeAt ?? []).join(',')
    } catch (e) {
      gpErr = e.message || 'Chargement gameplay impossible'
      gpEdit = null
    }
  }

  const saveGameplay = async () => {
    if (!gpEdit) return
    ensureGameplayUi(gpEdit)
    gpErr = ''
    gpOk = ''
    const badges = String(streakBadgesStr ?? '')
      .split(/[,;\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0)
    if (badges.length < 1) {
      gpErr = 'Indique au moins un palier streak (nombres séparés par des virgules).'
      return
    }
    gpEdit.streak.badgeAt = badges
    ensureStreakGameplay(gpEdit)
    if (!Array.isArray(gpEdit.streak.rewards) || !gpEdit.streak.rewards.length) {
      gpErr = 'Ajoute au moins une récompense série (tableau des paliers trophée).'
      return
    }
    const seenRewardAt = new Set()
    const seenRewardKey = new Set()
    for (const rw of gpEdit.streak.rewards) {
      const at = Number(rw.at)
      const key = String(rw.key ?? '').trim()
      if (!key || !Number.isFinite(at) || at < 1) {
        gpErr = 'Chaque récompense série : clé non vide, seuil (jours) ≥ 1.'
        return
      }
      if (seenRewardKey.has(key)) {
        gpErr = 'Les clés des récompenses série doivent être uniques.'
        return
      }
      seenRewardKey.add(key)
      if (seenRewardAt.has(at)) {
        gpErr = 'Les seuils « jours » des récompenses série doivent être uniques.'
        return
      }
      seenRewardAt.add(at)
      const icon = String(rw.icon ?? '')
      const title = String(rw.title ?? '')
      const body = String(rw.body ?? '')
      if (icon.length < 1 || icon.length > 16) {
        gpErr = 'Chaque récompense : icône entre 1 et 16 caractères.'
        return
      }
      if (title.length < 1 || title.length > 80) {
        gpErr = 'Chaque récompense : titre entre 1 et 80 caractères.'
        return
      }
      if (body.length < 1 || body.length > 500) {
        gpErr = 'Chaque récompense : texte entre 1 et 500 caractères.'
        return
      }
      const hi = String(rw.heroImage ?? '').trim()
      if (hi.length > 200) {
        gpErr = 'Chaque récompense : chemin image ≤ 200 caractères (ou vide).'
        return
      }
    }
    const toSave = cloneGameplay(gpEdit)
    for (const rw of toSave.streak.rewards) {
      const hi = String(rw.heroImage ?? '').trim()
      if (hi) rw.heroImage = hi
      else delete rw.heroImage
    }
    gpBusy = true
    try {
      const r = await adminApi.putGameplay(toSave)
      gpHasDb = !!r.hasDbOverride
      gpEdit = cloneGameplay(r.config)
      ensureGameplayUi(gpEdit)
      streakBadgesStr = gpEdit.streak.badgeAt.join(',')
      gpOk = 'Configuration gameplay enregistrée (prise en compte immédiate côté serveur).'
      await refreshPublicGameplay()
      await loadAudit()
    } catch (e) {
      gpErr = e.message || 'Enregistrement impossible'
    } finally {
      gpBusy = false
    }
  }

  const resetGameplay = async () => {
    if (!confirm('Réinitialiser le gameplay aux valeurs du fichier code (supprime la surcharge en base) ?')) return
    gpErr = ''
    gpOk = ''
    gpResetBusy = true
    try {
      const r = await adminApi.resetGameplay()
      gpHasDb = !!r.hasDbOverride
      gpEdit = cloneGameplay(r.config)
      ensureGameplayUi(gpEdit)
      streakBadgesStr = gpEdit.streak.badgeAt.join(',')
      gpOk = 'Gameplay réinitialisé sur les défauts du dépôt.'
      await refreshPublicGameplay()
      await loadAudit()
    } catch (e) {
      gpErr = e.message || 'Reset impossible'
    } finally {
      gpResetBusy = false
    }
  }

  const addGameplayTitleRow = () => {
    if (!gpEdit?.titles) return
    gpEdit.titles = [...gpEdit.titles, { from: 0, label: 'Nouveau', icon: '🌱' }]
  }

  const removeGameplayTitleRow = (idx) => {
    if (!gpEdit?.titles || gpEdit.titles.length <= 1) return
    gpEdit.titles = gpEdit.titles.filter((_, i) => i !== idx)
  }

  const addGameplayStreakRewardRow = () => {
    if (!gpEdit?.streak) return
    if (!Array.isArray(gpEdit.streak.rewards)) gpEdit.streak.rewards = []
    gpEdit.streak.rewards = [
      ...gpEdit.streak.rewards,
      {
        at: 7,
        key: `streak_${Date.now()}`,
        icon: '🔥',
        title: 'Nouveau palier',
        body: 'Description du trophée affichée dans la modale.',
        heroImage: '/badges/fireStreackBadge/1000002186.png',
      },
    ]
  }

  const removeGameplayStreakRewardRow = (idx) => {
    if (!gpEdit?.streak?.rewards || gpEdit.streak.rewards.length <= 1) return
    gpEdit.streak.rewards = gpEdit.streak.rewards.filter((_, i) => i !== idx)
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
              <div class="crystal-row" title="Solde cristaux (monnaie in-app)">
                <span class="crystal-balance">💎 {u.cristaux ?? 0}</span>
              </div>
            </div>
            <div class="cell actions">
              <div class="crystal-grant" aria-label="Créditer des cristaux">
                <input
                  type="number"
                  min="1"
                  max="50000"
                  class="crystal-in"
                  placeholder="+"
                  bind:value={crystalGrantInput[u.id]}
                />
                <button
                  type="button"
                  class="btn-crystal"
                  disabled={grantCristauxBusyId === u.id}
                  on:click={() => grantCristauxForUser(u)}
                >
                  {grantCristauxBusyId === u.id ? '…' : 'Créditer'}
                </button>
              </div>
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
      <input type="text" class="email-subj" maxlength="500" bind:value={emailSubject} placeholder="[Habitracks] …" />
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
    <div class="gp-card-title">
      <div class="sup muted">GAMEPLAY — équilibrage (serveur)</div>
      <button
        type="button"
        class="gp-tip"
        aria-label="Aide : vue d’ensemble du bloc gameplay"
        aria-expanded={gpTipKey === 'intro'}
        aria-controls="gp-tip-panel"
        on:click|stopPropagation={() => toggleGpTip('intro')}
      >i</button>
    </div>
    {#if gpErr}<p class="err">{gpErr}</p>{/if}
    {#if gpOk}<p class="ok">{gpOk}</p>{/if}
    {#if gpLoading || !gpEdit}
      <p class="muted" style="margin-top:8px">Chargement…</p>
    {:else}
      <p class="muted" style="margin:8px 0 10px;font-size:0.85rem">
        Surcharge stockée en base (<code>AppSetting.gameConfig</code>). Sans sauvegarde, les valeurs du fichier
        <code>gameConfig.js</code> s’appliquent.
        {#if gpHasDb}<strong> Surcharge active.</strong>{/if}
      </p>

      <div class="gp-section">
        <div class="gp-h">
          <span>XP — habitudes &amp; journée</span>
          <button
            type="button"
            class="gp-tip"
            aria-label="Aide : section XP habitudes et journée"
            aria-expanded={gpTipKey === 'xpBlock'}
            aria-controls="gp-tip-panel"
            on:click|stopPropagation={() => toggleGpTip('xpBlock')}
          >i</button>
        </div>
        <div class="gp-grid">
          <label>
            <span class="gp-label-row">
              <span>habitBase</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : habitBase"
                aria-expanded={gpTipKey === 'habitBase'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('habitBase')}
              >i</button>
            </span>
            <input type="number" bind:value={gpEdit.xp.habitBase} min="1" max="500" />
          </label>
          <label>
            <span class="gp-label-row">
              <span>bonusPerTask</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : bonusPerTask"
                aria-expanded={gpTipKey === 'bonusPerTask'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('bonusPerTask')}
              >i</button>
            </span>
            <input type="number" step="0.01" bind:value={gpEdit.xp.bonusPerTask} />
          </label>
          <label>
            <span class="gp-label-row">
              <span>checkInBonus</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : checkInBonus"
                aria-expanded={gpTipKey === 'checkInBonus'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('checkInBonus')}
              >i</button>
            </span>
            <input type="number" bind:value={gpEdit.xp.checkInBonus} />
          </label>
          <label>
            <span class="gp-label-row">
              <span>journalBonus</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : journalBonus"
                aria-expanded={gpTipKey === 'journalBonus'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('journalBonus')}
              >i</button>
            </span>
            <input type="number" bind:value={gpEdit.xp.journalBonus} />
          </label>
          <label>
            <span class="gp-label-row">
              <span>sleepBonus</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : sleepBonus"
                aria-expanded={gpTipKey === 'sleepBonus'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('sleepBonus')}
              >i</button>
            </span>
            <input type="number" bind:value={gpEdit.xp.sleepBonus} />
          </label>
          <label>
            <span class="gp-label-row">
              <span>newHabitDefault</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : newHabitDefault"
                aria-expanded={gpTipKey === 'newHabitDefault'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('newHabitDefault')}
              >i</button>
            </span>
            <input type="number" bind:value={gpEdit.xp.newHabitDefault} />
          </label>
        </div>
      </div>

      <div class="gp-section">
        <div class="gp-h">
          <span>Courbe de niveaux (XP pour niveau n ≈ base × n^exponent)</span>
          <button
            type="button"
            class="gp-tip"
            aria-label="Aide : courbe de niveaux"
            aria-expanded={gpTipKey === 'levelsBlock'}
            aria-controls="gp-tip-panel"
            on:click|stopPropagation={() => toggleGpTip('levelsBlock')}
          >i</button>
        </div>
        <div class="gp-grid">
          <label>
            <span class="gp-label-row">
              <span>base</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : levels.base"
                aria-expanded={gpTipKey === 'levelBase'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('levelBase')}
              >i</button>
            </span>
            <input type="number" bind:value={gpEdit.levels.base} />
          </label>
          <label>
            <span class="gp-label-row">
              <span>exponent</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : levels.exponent"
                aria-expanded={gpTipKey === 'levelExponent'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('levelExponent')}
              >i</button>
            </span>
            <input type="number" step="0.01" bind:value={gpEdit.levels.exponent} />
          </label>
        </div>
      </div>

      <div class="gp-section">
        <div class="gp-h">
          <span>Places habitudes actives</span>
          <button
            type="button"
            class="gp-tip"
            aria-label="Aide : places habitudes"
            aria-expanded={gpTipKey === 'slotsBlock'}
            aria-controls="gp-tip-panel"
            on:click|stopPropagation={() => toggleGpTip('slotsBlock')}
          >i</button>
        </div>
        <div class="gp-grid">
          <label>
            <span class="gp-label-row">
              <span>baseSlots</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : baseSlots"
                aria-expanded={gpTipKey === 'baseSlots'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('baseSlots')}
              >i</button>
            </span>
            <input type="number" bind:value={gpEdit.habitSlots.baseSlots} />
          </label>
          <label>
            <span class="gp-label-row">
              <span>levelAnchor</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : levelAnchor"
                aria-expanded={gpTipKey === 'levelAnchor'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('levelAnchor')}
              >i</button>
            </span>
            <input type="number" bind:value={gpEdit.habitSlots.levelAnchor} />
          </label>
          <label>
            <span class="gp-label-row">
              <span>bonusPerLevel</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : bonusPerLevel (places)"
                aria-expanded={gpTipKey === 'bonusPerLevelSlots'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('bonusPerLevelSlots')}
              >i</button>
            </span>
            <input type="number" step="0.1" bind:value={gpEdit.habitSlots.bonusPerLevel} />
          </label>
          <label>
            <span class="gp-label-row">
              <span>absoluteMax</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : absoluteMax"
                aria-expanded={gpTipKey === 'absoluteMax'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('absoluteMax')}
              >i</button>
            </span>
            <input type="number" bind:value={gpEdit.habitSlots.absoluteMax} />
          </label>
        </div>
      </div>

      <div class="gp-section">
        <div class="gp-h">
          <span>Rendez-vous</span>
          <button
            type="button"
            class="gp-tip"
            aria-label="Aide : rendez-vous"
            aria-expanded={gpTipKey === 'rdvBlock'}
            aria-controls="gp-tip-panel"
            on:click|stopPropagation={() => toggleGpTip('rdvBlock')}
          >i</button>
        </div>
        <div class="gp-grid">
          <label>
            <span class="gp-label-row">
              <span>max RDV avec XP / jour</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : max RDV avec XP par jour"
                aria-expanded={gpTipKey === 'maxRdvXp'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('maxRdvXp')}
              >i</button>
            </span>
            <input type="number" bind:value={gpEdit.appointments.maxRewardingCompletionsPerDay} />
          </label>
          <label>
            <span class="gp-label-row">
              <span>max XP RDV / jour</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : max XP RDV par jour"
                aria-expanded={gpTipKey === 'maxXpRdvDay'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('maxXpRdvDay')}
              >i</button>
            </span>
            <input type="number" bind:value={gpEdit.appointments.maxXpFromAppointmentsPerDay} />
          </label>
          <label>
            <span class="gp-label-row">
              <span>XP à la création d’un RDV</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : XP création RDV"
                aria-expanded={gpTipKey === 'xpRdvCreate'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('xpRdvCreate')}
              >i</button>
            </span>
            <input type="number" bind:value={gpEdit.appointments.xpRewardOnCreate} />
          </label>
        </div>
      </div>

      <div class="gp-section">
        <div class="gp-h">
          <span>Streak — paliers badges</span>
          <button
            type="button"
            class="gp-tip"
            aria-label="Aide : paliers streak"
            aria-expanded={gpTipKey === 'streakBlock'}
            aria-controls="gp-tip-panel"
            on:click|stopPropagation={() => toggleGpTip('streakBlock')}
          >i</button>
        </div>
        <label class="gp-full">
          <input type="text" class="gp-streak-input" bind:value={streakBadgesStr} placeholder="7,14,30,…" />
        </label>
      </div>

      <div class="gp-section">
        <div class="gp-h">
          <span>Streak — paliers trophée (modale &amp; réclamation)</span>
          <button
            type="button"
            class="gp-tip"
            aria-label="Aide : paliers trophée série"
            aria-expanded={gpTipKey === 'rewardsBlock'}
            aria-controls="gp-tip-panel"
            on:click|stopPropagation={() => toggleGpTip('rewardsBlock')}
          >i</button>
        </div>
        <p class="muted" style="margin:0 0 10px;font-size:0.82rem">
          Seuils distincts des paliers « badges » ci‑dessus. Ordre côté serveur : par seuil croissant.
        </p>
        <div class="gp-streak-rewards">
          {#each gpEdit.streak.rewards as rw, ri}
            <div class="gp-reward-block">
              <div class="gp-reward-row">
                <label class="gp-r-compact">
                  <span class="gp-r-lbl">Seuil (jours)</span>
                  <input type="number" min="1" max="100000" bind:value={rw.at} />
                </label>
                <label class="gp-r-grow">
                  <span class="gp-r-lbl">Clé</span>
                  <input type="text" bind:value={rw.key} maxlength="40" placeholder="streak_7" />
                </label>
                <div class="gp-r-icon-wrap">
                  <span class="gp-r-lbl">Icône</span>
                  <AdminEmojiField bind:value={rw.icon} wide={false} ariaLabel="Icône palier" placeholder="🔥" />
                </div>
                <button
                  type="button"
                  class="btn-del gp-r-del"
                  disabled={gpEdit.streak.rewards.length <= 1}
                  on:click={() => removeGameplayStreakRewardRow(ri)}
                >×</button>
              </div>
              <label class="gp-r-full">
                <span class="gp-r-lbl">Titre modale</span>
                <input type="text" bind:value={rw.title} maxlength="80" />
              </label>
              <label class="gp-r-full">
                <span class="gp-r-lbl">Texte</span>
                <textarea rows="2" maxlength="500" bind:value={rw.body}></textarea>
              </label>
              <label class="gp-r-full">
                <span class="gp-r-lbl">Image (chemin /public)</span>
                <input type="text" bind:value={rw.heroImage} maxlength="200" placeholder="/badges/…/fichier.png" />
              </label>
            </div>
          {/each}
        </div>
        <button type="button" class="btn-secondary" style="margin-top:8px" on:click={addGameplayStreakRewardRow}>
          + Palier trophée
        </button>
      </div>

      <div class="gp-section">
        <div class="gp-h">
          <span>Titres affichés (niveau ≥ « depuis »)</span>
          <button
            type="button"
            class="gp-tip"
            aria-label="Aide : titres par niveau"
            aria-expanded={gpTipKey === 'titlesBlock'}
            aria-controls="gp-tip-panel"
            on:click|stopPropagation={() => toggleGpTip('titlesBlock')}
          >i</button>
        </div>
        <div class="gp-titles">
          {#each gpEdit.titles as row, ti}
            <div class="gp-title-row">
              <input type="number" class="gp-t-from" bind:value={row.from} title="Niveau min" />
              <input type="text" class="gp-t-label" bind:value={row.label} maxlength="40" placeholder="Libellé" />
              <AdminEmojiField bind:value={row.icon} wide ariaLabel="Icône du palier" placeholder="🌱" />
              <button type="button" class="btn-del" disabled={gpEdit.titles.length <= 1} on:click={() => removeGameplayTitleRow(ti)}>×</button>
            </div>
          {/each}
        </div>
        <button type="button" class="btn-secondary" style="margin-top:8px" on:click={addGameplayTitleRow}>+ Titre</button>
      </div>

      <div class="gp-section">
        <div class="gp-h">
          <span>Animations UI (durées en ms — compteurs &amp; barres stats)</span>
          <button
            type="button"
            class="gp-tip"
            aria-label="Aide : animations UI"
            aria-expanded={gpTipKey === 'animationsUiBlock'}
            aria-controls="gp-tip-panel"
            on:click|stopPropagation={() => toggleGpTip('animationsUiBlock')}
          >i</button>
        </div>
        <p class="muted" style="margin:0 0 10px;font-size:0.82rem">
          0 = instantané. Respecte aussi <code>prefers-reduced-motion</code> côté app. Prise en compte après enregistrement + rechargement du store public.
        </p>
        <div class="gp-grid">
          <label>
            <span class="gp-label-row">
              <span>countUpDefault</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : countUpDefault"
                aria-expanded={gpTipKey === 'animCountUpDefault'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('animCountUpDefault')}
              >i</button>
            </span>
            <input type="number" min="0" max="30000" bind:value={gpEdit.ui.animations.countUpDefault} />
          </label>
          <label>
            <span class="gp-label-row">
              <span>homeTotalXp</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : homeTotalXp"
                aria-expanded={gpTipKey === 'animHomeTotalXp'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('animHomeTotalXp')}
              >i</button>
            </span>
            <input type="number" min="0" max="30000" bind:value={gpEdit.ui.animations.homeTotalXp} />
          </label>
          <label>
            <span class="gp-label-row">
              <span>homeToday</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : homeToday"
                aria-expanded={gpTipKey === 'animHomeToday'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('animHomeToday')}
              >i</button>
            </span>
            <input type="number" min="0" max="30000" bind:value={gpEdit.ui.animations.homeToday} />
          </label>
          <label>
            <span class="gp-label-row">
              <span>homeCombined</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : homeCombined"
                aria-expanded={gpTipKey === 'animHomeCombined'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('animHomeCombined')}
              >i</button>
            </span>
            <input type="number" min="0" max="30000" bind:value={gpEdit.ui.animations.homeCombined} />
          </label>
          <label>
            <span class="gp-label-row">
              <span>statsCountUp</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : statsCountUp"
                aria-expanded={gpTipKey === 'animStatsCountUp'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('animStatsCountUp')}
              >i</button>
            </span>
            <input type="number" min="0" max="30000" bind:value={gpEdit.ui.animations.statsCountUp} />
          </label>
          <label>
            <span class="gp-label-row">
              <span>statsBarsCss</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : statsBarsCss"
                aria-expanded={gpTipKey === 'animStatsBarsCss'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('animStatsBarsCss')}
              >i</button>
            </span>
            <input type="number" min="0" max="30000" bind:value={gpEdit.ui.animations.statsBarsCss} />
          </label>
          <label>
            <span class="gp-label-row">
              <span>statsLeaderboardXp</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : statsLeaderboardXp"
                aria-expanded={gpTipKey === 'animStatsLeaderboardXp'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('animStatsLeaderboardXp')}
              >i</button>
            </span>
            <input type="number" min="0" max="30000" bind:value={gpEdit.ui.animations.statsLeaderboardXp} />
          </label>
          <label>
            <span class="gp-label-row">
              <span>statsLeaderboardTag</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : statsLeaderboardTag"
                aria-expanded={gpTipKey === 'animStatsLeaderboardTag'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('animStatsLeaderboardTag')}
              >i</button>
            </span>
            <input type="number" min="0" max="30000" bind:value={gpEdit.ui.animations.statsLeaderboardTag} />
          </label>
          <label>
            <span class="gp-label-row">
              <span>insightsTitle</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : insightsTitle"
                aria-expanded={gpTipKey === 'animInsightsTitle'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('animInsightsTitle')}
              >i</button>
            </span>
            <input type="number" min="0" max="30000" bind:value={gpEdit.ui.animations.insightsTitle} />
          </label>
          <label>
            <span class="gp-label-row">
              <span>insightsBody</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : insightsBody"
                aria-expanded={gpTipKey === 'animInsightsBody'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('animInsightsBody')}
              >i</button>
            </span>
            <input type="number" min="0" max="30000" bind:value={gpEdit.ui.animations.insightsBody} />
          </label>
          <label>
            <span class="gp-label-row">
              <span>profilTotalXp</span>
              <button
                type="button"
                class="gp-tip"
                aria-label="Aide : profilTotalXp"
                aria-expanded={gpTipKey === 'animProfilTotalXp'}
                aria-controls="gp-tip-panel"
                on:click|stopPropagation={() => toggleGpTip('animProfilTotalXp')}
              >i</button>
            </span>
            <input type="number" min="0" max="30000" bind:value={gpEdit.ui.animations.profilTotalXp} />
          </label>
        </div>
      </div>

      <div class="gp-actions">
        <button type="button" class="btn-save" disabled={gpBusy} on:click={saveGameplay}>
          {gpBusy ? '…' : 'Enregistrer le gameplay'}
        </button>
        <button type="button" class="btn-secondary" disabled={gpResetBusy} on:click={resetGameplay}>
          {gpResetBusy ? '…' : 'Réinitialiser (défaut code)'}
        </button>
      </div>
    {/if}
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
        Emoji + titre + XP par coche pour l’habitude du jour (cible 15 ; habitudes perso 10 ; RDV agenda 30). Les entrées retirées de la liste sont désactivées côté serveur.
      </p>
      <div class="daily-grid">
        {#each dailyTemplates as t, idx}
          <div class="daily-row">
            <AdminEmojiField bind:value={t.icon} ariaLabel="Icône" placeholder="🙂" />
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

  {#if gpTipKey && GP_TIPS[gpTipKey]}
    <div class="gp-tip-layer" transition:fade={{ duration: 200 }}>
      <button
        type="button"
        class="gp-tip-backdrop"
        aria-label="Fermer l’aide"
        on:click={closeGpTip}
      ></button>
      <div
        id="gp-tip-panel"
        class="gp-tip-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gp-tip-heading"
      >
        <div class="gp-tip-sheet-handle" aria-hidden="true"></div>
        <div class="gp-tip-sheet-head">
          <span class="gp-tip-sheet-icon" aria-hidden="true">✦</span>
          <h3 id="gp-tip-heading" class="gp-tip-sheet-title">Aide</h3>
        </div>
        <p class="gp-tip-sheet-body">{GP_TIPS[gpTipKey]}</p>
        <button type="button" class="gp-tip-sheet-btn" on:click={closeGpTip}>Fermer</button>
      </div>
    </div>
  {/if}
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
    min-width: 11rem;
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
  .crystal-row {
    margin-top: 6px;
    font-size: 0.82rem;
  }
  .crystal-balance {
    font-weight: 800;
    color: var(--cyan);
    font-family: 'Rajdhani', sans-serif;
  }
  .crystal-grant {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 4px;
  }
  .crystal-in {
    width: 4.5rem;
    padding: 5px 6px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-size: 0.78rem;
    font-family: 'Rajdhani', sans-serif;
  }
  .btn-crystal {
    padding: 5px 10px;
    border-radius: 8px;
    border: 1px solid var(--cyan)66;
    background: var(--cyan)18;
    color: var(--cyan);
    font-size: 0.76rem;
    font-weight: 700;
    cursor: pointer;
    font-family: 'Rajdhani', sans-serif;
    white-space: nowrap;
  }
  .btn-crystal:hover:not(:disabled) {
    border-color: var(--cyan);
    background: var(--cyan)28;
  }
  .btn-crystal:disabled {
    opacity: 0.55;
    cursor: wait;
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

  .gp-card-title {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 2px;
  }

  .gp-section {
    margin-bottom: 14px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }
  .gp-section:last-of-type {
    border-bottom: none;
  }
  .gp-h {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--cyan);
    margin-bottom: 8px;
    font-family: 'Rajdhani', sans-serif;
  }
  .gp-h > span:first-child {
    flex: 1 1 auto;
    min-width: 0;
  }

  /** Aide : petit disque bleu (::before) ; sur étroit, bouton transparent ≥44px pour le tactile */
  .gp-tip {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 0;
    margin: 0;
    border: none;
    background: transparent;
    color: #fff;
    font-weight: 800;
    font-style: italic;
    font-family: Georgia, 'Times New Roman', serif;
    cursor: pointer;
    line-height: 1;
    flex-shrink: 0;
    font-size: 0.62rem;
    isolation: isolate;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    min-width: 44px;
    min-height: 44px;
  }
  .gp-tip::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 1.15rem;
    height: 1.15rem;
    border-radius: 50%;
    background: linear-gradient(145deg, #2563eb 0%, #0ea5e9 100%);
    box-shadow: 0 1px 3px rgba(37, 99, 235, 0.35);
    z-index: -1;
  }
  @media (min-width: 901px) {
    .gp-tip {
      min-width: unset;
      min-height: unset;
      width: 1.15rem;
      height: 1.15rem;
    }
  }
  .gp-tip:hover::before,
  .gp-tip:focus-visible::before {
    filter: brightness(1.08);
  }
  .gp-tip:focus-visible {
    outline: 2px solid rgba(14, 165, 233, 0.7);
    outline-offset: 2px;
  }

  .gp-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    width: 100%;
    font-size: 0.68rem;
    color: var(--muted);
    font-family: 'Rajdhani', sans-serif;
  }
  .gp-label-row .gp-tip {
    flex-shrink: 0;
  }
  .gp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px 10px;
  }
  .gp-grid label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.68rem;
    color: var(--muted);
    font-family: 'Rajdhani', sans-serif;
  }
  .gp-grid input {
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font-size: 0.85rem;
  }
  .gp-full {
    display: block;
    width: 100%;
  }
  .gp-streak-input {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font-size: 0.85rem;
    font-family: inherit;
  }
  .gp-streak-rewards {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .gp-reward-block {
    padding: 12px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--surface);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .gp-reward-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: flex-end;
  }
  .gp-r-lbl {
    display: block;
    font-size: 0.72rem;
    color: var(--muted);
    margin-bottom: 4px;
  }
  .gp-r-compact {
    flex: 0 0 auto;
    min-width: 5.5rem;
  }
  .gp-r-compact input {
    width: 100%;
    box-sizing: border-box;
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font-size: 0.85rem;
  }
  .gp-r-grow {
    flex: 1 1 140px;
    min-width: 120px;
  }
  .gp-r-grow input {
    width: 100%;
    box-sizing: border-box;
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font-size: 0.85rem;
  }
  .gp-r-icon-wrap {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .gp-r-del {
    align-self: flex-end;
    margin-bottom: 2px;
  }
  .gp-r-full {
    display: block;
    width: 100%;
  }
  .gp-r-full input,
  .gp-r-full textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font-size: 0.85rem;
    font-family: inherit;
  }
  .gp-r-full textarea {
    resize: vertical;
    min-height: 2.5rem;
  }
  .gp-titles {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .gp-title-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .gp-t-from {
    width: 4rem;
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
  }
  .gp-t-label {
    flex: 1 1 120px;
    min-width: 100px;
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-size: 0.85rem;
  }
  .gp-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 12px;
    align-items: center;
  }
  .gp-actions .btn-save {
    margin-top: 0;
  }

  .gp-tip-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    border: none;
    padding: 0;
    margin: 0;
    background: rgba(15, 23, 42, 0.55);
    cursor: pointer;
  }

  .gp-tip-sheet {
    position: fixed;
    z-index: 1001;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    max-width: 100%;
    max-height: min(78vh, 560px);
    overflow: auto;
    margin: 0;
    padding: 18px 18px max(18px, env(safe-area-inset-bottom));
    border: 1px solid var(--border);
    border-bottom: none;
    border-radius: 18px 18px 0 0;
    background: var(--surface);
    color: var(--text);
    box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.28);
    box-sizing: border-box;
  }

  .gp-tip-sheet-title {
    margin: 0 0 10px;
    font-size: 1rem;
    font-weight: 700;
    font-family: 'Rajdhani', sans-serif;
    color: var(--cyan);
  }

  .gp-tip-sheet-body {
    margin: 0 0 16px;
    font-size: 0.88rem;
    line-height: 1.45;
    white-space: pre-wrap;
  }

  .gp-tip-sheet-btn {
    display: block;
    width: 100%;
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font-size: 0.9rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    min-height: 44px;
    box-sizing: border-box;
  }

  .gp-tip-sheet-btn:hover,
  .gp-tip-sheet-btn:focus-visible {
    filter: brightness(1.06);
    outline: 2px solid rgba(14, 165, 233, 0.55);
    outline-offset: 2px;
  }

  @media (min-width: 768px) {
    .gp-tip-sheet {
      left: 50%;
      right: auto;
      bottom: auto;
      top: 50%;
      transform: translate(-50%, -50%);
      width: min(92vw, 440px);
      max-height: min(82vh, 560px);
      border-radius: 16px;
      border: 1px solid var(--border);
      padding: 22px;
      padding-bottom: 22px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
    }

    .gp-tip-sheet-btn {
      width: auto;
      min-width: 120px;
      margin-left: auto;
    }
  }
</style>
