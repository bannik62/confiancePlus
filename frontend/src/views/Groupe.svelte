<script>
  import { onMount } from 'svelte'
  import { authStore } from '../stores/auth.js'
  import { gameplayStore } from '../stores/gameplay.js'
  import { openItemsModal } from '../stores/itemsModal.js'
  import {
    groups, activeGroup, groupLeaderboard, globalLeaderboard,
    myRole, hasGroup, loadGroupData, loadGroupLeaderboard, loadGlobalLeaderboard, loadGroups,
  } from '../stores/group.js'
  import { groupApi } from '../api/group.js'
  import { habitsApi } from '../api/habits.js'
  import Tag  from '../components/ui/Tag.svelte'
  import Card from '../components/ui/Card.svelte'
  import PeerHabitsModal from '../components/group/PeerHabitsModal.svelte'

  // ── Onglet actif ─────────────────────────────────────────────────────────
  let tab = 'global'  // 'groupe' | 'global'

  // ── États UI ──────────────────────────────────────────────────────────────
  let loading      = true
  let error        = ''
  let inviteCode   = ''
  let inviteEmail    = ''
  let newCode      = null   // dernier code membre asso (persisté session pour copie / navigation)
  let memberCodePanelOpen = true // réduire = cache l’UI seulement, pas le stockage
  let lastPanelGroupId    = null
  let showJoinForm = false
  let sharingSaving = false

  const memberCodeKey = (userId, groupId) =>
    `habitTracker:assocMemberCode:${userId}:${groupId}`

  const readStoredMemberCode = (userId, groupId) => {
    if (!userId || !groupId || typeof sessionStorage === 'undefined') return null
    return sessionStorage.getItem(memberCodeKey(userId, groupId))
  }

  const persistMemberCode = (userId, groupId, code) => {
    if (!userId || !groupId || typeof sessionStorage === 'undefined' || !code) return
    sessionStorage.setItem(memberCodeKey(userId, groupId), code)
  }

  onMount(async () => {
    await loadGroupData()
    // Si l'user est dans un groupe → onglet groupe par défaut
    if ($hasGroup) tab = 'groupe'
    loading = false
  })

  // Dernier code généré par groupe (session) — survit navigation / onglet tant que l’onglet navigateur reste ouvert
  $: if (!loading && $authStore.user?.id && $activeGroup?.id) {
    const s = readStoredMemberCode($authStore.user.id, $activeGroup.id)
    newCode = s || null
  }

  $: if (!loading && $activeGroup?.id && $activeGroup.id !== lastPanelGroupId) {
    lastPanelGroupId = $activeGroup.id
    memberCodePanelOpen = true
  }

  // ── Médale ────────────────────────────────────────────────────────────────
  const medal = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`

  // ── Surligner l'user courant dans le classement ───────────────────────────
  const isMe = (id) => id === $authStore.user?.id

  // ── Rejoindre un groupe ───────────────────────────────────────────────────
  const joinGroup = async () => {
    error = ''
    try {
      await groupApi.join(inviteCode)
      inviteCode = ''
      showJoinForm = false
      await loadGroupData()
      tab = 'groupe'
    } catch (e) { error = e.message }
  }

  // ── Créer un membre (éducateur) ───────────────────────────────────────────
  const createMember = async () => {
    error = ''
    try {
      const res = await groupApi.createMember($activeGroup.id, { email: inviteEmail })
      newCode = res.activationCode
      persistMemberCode($authStore.user.id, $activeGroup.id, newCode)
      memberCodePanelOpen = true
      inviteEmail = ''
      await loadGroupLeaderboard($activeGroup.id)
    } catch (e) { error = e.message }
  }

  const switchGroup = async (g) => {
    activeGroup.set(g)
    await loadGroupLeaderboard(g.id)
  }

  const setSensitiveSharing = async (checked) => {
    if (!$activeGroup?.id) return
    sharingSaving = true
    error = ''
    try {
      await groupApi.patchSensitiveSharing($activeGroup.id, {
        shareSensitiveCheckinWithOwner: checked,
      })
      await loadGroups()
      if ($activeGroup?.id) await loadGroupLeaderboard($activeGroup.id)
    } catch (e) {
      error = e.message
    } finally {
      sharingSaving = false
    }
  }

  let peerOpen = false
  let peerLoading = false
  let peerError = ''
  let peerData = null
  let peerTitle = 'Habitudes'

  const closePeerHabits = () => {
    peerOpen = false
    peerError = ''
  }

  $: lbStreakTrophyImg = (() => {
    const rw = $gameplayStore?.streak?.rewards
    const h = Array.isArray(rw) && rw[0] ? rw[0].heroImage : null
    return typeof h === 'string' && h.trim() ? h.trim() : '/badges/fireStreackBadge/1000002186.png'
  })()

  const openMemberItems = (m) => {
    openItemsModal({
      title: m.username ? `Objets — ${m.username}` : 'Objets',
      username: m.username,
      avatar: m.avatar,
      cristaux: m.cristaux ?? 0,
      jokerStreak: m.jokerStreak ?? 0,
      streak7TrophyCount: m.streak7TrophyCount ?? 0,
      trophyImageSrc: lbStreakTrophyImg,
    })
  }

  const openPeerHabits = async (m) => {
    peerTitle = m.username ? `Habitudes — ${m.username}` : 'Habitudes'
    peerOpen = true
    peerLoading = true
    peerError = ''
    peerData = null
    try {
      peerData = await habitsApi.getPublicHabits(m.id)
    } catch (e) {
      peerError =
        typeof e?.message === 'string' && e.message.length
          ? e.message
          : 'Impossible d’afficher les habitudes.'
    } finally {
      peerLoading = false
    }
  }
</script>

{#if loading}
  <div class="loading">Chargement…</div>
{:else}

<!-- ── Onglets ─────────────────────────────────────────────────────────── -->
<div class="tabs">
  <button class:active={tab === 'groupe'} on:click={() => tab = 'groupe'}>
    👥 Mon groupe
  </button>
  <button class:active={tab === 'global'} on:click={() => { tab = 'global'; loadGlobalLeaderboard() }}>
    🌍 Classement global
  </button>
</div>

{#if error}<p class="error">{error}</p>{/if}

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- ONGLET MON GROUPE -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if tab === 'groupe'}

  {#if !$hasGroup}
    <!-- ── Pas de groupe ───────────────────────────────────────────────── -->
    <Card>
      <p class="hint">Tu n'es encore dans aucun groupe.</p>
      {#if !showJoinForm}
        <button class="btn-outline" on:click={() => showJoinForm = true}>
          Rejoindre avec un code d'invitation
        </button>
      {:else}
        <div class="form-row">
          <input bind:value={inviteCode} placeholder="Code d'invitation" />
          <button class="btn-primary sm" on:click={joinGroup}>Rejoindre</button>
        </div>
      {/if}
    </Card>

  {:else}
    <!-- ── Sélecteur si plusieurs groupes ─────────────────────────────── -->
    {#if $groups.length > 1}
      <div class="group-selector">
        {#each $groups as g}
          <button
            class="group-pill"
            class:active={$activeGroup?.id === g.id}
            on:click={() => switchGroup(g)}
          >{g.name}</button>
        {/each}
      </div>
    {/if}

    <!-- ── Header groupe ──────────────────────────────────────────────── -->
    <div class="group-header">
      <div>
        <div class="group-name">{$activeGroup?.name}</div>
        <div class="group-meta">
          <Tag color={$activeGroup?.type === 'ASSOCIATION' ? 'var(--accent)' : 'var(--cyan)'}>
            {$activeGroup?.type === 'ASSOCIATION' ? 'Association' : 'Amis'}
          </Tag>
          <span class="muted">{$activeGroup?._count?.members} membres</span>
          {#if $myRole === 'OWNER'}
            <Tag color="var(--gold)">Éducateur</Tag>
          {/if}
        </div>
      </div>

      <!-- Code invitation pour OWNER FRIENDS -->
      {#if $myRole === 'OWNER' && $activeGroup?.type === 'FRIENDS'}
        <div class="invite-box">
          <div class="micro muted">CODE D'INVITATION</div>
          <div class="invite-code">{$activeGroup?.inviteCode}</div>
        </div>
      {/if}
    </div>

    {#if $myRole === 'MEMBER' && $activeGroup?.type === 'ASSOCIATION'}
      <Card style="margin-bottom:14px;border-left:3px solid var(--accent)">
        <div class="micro" style="color:var(--accent);margin-bottom:6px">TRANSPARENCE — VUE ÉDUCATEUR</div>
        <p class="consent-copy">
          Le <strong>responsable</strong> de cette association peut consulter ton <strong>classement</strong>,
          tes <strong>habitudes</strong> cochées et des <strong>statistiques agrégées</strong> pour t’accompagner.
          Par défaut, l’<strong>humeur</strong>, la <strong>phrase mémorable</strong> (motif) et le
          <strong>journal</strong> du check-in <strong>ne sont pas</strong> partagés.
        </p>
        <label class="share-row">
          <input
            type="checkbox"
            checked={$activeGroup?.shareSensitiveCheckinWithOwner === true}
            disabled={sharingSaving}
            on:change={(e) => setSensitiveSharing(e.currentTarget.checked)}
          />
          <span>
            J’autorise le responsable du groupe à voir aussi mon <strong>humeur</strong>, la phrase liée et mon
            <strong>journal</strong> du check-in (révocable à tout moment).
          </span>
        </label>
      </Card>
    {/if}

    <!-- ── Leaderboard groupe ─────────────────────────────────────────── -->
    <div class="board">
      {#each $groupLeaderboard as m, i}
        <div class="row-member" class:top={i===0} class:me={isMe(m.id)}>
          <span class="medal">{medal(i)}</span>
          <span class="ava">{m.avatar}</span>
          <div class="info">
            <div class="uname">
              {m.username}
              {#if isMe(m.id)}<span class="you-badge">toi</span>{/if}
            </div>
            <div class="tags-row">
              <Tag color="var(--gold)">LVL {m.level}</Tag>
              {#if m.title}
                <span class="lb-title-tag">
                  <Tag color="var(--green)">{m.title.icon} {m.title.label}</Tag>
                </span>
              {/if}
              <span class="perf-react-pill" title="Réactions ❤️ reçues sur les perfs">❤️ {m.perfReactionHearts ?? 0}</span>
              <span class="perf-react-pill" title="Réactions 🤔 reçues sur les perfs">🤔 {m.perfReactionSkeptics ?? 0}</span>
              <button
                type="button"
                class="lb-items"
                aria-haspopup="dialog"
                aria-label="Objets de {m.username ?? 'membre'}"
                on:click|stopPropagation={() => openMemberItems(m)}
              >
                <span class="lb-items-lbl" aria-hidden="true">Items</span>
                <span class="lb-items-vals">
                  <span class="lb-cristaux" title="Cristaux">💎 {m.cristaux ?? 0}</span>
                  {#if (m.jokerStreak ?? 0) > 0}
                    <span class="lb-joker" title="Joker(s) de série en stock">🃏 {m.jokerStreak}</span>
                  {/if}
                  {#if (m.streak7TrophyCount ?? 0) > 0}
                    <span class="lb-streak7" title="Trophées série — collection dans la fenêtre Objets">
                      <img src={lbStreakTrophyImg} alt="" class="lb-streak7-img" />
                    </span>
                  {/if}
                </span>
              </button>
              {#if m.streak > 0}
                <Tag color="var(--red)">🔥 {m.streak}</Tag>
              {:else}
                <span class="micro muted streak-hint">Pas encore connecté aujourd’hui</span>
              {/if}
            </div>
          </div>
          <div class="actions-col">
            <div class="xp-stack">
              <div class="xp-val">{m.totalXP.toLocaleString()}</div>
              <div class="micro muted">XP</div>
            </div>
            {#if !isMe(m.id)}
              <button
                type="button"
                class="btn-habits"
                on:click|stopPropagation={() => openPeerHabits(m)}
                aria-label="Habitudes de {m.username}"
              >
                <span class="btn-habits-ico" aria-hidden="true">📋</span>
                <span class="btn-habits-txt">Habitudes</span>
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <!-- ── Panel éducateur (OWNER ASSOCIATION) ───────────────────────── -->
    {#if $myRole === 'OWNER' && $activeGroup?.type === 'ASSOCIATION'}
      <div class="educator-panel">
        <div class="panel-title micro">INVITER PAR E-MAIL</div>
        <div class="form-row educator-invite">
          <input type="email" bind:value={inviteEmail} placeholder="eleve@email.fr" class="email-invite" />
          <button class="btn-primary sm" on:click={createMember}>Générer le code</button>
        </div>

        {#if newCode}
          <div class="code-result">
            {#if memberCodePanelOpen}
              <span class="micro muted">CODE À TRANSMETTRE — une activation consomme le code</span>
              <div class="generated-code">{newCode}</div>
              <span class="micro muted">Dernier code sur cet appareil (onglet ouvert). Invalide si l’élève s’est déjà activé.</span>
              <button type="button" class="btn-code-toggle" on:click={() => memberCodePanelOpen = false}>Réduire</button>
            {:else}
              <span class="micro muted">Code mémorisé sur cet appareil — tu peux le réafficher quand tu veux.</span>
              <button type="button" class="btn-code-toggle primary" on:click={() => memberCodePanelOpen = true}>Afficher le dernier code</button>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  {/if}

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- ONGLET CLASSEMENT GLOBAL -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{:else if tab === 'global'}

  <div class="micro muted section-label">CLASSEMENT GLOBAL — {$globalLeaderboard.length} joueurs</div>

  <div class="board">
    {#each $globalLeaderboard as m, i}
      <div class="row-member" class:top={i===0} class:me={isMe(m.id)}>
        <span class="medal">{medal(i)}</span>
        <span class="ava">{m.avatar}</span>
        <div class="info">
          <div class="uname">
            {m.username}
            {#if isMe(m.id)}<span class="you-badge">toi</span>{/if}
          </div>
          {#if m.groupNames?.length}
            <div class="group-chips" aria-label="Groupes">
              {#each m.groupNames as gname}
                <span class="group-chip">👥 {gname}</span>
              {/each}
            </div>
          {/if}
          <div class="tags-row">
            <Tag color="var(--gold)">LVL {m.level}</Tag>
            {#if m.title}
              <span class="lb-title-tag">
                <Tag color="var(--green)">{m.title.icon} {m.title.label}</Tag>
              </span>
            {/if}
            <span class="perf-react-pill" title="Réactions ❤️ reçues sur les perfs">❤️ {m.perfReactionHearts ?? 0}</span>
            <span class="perf-react-pill" title="Réactions 🤔 reçues sur les perfs">🤔 {m.perfReactionSkeptics ?? 0}</span>
            <button
              type="button"
              class="lb-items"
              aria-haspopup="dialog"
              aria-label="Objets de {m.username ?? 'membre'}"
              on:click|stopPropagation={() => openMemberItems(m)}
            >
              <span class="lb-items-lbl" aria-hidden="true">Items</span>
              <span class="lb-items-vals">
                <span class="lb-cristaux" title="Cristaux">💎 {m.cristaux ?? 0}</span>
                {#if (m.jokerStreak ?? 0) > 0}
                  <span class="lb-joker" title="Joker(s) de série en stock">🃏 {m.jokerStreak}</span>
                {/if}
                {#if (m.streak7TrophyCount ?? 0) > 0}
                  <span class="lb-streak7" title="Trophées série — collection dans la fenêtre Objets">
                    <img src={lbStreakTrophyImg} alt="" class="lb-streak7-img" />
                  </span>
                {/if}
              </span>
            </button>
            {#if m.streak > 0}
              <Tag color="var(--red)">🔥 {m.streak}</Tag>
            {:else}
              <span class="micro muted streak-hint">Pas encore connecté aujourd’hui</span>
            {/if}
          </div>
        </div>
        <div class="actions-col">
          <div class="xp-stack">
            <div class="xp-val">{m.totalXP.toLocaleString()}</div>
            <div class="micro muted">XP</div>
          </div>
          {#if !isMe(m.id)}
            <button
              type="button"
              class="btn-habits"
              on:click|stopPropagation={() => openPeerHabits(m)}
              aria-label="Habitudes de {m.username}"
            >
              <span class="btn-habits-ico" aria-hidden="true">📋</span>
              <span class="btn-habits-txt">Habitudes</span>
            </button>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}

<PeerHabitsModal
  open={peerOpen}
  title={peerTitle}
  data={peerData}
  loading={peerLoading}
  error={peerError}
  onClose={closePeerHabits}
  on:updated={(e) => { peerData = e.detail }}
/>

{/if}

<style>
  /* ── Onglets ── */
  .tabs {
    display: flex; gap: 4px;
    background: var(--bg); border-radius: 12px; padding: 4px;
    margin-bottom: 14px;
  }
  .tabs button {
    flex: 1; padding: 9px 8px; border: none; border-radius: 9px;
    background: transparent; color: var(--muted);
    font-size: .85rem; cursor: pointer; transition: all .2s;
    font-family: 'Rajdhani', sans-serif; font-weight: 600; letter-spacing: 1px;
  }
  .tabs button.active { background: var(--accent); color: #fff; }

  /* ── Rows ── */
  .board { display: flex; flex-direction: column; gap: 8px; }

  .row-member {
    background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
    padding: 12px 14px; display: flex; align-items: center; gap: 12px;
    flex-wrap: wrap;
    transition: all 0.15s;
  }
  .row-member.top { border-color: var(--gold)66; box-shadow: 0 0 14px var(--gold)44; }
  .row-member.me  { border-color: var(--accent)99; box-shadow: 0 0 10px var(--accent)44; }
  .row-member.top.me {
    border-color: color-mix(in srgb, var(--gold) 70%, #f59e0b 30%);
    box-shadow: 0 0 16px color-mix(in srgb, var(--gold) 50%, transparent);
  }

  .medal { font-size: 14px; color: var(--muted); font-weight: 900; width: 24px; text-align: center; }
  .top .medal { color: var(--gold); }

  .ava {
    width: 44px; height: 44px; border-radius: 12px;
    background: var(--accent)22; border: 2px solid var(--accent)44;
    display: flex; align-items: center; justify-content: center; font-size: 22px;
  }
  .info { flex: 1; min-width: min(100%, 140px); }
  .uname { font-weight: 900; font-size: 15px; display: flex; align-items: center; gap: 6px; }
  .tags-row { display: flex; gap: 5px; margin-top: 4px; flex-wrap: wrap; align-items: center; }
  .lb-title-tag {
    max-width: min(100%, 16rem);
    line-height: 1.25;
  }
  .lb-title-tag :global(.tag) {
    display: inline-block;
    max-width: 100%;
    white-space: normal;
    word-break: break-word;
    line-height: 1.25;
  }
  .perf-react-pill {
    font-size: 0.82rem;
    font-weight: 800;
    padding: 4px 9px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: rgba(255, 255, 255, 0.05);
    color: var(--muted);
    white-space: nowrap;
    line-height: 1.2;
  }
  .streak-hint {
    line-height: 1.35;
    max-width: 100%;
  }
  button.lb-items {
    font: inherit;
    color: inherit;
    text-align: inherit;
    cursor: pointer;
  }
  button.lb-items:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .lb-items {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    flex-wrap: wrap;
    max-width: 100%;
    padding: 6px 13px;
    border-radius: 12px;
    box-sizing: border-box;
    background: linear-gradient(
      148deg,
      color-mix(in srgb, var(--accent) 22%, transparent),
      color-mix(in srgb, var(--cyan) 14%, transparent)
    );
    border: 1px solid color-mix(in srgb, var(--cyan) 42%, transparent);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.07),
      0 2px 14px rgba(0, 0, 0, 0.14);
  }
  .lb-items-lbl {
    font-size: 10.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--text) 58%, transparent);
    font-family: 'Rajdhani', sans-serif;
    font-weight: 800;
    flex-shrink: 0;
    opacity: 0.92;
  }
  .lb-items-vals {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .lb-joker {
    font-size: 0.88rem;
    font-weight: 800;
    color: #f0abfc;
    text-shadow:
      0 0 6px rgba(168, 85, 247, 0.75),
      0 0 12px rgba(236, 72, 153, 0.4);
    white-space: nowrap;
    font-family: 'Rajdhani', sans-serif;
  }
  .lb-streak7 {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    white-space: nowrap;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 800;
    font-size: 0.86rem;
    color: var(--gold);
  }
  .lb-streak7-img {
    width: 1.55rem;
    height: 1.55rem;
    object-fit: contain;
    display: block;
  }
  .lb-cristaux {
    font-size: 0.88rem;
    font-weight: 800;
    color: var(--cyan);
    white-space: nowrap;
    font-family: 'Rajdhani', sans-serif;
  }

  .group-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 6px;
    margin: 4px 0 2px;
  }
  .group-chip {
    font-size: 10px;
    color: var(--muted);
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.4px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 2px 7px;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .you-badge {
    font-size: 10px; background: var(--accent); color: #fff;
    border-radius: 6px; padding: 1px 6px;
    font-family: 'Rajdhani', sans-serif; letter-spacing: 1px;
  }

  .actions-col {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    flex-shrink: 0;
    margin-left: auto;
  }

  @media (max-width: 400px) {
    .actions-col {
      width: 100%;
      margin-left: 0;
      justify-content: space-between;
      padding-top: 4px;
      border-top: 1px solid var(--border);
    }
  }

  .xp-stack { text-align: right; min-width: 0; }
  .xp-val { font-weight: 900; font-size: 16px; color: var(--gold); }

  .btn-habits {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 44px;
    min-width: 44px;
    padding: 0 12px;
    border: 1px solid var(--accent)55;
    border-radius: 12px;
    background: var(--accent)18;
    color: var(--text);
    font-size: 0.8rem;
    font-weight: 700;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.5px;
    cursor: pointer;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
  }

  .btn-habits:hover {
    background: var(--accent)30;
    border-color: var(--accent)88;
  }

  .btn-habits-ico {
    font-size: 1rem;
    line-height: 1;
  }

  @media (max-width: 380px) {
    .btn-habits-txt {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .btn-habits {
      padding: 0 10px;
    }
  }

  /* ── Header groupe ── */
  .group-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 14px;
  }
  .group-name { font-size: 1.2rem; font-weight: 900; font-family: 'Rajdhani', sans-serif; }
  .group-meta { display: flex; align-items: center; gap: 8px; margin-top: 5px; }

  .invite-box { text-align: right; }
  .invite-code {
    font-family: 'Rajdhani', sans-serif; font-size: 1.1rem;
    color: var(--cyan); letter-spacing: 3px; font-weight: 700;
    background: var(--cyan)22; border: 1px solid var(--cyan)44;
    border-radius: 8px; padding: 4px 10px; margin-top: 4px;
  }

  /* ── Panel éducateur ── */
  .educator-panel {
    margin-top: 16px; background: var(--surface);
    border: 1px solid var(--accent)44; border-radius: 14px; padding: 14px;
    display: flex; flex-direction: column; gap: 10px;
  }
  .panel-title { color: var(--accent); margin-bottom: 4px; }

  .code-result {
    background: var(--bg); border: 1px solid var(--gold)44;
    border-radius: 10px; padding: 12px;
    display: flex; flex-direction: column; gap: 4px; align-items: center;
  }
  .generated-code {
    font-family: 'Rajdhani', sans-serif; font-size: 2rem;
    font-weight: 900; color: var(--gold); letter-spacing: 6px;
  }
  .btn-code-toggle {
    margin-top: 8px;
    padding: 6px 14px;
    font-size: 0.78rem;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.5px;
  }
  .btn-code-toggle:hover { border-color: var(--accent); color: var(--text); }
  .btn-code-toggle.primary {
    margin-top: 10px;
    border-color: var(--gold)66;
    color: var(--gold);
  }
  .btn-code-toggle.primary:hover {
    border-color: var(--gold);
    color: #fff;
    background: var(--gold)33;
  }

  /* ── Sélecteur groupes ── */
  .group-selector { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
  .group-pill {
    padding: 5px 12px; border-radius: 20px; font-size: .82rem;
    border: 1px solid var(--border); background: transparent; color: var(--muted); cursor: pointer;
  }
  .group-pill.active { background: var(--accent); border-color: var(--accent); color: #fff; }

  /* ── Formulaires ── */
  .form-row { display: flex; gap: 8px; }
  .educator-invite { flex-wrap: wrap; align-items: center; }
  .email-invite { flex: 1 1 200px; min-width: 0; }
  input {
    flex: 1; background: var(--bg); border: 1px solid var(--border);
    border-radius: 8px; color: var(--text); font-size: .9rem; padding: 9px 12px;
  }
  .btn-primary {
    background: var(--accent); border: none; border-radius: 8px;
    color: #fff; font-weight: 700; padding: 9px 16px; cursor: pointer; white-space: nowrap;
  }
  .btn-outline {
    width: 100%; background: transparent; border: 1px solid var(--accent)66;
    border-radius: 8px; color: var(--accent); padding: 10px; cursor: pointer; margin-top: 8px;
  }
  .sm { padding: 9px 14px; font-size: .85rem; }

  /* ── Misc ── */
  .micro   { font-size: 10px; letter-spacing: 2px; font-family: 'Rajdhani', sans-serif; }
  .muted   { color: var(--muted); }
  .hint    { color: var(--muted); font-size: .9rem; margin-bottom: 12px; }
  .error   { color: var(--red); font-size: .85rem; margin-bottom: 8px; }
  .loading { color: var(--muted); text-align: center; padding: 40px 0; }
  .section-label { margin-bottom: 12px; }

  .consent-copy {
    font-size: 0.86rem;
    line-height: 1.5;
    color: var(--text);
    margin: 0 0 12px;
  }
  .share-row {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    font-size: 0.84rem;
    line-height: 1.45;
    color: var(--text);
    cursor: pointer;
  }
  .share-row input {
    flex: 0 0 auto;
    margin-top: 3px;
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
  }
  .share-row input:disabled {
    opacity: 0.55;
    cursor: wait;
  }
</style>
