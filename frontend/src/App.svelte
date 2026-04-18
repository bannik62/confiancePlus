<script>
  /**
   * ── Flux après connexion (check-in humeur du JOUR, pas « première fois sur le compte ») ──
   *
   * 1. On charge le DailyLog du jour civil LOCAL : GET /checkin/today?date=YYYY-MM-DD
   * 2. Si une humeur 1–10 est déjà enregistrée pour CE jour → pas d’écran CheckIn,
   *    on ouvre l’app (Home) avec le « Message du jour » (phrases JSON selon l’humeur).
   * 3. Sinon → écran CheckIn (humeur + suite). Après validation, on repasse à l’app.
   *
   * Le bootstrap utilise loadTodayResilient ; client.js n’émet pas session:expired sur
   * GET /checkin/today ni sur POST /auth/login|register|activate (évite fausse déco / mauvais libellé).
   */
  import { onMount, tick } from 'svelte'
  import { get } from 'svelte/store'
  import { authStore, checkSession, clearAuth, isAppAdmin } from './stores/auth.js'
  import { tab }      from './stores/tab.js'
  import { loadToday, loadTodayResilient, resetDailyLog } from './stores/checkin.js'
  import { loadProfile, resetProfile } from './stores/profile.js'
  import { loadGroups, resetGroupState, isAssociationOwner, isEducatorAssociation } from './stores/group.js'
  import { resetDayMessageCache, setRemoteDayMessages } from './lib/dayMessage.js'
  import { loadDayMessagesPublic } from './api/content.js'
  import { hasMoodForToday } from './lib/checkinState.js'

  import Login   from './views/Login.svelte'
  import CheckIn from './views/CheckIn.svelte'
  import Home    from './views/Home.svelte'
  import Groupe  from './views/Groupe.svelte'
  import Stats   from './views/Stats.svelte'
  import Profil  from './views/Profil.svelte'
  import Agenda  from './views/Agenda.svelte'
  import Admin   from './views/Admin.svelte'
  import Topbar    from './components/modules/Topbar.svelte'
  import BottomNav from './components/modules/BottomNav.svelte'
  import AuthGuard from './components/modules/AuthGuard.svelte'

  const VIEWS = { home: Home, agenda: Agenda, groupe: Groupe, stats: Stats, profil: Profil }
  const TABS_STUDENT = [
    { key: 'home',   ico: '🏠', label: "Aujourd'hui" },
    { key: 'agenda', ico: '📅', label: 'Agenda'       },
    { key: 'groupe', ico: '👥', label: 'Groupe'       },
    { key: 'stats',  ico: '📊', label: 'Stats'        },
    { key: 'profil', ico: '⚙️', label: 'Profil'       },
  ]
  const TABS_EDUCATOR = [
    { key: 'home',   ico: '📋', label: 'Suivi'      },
    { key: 'agenda', ico: '📅', label: 'Agenda'     },
    { key: 'groupe', ico: '👥', label: 'Groupe'     },
    { key: 'stats',  ico: '📊', label: 'Stats'      },
    { key: 'profil', ico: '⚙️', label: 'Profil'     },
  ]
  $: bottomTabs = $isEducatorAssociation ? TABS_EDUCATOR : TABS_STUDENT

  let checkinDone   = false
  let loading       = true
  /** false tant que check-in du jour + profil pas chargés (évite flash CheckIn si déjà fait) */
  let sessionReady  = false
  /** Dernière session bootstrapée : userId + compteur authStore.session (chaque login incrémente) */
  let bootKey       = null

  async function bootstrapSession() {
    sessionReady = false
    try {
      await tick()
      await new Promise((r) => setTimeout(r, 50))
      try {
        const dm = await loadDayMessagesPublic()
        setRemoteDayMessages(dm)
      } catch {
        setRemoteDayMessages(null)
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
      await loadProfile()
      sessionReady = true
    } catch {
      /* 401 → session:expired peut avoir vidé authStore ; ne pas forcer sessionReady */
    }
  }

  onMount(async () => {
    await checkSession()
    loading = false

    const resetSessionUi = () => {
      authStore.set({ user: null, session: 0 })
      resetProfile()
      resetGroupState()
      bootKey = null
      sessionReady = false
      checkinDone = false
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
    sessionReady   = false
    checkinDone    = false
    resetGroupState()
    resetDailyLog()
    resetDayMessageCache()
  }

  const onCheckinDone = async () => {
    checkinDone = true
    resetDayMessageCache()
    await loadProfile()
    try {
      await loadToday()
    } catch {
      /* saveDailyLog a déjà mis à jour le store ; ne pas écraser si le GET échoue */
    }
  }

</script>

{#if loading}
  <div class="splash">Chargement…</div>

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

{:else if !checkinDone}
  <CheckIn on:done={onCheckinDone} />

{:else}
  <Topbar />

  <main>
    <AuthGuard>
      <svelte:component this={VIEWS[$tab]} />
    </AuthGuard>
  </main>

  <BottomNav TABS={bottomTabs} />
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
  }

  main {
    padding: 14px;
    padding-bottom: 80px;
  }
</style>
