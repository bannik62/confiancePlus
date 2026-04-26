<script>
  import { gameplayStore } from '../../stores/gameplay.js'
  import { profileStore } from '../../stores/profile.js'
  import { levelGuideModal, closeLevelGuideModal } from '../../stores/levelGuideModal.js'
  import {
    sortedTitleMilestones,
    xpForLevelFromConfig,
    maxActiveHabitsFromConfig,
  } from '../../lib/xpScale.js'

  $: open = $levelGuideModal.open
  $: g = $gameplayStore
  $: userLevel = Math.max(0, Math.floor(Number($profileStore.level) || 0))
  $: userXp = Math.max(0, Math.floor(Number($profileStore.totalXP) || 0))

  const fmt = (n) =>
    typeof n === 'number' && Number.isFinite(n)
      ? n.toLocaleString('fr-FR')
      : '—'

  const close = () => closeLevelGuideModal()

  /** Palier « actif » pour la frise : dernier from ≤ niveau joueur. */
  const activeFrom = (rows, level) => {
    let best = null
    for (const r of rows) {
      if (r.from <= level && (best == null || r.from > best)) best = r.from
    }
    return best
  }

  /** Lignes enrichies (Svelte 4 : pas de `{@const}` dans le markup). */
  $: friezeRows = (() => {
    if (!g) return []
    const rows = sortedTitleMilestones(g)
    const here = activeFrom(rows, userLevel)
    return rows.map((row, i) => {
      const isLast = i === rows.length - 1
      const nextFrom = !isLast ? rows[i + 1]?.from : null
      const hasSpan = Number.isFinite(nextFrom) && nextFrom > row.from
      const levelToEnd = hasSpan ? nextFrom - 1 : null
      const levelSpan = hasSpan ? nextFrom - row.from : null
      return {
        ...row,
        xpAt: xpForLevelFromConfig(g, row.from),
        slots: maxActiveHabitsFromConfig(g, row.from),
        isLast,
        isHere: here === row.from,
        levelToEnd,
        levelSpan,
      }
    })
  })()
</script>

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="backdrop" on:click={close} role="presentation" aria-hidden="true"></div>
  <div
    class="panel"
    role="dialog"
    aria-modal="true"
    aria-labelledby="level-guide-title"
  >
    <header class="head">
      <div class="head-text">
        <h2 id="level-guide-title" class="title">Ton parcours de niveaux</h2>
        <p class="sub muted">
          Ici, tu vois <strong>quand ton titre change</strong> (l’icône à côté de « niveaux : »). Entre deux
          étapes, ton <strong>niveau (LVL)</strong> continue de monter, mais le titre reste le même — c’est
          voulu. Plus tu avances, plus il faut d’XP au total pour gagner un niveau.
        </p>
      </div>
      <button type="button" class="btn-close" on:click={close} aria-label="Fermer">×</button>
    </header>

    <div class="body">
      {#if !g}
        <p class="muted center">Chargement des infos… Réessaie dans un instant.</p>
      {:else}
        <div class="you-are" role="status">
          <span class="you-lvl">Niveau {userLevel}</span>
          <span class="you-xp muted">{fmt(userXp)} XP cumulés</span>
        </div>

        <div class="frieze" aria-label="Étapes des titres">
          {#each friezeRows as row (row.from)}
            <div class="step" class:here={row.isHere}>
              <div class="rail-col">
                <div class="dot" class:here={row.isHere} aria-hidden="true"></div>
                {#if !row.isLast}<div class="rail" aria-hidden="true"></div>{/if}
              </div>
              <article class="card" class:here={row.isHere}>
                {#if row.isHere}
                  <div class="pin" aria-hidden="true">Tu es ici</div>
                {/if}
                <div class="card-top">
                  <span class="ico" aria-hidden="true">{row.icon}</span>
                  <div class="card-head">
                    <h3 class="card-title">{row.label}</h3>
                    <p class="card-meta muted">
                      Tu débloques ce titre à partir du <strong>niveau {row.from}</strong> (indiqué par
                      <strong>LVL</strong> en haut), avec au moins <strong>{fmt(row.xpAt)}</strong> XP au compteur.
                      Tu peux garder jusqu’à <strong>{row.slots}</strong> habitudes actives à ce stade.
                    </p>
                    {#if row.levelSpan != null && row.levelToEnd != null}
                      <p class="card-range muted">
                        Avec ce titre, tu passes du <strong>niveau {row.from}</strong> au
                        <strong>niveau {row.levelToEnd}</strong> — soit <strong>{row.levelSpan}</strong>
                        {row.levelSpan === 1 ? 'niveau' : 'niveaux'} avant la prochaine étape.
                      </p>
                    {:else if row.isLast}
                      <p class="card-range muted">
                        À partir du <strong>niveau {row.from}</strong>, tu gardes ce titre pour la suite : il
                        n’y a pas d’étape suivante sur cette liste pour l’instant.
                      </p>
                    {/if}
                  </div>
                </div>
              </article>
            </div>
          {/each}
        </div>

        <p class="foot-note muted">
          Les seuils peuvent évoluer avec les mises à jour du jeu. Si quelque chose a changé, ferme puis
          rouvre cette fenêtre après un petit moment pour voir la version à jour.
        </p>
      {/if}
    </div>

    <footer class="foot">
      <button type="button" class="btn-done" on:click={close}>Fermer</button>
    </footer>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 225;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(2px);
  }

  .panel {
    position: fixed;
    z-index: 226;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(100% - 20px, 440px);
    max-height: min(90dvh, 640px);
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 18px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
    overflow: hidden;
  }

  @media (max-width: 520px) {
    .panel {
      left: 0;
      right: 0;
      top: auto;
      bottom: 0;
      transform: none;
      width: 100%;
      max-height: min(92dvh, 100%);
      border-radius: 18px 18px 0 0;
    }
  }

  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    padding: 16px 16px 12px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    background: linear-gradient(
      165deg,
      color-mix(in srgb, var(--cyan) 10%, var(--surface)),
      var(--surface)
    );
  }

  .title {
    margin: 0 0 6px;
    font-size: 1.12rem;
    font-weight: 900;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.06em;
    line-height: 1.2;
  }

  .sub {
    margin: 0;
    font-size: 0.78rem;
    line-height: 1.45;
    max-width: 52ch;
  }

  .muted {
    color: var(--muted);
  }

  .btn-close {
    min-width: 44px;
    min-height: 44px;
    margin: -8px -8px 0 0;
    border: none;
    background: transparent;
    color: var(--muted);
    font-size: 26px;
    line-height: 1;
    cursor: pointer;
    border-radius: 10px;
    flex-shrink: 0;
  }

  .btn-close:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.06);
  }

  .body {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 14px 14px 8px;
    flex: 1;
    min-height: 0;
  }

  .center {
    text-align: center;
    padding: 20px 8px;
    margin: 0;
  }

  .you-are {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 10px 14px;
    margin-bottom: 16px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--gold) 35%, var(--border));
    background: color-mix(in srgb, var(--gold) 8%, transparent);
  }

  .you-lvl {
    font-family: 'Rajdhani', sans-serif;
    font-weight: 900;
    font-size: 1rem;
    letter-spacing: 0.06em;
    color: #fff6e0;
  }

  .you-xp {
    font-size: 0.85rem;
  }

  .frieze {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding-bottom: 8px;
  }

  .step {
    display: flex;
    gap: 0;
    align-items: stretch;
  }

  .rail-col {
    width: 28px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    margin-top: 18px;
    background: linear-gradient(145deg, var(--cyan), var(--accent));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--cyan) 25%, transparent);
    flex-shrink: 0;
  }

  .dot.here {
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--gold) 45%, transparent),
      0 0 18px color-mix(in srgb, var(--gold) 55%, transparent);
  }

  .rail {
    flex: 1;
    width: 3px;
    min-height: 12px;
    margin: 4px 0 0;
    border-radius: 2px;
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--cyan) 55%, transparent),
      color-mix(in srgb, var(--accent) 35%, transparent)
    );
    opacity: 0.85;
  }

  .card {
    flex: 1;
    min-width: 0;
    margin: 0 0 10px 12px;
    padding: 12px 12px 12px 14px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--bg) 88%, var(--surface));
    position: relative;
  }

  .card.here {
    border-color: color-mix(in srgb, var(--gold) 50%, var(--border));
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--gold) 12%, var(--bg)),
      color-mix(in srgb, var(--bg) 90%, var(--surface))
    );
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--gold) 22%, transparent);
  }

  .pin {
    position: absolute;
    top: -1px;
    right: 10px;
    transform: translateY(-50%);
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-family: 'Rajdhani', sans-serif;
    padding: 4px 8px;
    border-radius: 999px;
    background: var(--gold);
    color: #1a1204;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  }

  .card-top {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .ico {
    font-size: 1.75rem;
    line-height: 1;
    flex-shrink: 0;
    filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
  }

  .card-head {
    min-width: 0;
    flex: 1;
  }

  .card-title {
    margin: 0 0 6px;
    font-size: 0.98rem;
    font-weight: 800;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.03em;
    line-height: 1.25;
  }

  .card-meta {
    margin: 0;
    font-size: 0.78rem;
    line-height: 1.45;
  }

  .card-range {
    margin: 8px 0 0;
    font-size: 0.76rem;
    line-height: 1.45;
    padding: 8px 10px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid color-mix(in srgb, var(--cyan) 18%, transparent);
  }

  .foot-note {
    font-size: 0.72rem;
    line-height: 1.4;
    margin: 12px 0 4px;
    padding-top: 10px;
    border-top: 1px dashed color-mix(in srgb, var(--muted) 35%, transparent);
  }

  .foot {
    flex-shrink: 0;
    padding: 10px 16px calc(12px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
    background: var(--surface);
  }

  .btn-done {
    font: inherit;
    cursor: pointer;
    border-radius: 10px;
    padding: 10px 20px;
    font-weight: 800;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.06em;
    border: 1px solid transparent;
    background: var(--cyan, #22d3ee);
    color: #0a0a12;
  }

  .btn-done:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
