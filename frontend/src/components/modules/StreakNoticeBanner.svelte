<script>
  import { profileStore } from '../../stores/profile.js'
  import { authStore, mergeUser } from '../../stores/auth.js'
  import { statsApi } from '../../api/stats.js'
  import { tab } from '../../stores/tab.js'

  let dismissed = false

  $: notice = $profileStore.streakNotice
  $: noticeKey = notice
    ? `${notice.kind}-${notice.streak ?? ''}-${notice.previousStreak ?? ''}-${notice.reason ?? ''}`
    : ''
  let lastKey = ''
  $: if (noticeKey !== lastKey) {
    lastKey = noticeKey
    dismissed = false
  }

  $: visible = !!notice && !dismissed

  let recoverLoading = false
  let recoverError = ''

  $: hasJoker = ($authStore.user?.jokerStreak ?? 0) >= 1

  /** @param {any} n */
  const messageFor = (n) => {
    if (!n) return ''
    if (n.kind === 'broken') {
      if (n.reason === 'half_habits') {
        return "Ta série s'est arrêtée : un jour tu n'avais pas validé la moitié des habitudes prévues. Aujourd'hui, tu reprends sur de bonnes bases."
      }
      if (n.reason === 'missed_visit') {
        return "Ta série s'est arrêtée : tu n'avais pas ouvert l'app un jour. Reviens chaque jour pour garder la flamme !"
      }
      return "Ta série a été interrompue. Ce n'est pas grave : chaque jour est une nouvelle chance."
    }
    if (n.kind === 'started') {
      return "Bienvenue : ta flamme du jour est allumée. Garde le rythme !"
    }
    if (n.kind === 'maintained') {
      const s = n.streak ?? 0
      if (s <= 1) {
        return "Ta flamme est toujours là. Continue comme ça !"
      }
      return `Bravo ! Ta flamme tient bon : ${s} jour${s > 1 ? 's' : ''} d'affilée.`
    }
    return ''
  }

  function applyProfileAfterRecover(data) {
    if (!data) return
    const patch = {}
    if (typeof data.cristaux === 'number') patch.cristaux = data.cristaux
    if (typeof data.jokerStreak === 'number') patch.jokerStreak = data.jokerStreak
    if (Object.keys(patch).length) mergeUser(patch)
    profileStore.set(data)
    dismissed = true
  }

  async function payRecoverJoker() {
    recoverError = ''
    recoverLoading = true
    try {
      const data = await statsApi.postStreakRecover({ payment: 'JOKER' })
      applyProfileAfterRecover(data)
    } catch (e) {
      recoverError =
        typeof e?.message === 'string' && e.message.length
          ? e.message
          : 'Impossible de sauver la série pour le moment.'
    } finally {
      recoverLoading = false
    }
  }

  function goToShop() {
    dismissed = true
    tab.set('shop')
  }
</script>

{#if visible}
  <div
    class="wrap"
    class:broken={notice.kind === 'broken'}
    class:maintained={notice.kind === 'maintained'}
    class:started={notice.kind === 'started'}
    role="status"
  >
    <p class="text">{messageFor(notice)}</p>
    <button type="button" class="close" on:click={() => (dismissed = true)} aria-label="Fermer">
      ×
    </button>

    {#if notice.kind === 'broken' && notice.recoverAvailable}
      <div class="recover">
        <p class="recoverHint">
          Rattrape <strong>hier</strong> une fois par jour avec <strong>1 joker de série</strong>
          {#if hasJoker}
            (tu en as un — tu peux l’utiliser ci-dessous).
          {:else}
            — achète-en un dans la <strong>boutique</strong> avec tes cristaux.
          {/if}
        </p>
        {#if recoverError}
          <p class="err" role="alert">{recoverError}</p>
        {/if}
        <div class="recoverActions">
          {#if hasJoker}
            <button
              type="button"
              class="btn primary"
              disabled={recoverLoading}
              title="Consommer 1 joker pour réparer la série d’hier"
              on:click={payRecoverJoker}
            >
              {recoverLoading ? '…' : 'Utiliser 1 joker'}
            </button>
          {:else}
            <button
              type="button"
              class="btn primary"
              disabled={recoverLoading}
              title="Ouvre la boutique pour acheter un joker de série"
              on:click={goToShop}
            >
              Aller à la boutique
            </button>
          {/if}
          <button type="button" class="btn link" disabled={recoverLoading} on:click={() => (dismissed = true)}>
            Annuler
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .wrap {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 10px;
    margin: 0 var(--app-gutter-x) 12px;
    padding: 12px 14px;
    border-radius: 12px;
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    line-height: 1.45;
    border: 1px solid var(--line, rgba(255, 255, 255, 0.12));
    position: relative;
  }
  .broken {
    background: rgba(220, 80, 80, 0.12);
    border-color: rgba(220, 80, 80, 0.35);
  }
  .maintained {
    background: rgba(80, 200, 120, 0.1);
    border-color: rgba(80, 200, 120, 0.35);
  }
  .started {
    background: rgba(255, 200, 100, 0.1);
    border-color: rgba(255, 200, 100, 0.35);
  }
  .text {
    flex: 1 1 100%;
    margin: 0;
    padding-right: 28px;
  }
  .close {
    position: absolute;
    top: 6px;
    right: 8px;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    color: var(--muted, #888);
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
    border-radius: 6px;
  }
  .close:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.06);
  }

  .recover {
    flex: 1 1 100%;
    margin-top: 4px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .recoverHint {
    margin: 0 0 10px;
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    color: var(--muted, #aaa);
  }
  .err {
    margin: 0 0 8px;
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    color: #f88;
  }
  .recoverActions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .btn {
    font: inherit;
    cursor: pointer;
    border-radius: 10px;
    padding: 8px 12px;
    border: 1px solid transparent;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn.primary {
    background: var(--cyan, #3ad);
    color: #0a0a12;
    font-weight: 600;
  }
  .btn.link {
    background: transparent;
    color: var(--muted, #888);
    text-decoration: underline;
  }
</style>
