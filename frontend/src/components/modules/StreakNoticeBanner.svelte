<script>
  import { profileStore } from '../../stores/profile.js'
  import { authStore, mergeUser } from '../../stores/auth.js'
  import { statsApi } from '../../api/stats.js'

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

  async function payRecover() {
    recoverError = ''
    recoverLoading = true
    try {
      const data = await statsApi.postStreakRecover({ payment: 'CRISTAUX' })
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
          Rattrape <strong>hier</strong> une fois par jour : soit
          <strong>{notice.recoverCostCristaux ?? 5} cristaux</strong>, soit
          <strong>1 joker de série</strong> si tu en as un.
        </p>
        {#if recoverError}
          <p class="err" role="alert">{recoverError}</p>
        {/if}
        <div class="recoverActions">
          <button
            type="button"
            class="btn primary"
            disabled={recoverLoading || ($authStore.user?.cristaux ?? 0) < (notice.recoverCostCristaux ?? 5)}
            on:click={payRecover}
          >
            {recoverLoading ? '…' : `Payer ${notice.recoverCostCristaux ?? 5} cristaux`}
          </button>
          <button
            type="button"
            class="btn ghost"
            disabled={recoverLoading || ($authStore.user?.jokerStreak ?? 0) < 1}
            title={($authStore.user?.jokerStreak ?? 0) < 1 ? 'Achète un joker dans la boutique' : 'Utilise 1 joker'}
            on:click={payRecoverJoker}
          >
            {recoverLoading ? '…' : 'Utiliser 1 joker'}
          </button>
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
    margin: 0 14px 12px;
    padding: 12px 14px;
    border-radius: 12px;
    font-size: 14px;
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
    font-size: 13px;
    color: var(--muted, #aaa);
  }
  .err {
    margin: 0 0 8px;
    font-size: 13px;
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
  .btn.ghost {
    background: rgba(255, 255, 255, 0.06);
    border-color: var(--line, rgba(255, 255, 255, 0.12));
    color: var(--muted, #aaa);
  }
  .btn.link {
    background: transparent;
    color: var(--muted, #888);
    text-decoration: underline;
  }
</style>
