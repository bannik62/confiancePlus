<script>
  import { profileStore } from '../../stores/profile.js'

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
  </div>
{/if}

<style>
  .wrap {
    display: flex;
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
    flex: 1;
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
</style>
