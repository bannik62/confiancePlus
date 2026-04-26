<script>
  import { createEventDispatcher } from 'svelte'
  import { fly } from 'svelte/transition'
  import { saveDailyLog } from '../stores/checkin.js'

  const dispatch = createEventDispatcher()

  let mood = 0, hovered = 0, reason = '', step = 1
  $: active = hovered || mood
  $: label  = active <= 3 ? 'Difficile 😔' : active <= 5 ? 'Moyen 😐' : active <= 7 ? 'Bien 🙂' : active <= 9 ? 'Super 😄' : 'En feu 🤩'
  $: moodColor = active <= 3 ? 'var(--red)' : active <= 5 ? 'var(--gold)' : active <= 7 ? 'var(--cyan)' : 'var(--green)'

  const emojiFor = (n) => n <= 2 ? '😔' : n <= 4 ? '😕' : n <= 6 ? '😐' : n <= 8 ? '🙂' : n === 9 ? '😄' : '🤩'

  const submit = async () => {
    await saveDailyLog({ mood, moodReason: reason })
    dispatch('done')
  }
</script>

<div class="page">
  {#if step === 1}
    <div class="header" in:fly={{ y: 14, duration: 350 }}>
      <div class="sup">DAILY CHECK-IN</div>
      <h2>Comment tu te sens<br /><span>aujourd'hui ?</span></h2>
      <p class="hint">
        Ce n’est pas ta « première connexion », mais ton <strong>état d’esprit du jour</strong> (calendrier local).
        Si tu as déjà répondu aujourd’hui, tu verras directement l’accueil avec un message motivant.
      </p>
    </div>

    <div class="grid">
      {#each Array.from({ length: 10 }, (_, i) => i + 1) as n}
        {@const sel = n <= active}
        {@const c   = n <= 3 ? 'var(--red)' : n <= 5 ? 'var(--gold)' : n <= 7 ? 'var(--cyan)' : 'var(--green)'}
        <button
          class="mood-btn"
          class:selected={sel}
          style="--c: {c}"
          on:mouseenter={() => hovered = n}
          on:mouseleave={() => hovered = 0}
          on:click={() => mood = n}
        >
          <span>{emojiFor(n)}</span>
          <span class="n">{n}</span>
        </button>
      {/each}
    </div>

    {#if active > 0}
      <div class="mood-label" style="color: {moodColor}">{label}</div>
    {/if}

    <button class="cta" disabled={!mood} on:click={() => step = 2}>SUIVANT →</button>

  {:else}
    <div class="header">
      <div class="sup">OPTIONNEL</div>
      <h2>Pourquoi ?</h2>
      <p>Une phrase, un mot, une image mentale.</p>
    </div>

    <textarea bind:value={reason} placeholder="Ex : j'ai mal dormi, grosse journée..."></textarea>

    <div class="actions">
      <button class="back" on:click={() => { hovered = 0; step = 1 }}>← RETOUR</button>
      <button class="cta" on:click={submit}>C'EST PARTI ⚡</button>
    </div>
  {/if}
</div>

<style>
  .page {
    min-height: 100vh;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: radial-gradient(ellipse at 50% 25%, var(--checkin-radial) 0%, var(--bg) 65%);
    padding: 24px;
    gap: 20px;
  }
  .sup { font-size: clamp(15px, 0.72rem + 0.28vw, 17px); color: var(--accent); letter-spacing: 4px; font-family: 'Rajdhani', sans-serif; margin-bottom: 8px; }
  h2   { font-size: 26px; font-weight: 900; line-height: 1.3; text-align: center; }
  h2 span { color: var(--text); }
  .hint {
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px); color: var(--muted); line-height: 1.45;
    max-width: 320px; text-align: center; margin-top: 12px;
  }
  .hint strong { color: var(--cyan); font-weight: 600; }
  p    { font-size: clamp(15px, 0.72rem + 0.28vw, 17px); color: var(--muted); margin-top: 6px; }
  .grid { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; max-width: 340px; }
  .mood-btn {
    width: 52px; height: 52px; border-radius: 13px;
    background: var(--border); border: 2px solid var(--border-btn);
    color: var(--muted); font-size: 20px; cursor: pointer;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
    transition: all 0.15s;
  }
  .mood-btn.selected {
    background: color-mix(in srgb, var(--c) 20%, transparent);
    border-color: var(--c);
    color: var(--c);
    box-shadow: 0 0 12px color-mix(in srgb, var(--c) 55%, transparent);
  }
  .n { font-size: clamp(15px, 0.72rem + 0.28vw, 17px); font-family: 'Rajdhani', sans-serif; font-weight: 700; }
  .mood-label { font-size: 20px; font-weight: 900; }
  textarea {
    width: 100%; max-width: 340px;
    background: var(--surface); border: 1px solid var(--accent)44;
    border-radius: 14px; color: var(--text); font-size: clamp(15px, 0.72rem + 0.28vw, 17px);
    padding: 14px 16px; resize: none; min-height: 100px;
  }
  .cta {
    background: var(--grad-cta);
    border: none; border-radius: 14px; color: #fff;
    font-weight: 900; font-size: clamp(15px, 0.72rem + 0.28vw, 17px); padding: 13px 40px;
    cursor: pointer; font-family: 'Rajdhani', sans-serif; letter-spacing: 2px;
    box-shadow: 0 0 20px var(--accent)55;
  }
  .cta:disabled { background: var(--border); color: var(--muted); box-shadow: none; cursor: default; }
  .back {
    background: transparent; border: 1px solid var(--border);
    border-radius: 12px; color: var(--muted); font-weight: 700;
    font-size: clamp(15px, 0.72rem + 0.28vw, 17px); padding: 11px 22px; cursor: pointer;
    font-family: 'Rajdhani', sans-serif;
  }
  .actions { display: flex; gap: 10px; }
</style>
