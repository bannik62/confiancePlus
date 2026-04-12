<script>
  import { onMount } from 'svelte'
  import { statsApi } from '../api/stats.js'
  import Card from '../components/ui/Card.svelte'

  let byDay = [], byHabit = []
  const DAYS = ['L','M','M','J','V','S','D']

  onMount(async () => {
    const data = await statsApi.getMyStats()
    byDay   = data.byDay
    byHabit = data.byHabit
  })
</script>

<div class="view">
  <Card glow style="margin-bottom:12px">
    <div class="micro purple">📊 TAUX DE RÉUSSITE — 7 JOURS</div>
    <div class="bars">
      {#each byDay as d, i}
        <div class="bar-col">
          <div class="rate">{d.rate}%</div>
          <div class="bar" style="height:{d.rate}%; background: {d.rate===100 ? 'linear-gradient(180deg,var(--gold),var(--red))' : d.rate>=70 ? 'linear-gradient(180deg,var(--accent),var(--accent-mid))' : 'var(--stats-empty)'}"></div>
          <div class="day" class:today={i===6}>{DAYS[new Date(d.date).getDay()]}</div>
        </div>
      {/each}
    </div>
  </Card>

  <Card>
    <div class="micro purple">🏆 PAR HABITUDE (7 jours)</div>
    {#each byHabit as h}
      <div class="habit-row">
        <div class="habit-meta">
          <span>{h.icon} {h.name}</span>
          <span class="pct" style="color:{h.rate>=80?'var(--gold)':h.rate>=60?'var(--accent)':'var(--muted)'}">{h.rate}%</span>
        </div>
        <div class="track">
          <div class="fill" style="width:{h.rate}%; background:{h.rate>=80?'linear-gradient(90deg,var(--gold),var(--red))':'linear-gradient(90deg,var(--accent),var(--cyan))'}"></div>
        </div>
      </div>
    {/each}
  </Card>
</div>

<style>
  .view    { display: flex; flex-direction: column; }
  .micro   { font-size: 10px; letter-spacing: 2px; font-family: 'Rajdhani', sans-serif; color: var(--muted); margin-bottom: 14px; }
  .purple  { color: var(--accent); }
  .bars    { display: flex; align-items: flex-end; gap: 7px; height: 110px; }
  .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; height: 100%; justify-content: flex-end; }
  .rate    { font-size: 9px; color: var(--muted); }
  .bar     { width: 100%; border-radius: 5px 5px 2px 2px; min-height: 4px; transition: height 0.4s; }
  .day     { font-size: 9px; color: var(--muted); font-family: 'Rajdhani', sans-serif; }
  .day.today { color: var(--gold); }

  .habit-row  { margin-bottom: 12px; }
  .habit-meta { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px; }
  .pct        { font-weight: 700; }
  .track      { height: 5px; background: var(--border); border-radius: 3px; overflow: hidden; }
  .fill       { height: 100%; border-radius: 3px; }
</style>
