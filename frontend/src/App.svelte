<script>
  /**
   * ── Flux après connexion (check-in humeur du JOUR, pas « première fois sur le compte ») ──
   *
   * 1. On charge le DailyLog du jour civil LOCAL : GET /checkin/today?date=YYYY-MM-DD
   * 2. Si une humeur 1–10 est déjà enregistrée pour CE jour → pas d’écran CheckIn,
   *    on ouvre l’app (Home) avec le « Message du jour » (phrases JSON selon l’humeur).
   * 3. Sinon → écran CheckIn (humeur + suite). Après validation, on repasse à l’app.
   *
   * L’offre « habitude du jour » (DailyOfferModal) ne s’affiche qu’après le check-in humeur
   * du jour (checkinDone), une fois la session prête — sauf compte admin (pas d’offre).
   *
   * Le bootstrap utilise loadTodayResilient ; client.js n’émet pas session:expired sur
   * GET /checkin/today ni sur POST /auth/login|register|activate (évite fausse déco / mauvais libellé).
   */
  import { onMount, tick } from 'svelte'
  import { get } from 'svelte/store'
  import { authStore, checkSession, clearAuth, isAppAdmin, mergeUser } from './stores/auth.js'
  import { profileStore } from './stores/profile.js'
  import { openAppModal, appModal } from './stores/modal.js'
  import { statsApi } from './api/stats.js'
  import { tab }      from './stores/tab.js'
  import { loadToday, loadTodayResilient, resetDailyLog } from './stores/checkin.js'
  import { loadProfile, resetProfile } from './stores/profile.js'
  import { loadGroups, resetGroupState, isAssociationOwner, isEducatorAssociation } from './stores/group.js'
  import { resetDayMessageCache, setRemoteDayMessages } from './lib/dayMessage.js'
  import { loadDayMessagesPublic } from './api/content.js'
  import { loadGameplay } from './stores/gameplay.js'
  import { hasMoodForToday } from './lib/checkinState.js'
  import { habitsApi } from './api/habits.js'
  import { loadHabits } from './stores/habits.js'
  import { localDateString } from './lib/dateLocal.js'
  import DailyOfferModal from './components/habits/DailyOfferModal.svelte'

  import Login   from './views/Login.svelte'
  import Landing from './views/Landing.svelte'

  /** `/` = marketing ; `/login` etc. = même index.html (Apache FallbackResource) → Login */
  function isMarketingHome() {
    if (typeof window === 'undefined') return false
    const p = (window.location.pathname || '/').replace(/\/+$/, '') || '/'
    return p === '/'
  }
  import CheckIn from './views/CheckIn.svelte'
  import Home    from './views/Home.svelte'
  import Groupe  from './views/Groupe.svelte'
  import Stats   from './views/Stats.svelte'
  import Profil  from './views/Profil.svelte'
  import Agenda  from './views/Agenda.svelte'
  import Shop    from './views/Shop.svelte'
  import Admin   from './views/Admin.svelte'
  import Topbar    from './components/modules/Topbar.svelte'
  import StreakNoticeBanner from './components/modules/StreakNoticeBanner.svelte'
  import BottomNav from './components/modules/BottomNav.svelte'
  import AuthGuard from './components/modules/AuthGuard.svelte'
  import AppModal from './components/ui/AppModal.svelte'
  import UserItemsModal from './components/ui/UserItemsModal.svelte'
  import LevelGuideModal from './components/ui/LevelGuideModal.svelte'
  import AuroraBackground from './components/effects/AuroraBackground.svelte'
  import { resetAppModal } from './stores/modal.js'
  import { resetItemsModal } from './stores/itemsModal.js'
  import { resetLevelGuideModal } from './stores/levelGuideModal.js'

  const VIEWS = { home: Home, agenda: Agenda, groupe: Groupe, stats: Stats, profil: Profil, shop: Shop }
  const TABS_STUDENT = [
    { key: 'home',   ico: '🏠', label: "Aujourd'hui" },
    { key: 'agenda', ico: '📅', label: 'Agenda'       },
    { key: 'groupe', ico: '👥', label: 'Classement'   },
    { key: 'stats',  ico: '📊', label: 'Stats'        },
    { key: 'profil', ico: '👤', label: 'Profil'       },
  ]
  const TABS_EDUCATOR = [
    { key: 'home',   ico: '📋', label: 'Suivi'      },
    { key: 'agenda', ico: '📅', label: 'Agenda'     },
    { key: 'groupe', ico: '👥', label: 'Classement' },
    { key: 'stats',  ico: '📊', label: 'Stats'      },
    { key: 'profil', ico: '👤', label: 'Profil'     },
  ]
  $: bottomTabs = $isEducatorAssociation ? TABS_EDUCATOR : TABS_STUDENT

  let checkinDone   = false
  let loading       = true
  /** false tant que check-in du jour + profil pas chargés (évite flash CheckIn si déjà fait) */
  let sessionReady  = false
  /** Dernière session bootstrapée : userId + compteur authStore.session (chaque login incrémente) */
  let bootKey       = null
  /** Évite de rappeler l’API en boucle ; une nouvelle clé = nouveau login / session */
  let dailyOfferBootKeyDone = null

  let showDailyOffer = false
  let showDailyOfferExhausted = false
  let dailyOfferTemplate = null
  let dailyOfferLoading = false
  let dailyOfferError = ''
  let dailyOfferSlotFull = false

  const streakMilestoneSnoozeKey = () => {
    const uid = get(authStore).user?.id
    if (!uid) return null
    return `ht_streak7_snooze_${uid}_${localDateString()}`
  }

  function maybeOpenStreakMilestoneModal() {
    if (get(isAppAdmin)) return
    if (get(appModal).open) return
    try {
      const k = streakMilestoneSnoozeKey()
      if (k && sessionStorage.getItem(k)) return
    } catch {
      /* private mode */
    }
    const off = get(profileStore).streakMilestoneOffer
    if (!off) return
    openAppModal({
      variant: 'celebration',
      icon: off.icon ?? '🔥',
      heroImage: off.heroImage || null,
      title: off.title,
      body: off.body,
      primaryLabel: 'Recevoir le trophée',
      secondaryLabel: 'Plus tard',
      onSecondary: () => {
        try {
          const k = streakMilestoneSnoozeKey()
          if (k) sessionStorage.setItem(k, '1')
        } catch {
          /* ignore */
        }
      },
      onPrimary: async () => {
        const data = await statsApi.postStreakMilestoneClaim({ key: off.key })
        if (data && typeof data.streak7TrophyCount === 'number') {
          mergeUser({ streak7TrophyCount: data.streak7TrophyCount })
        }
        await loadProfile({ streakBanner: false })
      },
    })
  }

  async function tryDailyOfferChain() {
    await tryDailyOffer()
    if (get(isAppAdmin)) return
    if (showDailyOffer || showDailyOfferExhausted) return
    maybeOpenStreakMilestoneModal()
  }

  async function tryDailyOffer() {
    if (get(isAppAdmin)) return
    if (showDailyOffer && dailyOfferTemplate) return
    if (showDailyOfferExhausted) return
    try {
      const r = await habitsApi.getDailyOffer()
      dailyOfferSlotFull = !!r.slotFull
      if (r.eligible && r.slotFull && !r.offer) return
      if (r.eligible && r.exhausted) {
        try {
          const k = `ht_daily_offer_exhausted_${localDateString()}`
          if (sessionStorage.getItem(k)) return
          sessionStorage.setItem(k, '1')
        } catch {
          /* private mode */
        }
        showDailyOfferExhausted = true
        return
      }
      if (r.eligible && r.offer?.status === 'PENDING' && r.offer.template) {
        dailyOfferError = ''
        dailyOfferTemplate = r.offer.template
        showDailyOffer = true
      }
    } catch {
      /* ignore — retry possible depuis onCheckinDone */
    }
  }

  async function handleDailyDismiss() {
    dailyOfferLoading = true
    dailyOfferError = ''
    try {
      await habitsApi.dismissDailyOffer()
      showDailyOffer = false
      dailyOfferTemplate = null
      maybeOpenStreakMilestoneModal()
    } catch (e) {
      dailyOfferError =
        typeof e?.message === 'string' && e.message.length
          ? e.message
          : 'Impossible d’enregistrer ton choix.'
    } finally {
      dailyOfferLoading = false
    }
  }

  async function handleDailyAccept() {
    dailyOfferLoading = true
    dailyOfferError = ''
    try {
      const r = await habitsApi.acceptDailyOffer()
      if (r && typeof r.cristaux === 'number') mergeUser({ cristaux: r.cristaux })
      await loadHabits()
      showDailyOffer = false
      dailyOfferTemplate = null
      maybeOpenStreakMilestoneModal()
    } catch (e) {
      dailyOfferError =
        typeof e?.message === 'string' && e.message.length
          ? e.message
          : 'Impossible d’accepter l’offre pour le moment.'
    } finally {
      dailyOfferLoading = false
    }
  }

  async function bootstrapSession() {
    sessionReady = false
    showDailyOffer = false
    showDailyOfferExhausted = false
    dailyOfferTemplate = null
    dailyOfferError = ''
    dailyOfferSlotFull = false
    try {
      await tick()
      await new Promise((r) => setTimeout(r, 50))
      try {
        const dm = await loadDayMessagesPublic()
        setRemoteDayMessages(dm)
      } catch {
        setRemoteDayMessages(null)
      }
      try {
        await loadGameplay()
      } catch {
        /* aperçu XP : fallback constantes */
      }

      if (get(isAppAdmin)) {
        checkinDone = true
        sessionReady = true
        return
      }

      const log = await loadTodayResilient()
      let done = hasMoodForToday(log)
      const grps = await loadGroups()
      if (!done && isAssociationOwner(grps)) done = true
      checkinDone = done
      if (done) {
        await loadProfile({ streakBanner: true })
      }
      sessionReady = true
    } catch {
      /* 401 → session:expired peut avoir vidé authStore ; ne pas forcer sessionReady */
    }
  }

  onMount(async () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch((err) => {
        console.error('Service Worker:', err)
      })
    }

    await checkSession()
    loading = false

    const resetSessionUi = () => {
      authStore.set({ user: null, session: 0 })
      resetProfile()
      resetAppModal()
      resetItemsModal()
      resetLevelGuideModal()
      resetGroupState()
      bootKey = null
      dailyOfferBootKeyDone = null
      sessionReady = false
      checkinDone = false
      showDailyOffer = false
      showDailyOfferExhausted = false
      dailyOfferTemplate = null
      dailyOfferError = ''
      dailyOfferSlotFull = false
      resetDayMessageCache()
    }

    window.addEventListener('session:expired', resetSessionUi)

    window.addEventListener('session:suspended', () => {
      void clearAuth()
      resetSessionUi()
    })
  })

  // Chaque connexion (ou restauration cookie) incrémente session → nouvelle clé → re-bootstrap
  $: if (!loading && $authStore.user?.id) {
    const key = `${$authStore.user.id}:${$authStore.session ?? 0}`
    if (bootKey !== key) {
      bootKey = key
      bootstrapSession()
    }
  }

  $: if (!$authStore.user) {
    bootKey        = null
    dailyOfferBootKeyDone = null
    sessionReady   = false
    checkinDone    = false
    showDailyOffer = false
    showDailyOfferExhausted = false
    dailyOfferTemplate = null
    dailyOfferError = ''
    dailyOfferSlotFull = false
    resetAppModal()
    resetItemsModal()
    resetLevelGuideModal()
    resetGroupState()
    resetDailyLog()
    resetDayMessageCache()
  }

  /** Après sessionReady + check-in du jour : daily puis trophée série 7 (sans chevaucher le daily). */
  $: if (sessionReady && checkinDone && bootKey && $authStore.user?.id && !$isAppAdmin) {
    if (dailyOfferBootKeyDone !== bootKey) {
      dailyOfferBootKeyDone = bootKey
      queueMicrotask(() => void tryDailyOfferChain())
    }
  }

  const onCheckinDone = async () => {
    checkinDone = true
    resetDayMessageCache()
    await loadProfile({ streakBanner: true })
    try {
      await loadToday()
    } catch {
      /* saveDailyLog a déjà mis à jour le store ; ne pas écraser si le GET échoue */
    }
    void tryDailyOfferChain()
  }

</script>

{#if loading}
  <div class="splash">Chargement…</div>

{:else if !$authStore.user && isMarketingHome()}
  <Landing />

{:else if !$authStore.user}
  <Login />

{:else if $isAppAdmin}
  {#if !sessionReady}
    <div class="splash">Chargement…</div>
  {:else}
    <Admin />
  {/if}

{:else if !sessionReady}
  <div class="splash">Chargement…</div>

{:else}
  {#if showDailyOfferExhausted}
    <DailyOfferModal
      exhausted={true}
      onExhaustedOk={() => {
        showDailyOfferExhausted = false
      }}
    />
  {:else if showDailyOffer && dailyOfferTemplate}
    <DailyOfferModal
      template={dailyOfferTemplate}
      loading={dailyOfferLoading}
      errorMessage={dailyOfferError}
      slotFull={dailyOfferSlotFull}
      onDismiss={handleDailyDismiss}
      onAccept={handleDailyAccept}
    />
  {/if}

  {#if !checkinDone}
    <CheckIn on:done={onCheckinDone} />
  {:else}
    <AuroraBackground />
    <Topbar />
    <StreakNoticeBanner />

    <main>
      <AuthGuard>
        <svelte:component this={VIEWS[$tab]} />
      </AuthGuard>
    </main>

    <BottomNav TABS={bottomTabs} />
    <AppModal />
    <UserItemsModal />
    <LevelGuideModal />
  {/if}
{/if}

<style>
  .splash {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 2px;
  }
  :global(*) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(body) {
    background: var(--bg);
    color: var(--text);
    font-family: 'Exo 2', sans-serif;
    min-height: 100vh;
    min-height: 100dvh;
  }
  :global(#app) {
    min-height: 100vh;
    min-height: 100dvh;
  }

  main {
    padding: 14px var(--app-gutter-x);
    /*
     * Nav fixe en bas : hauteur réelle ~72–96px + home indicator.
     * Marge généreuse pour que le dernier contenu (ex. CTA) ne soit jamais sous la barre
     * — indépendamment du reflet WebKit (souvent un souci de calque / padding, pas seulement le reflet).
     */
    padding-bottom: calc(112px + env(safe-area-inset-bottom, 0px));
  }
</style>
