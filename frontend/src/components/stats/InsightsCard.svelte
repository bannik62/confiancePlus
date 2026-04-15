<script>
  import Card from '../ui/Card.svelte'
  
  export let insights = null
  
  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }
</script>

{#if insights && insights.daysAnalyzed > 0}
  <Card style="margin-bottom:12px">
    <div class="micro purple">💡 INSIGHTS ({insights.daysAnalyzed} derniers jours)</div>
    
    <div class="insights-grid">
      <!-- Mood × Réussite -->
      {#if insights.moodBySuccess?.high}
        <div class="insight-item">
          <div class="insight-icon">🎯</div>
          <div class="insight-text">
            Quand tu fais <strong>≥80%</strong> d'habitudes, ton humeur moyenne est 
            <span class="highlight green">{insights.moodBySuccess.high}/10</span>
            {#if insights.moodBySuccess.low}
              vs <span class="highlight red">{insights.moodBySuccess.low}/10</span> si &lt;50%
            {/if}
          </div>
        </div>
      {/if}
      
      <!-- Mood × Sommeil -->
      {#if insights.moodBySleep?.great}
        <div class="insight-item">
          <div class="insight-icon">🌙</div>
          <div class="insight-text">
            Avec un sommeil <strong>≥8/10</strong>, ton humeur moyenne est 
            <span class="highlight cyan">{insights.moodBySleep.great}/10</span>
            {#if insights.moodBySleep.poor}
              vs <span class="highlight red">{insights.moodBySleep.poor}/10</span> si &lt;5
            {/if}
          </div>
        </div>
      {/if}
      
      <!-- Meilleur jour -->
      {#if insights.bestDay}
        <div class="insight-item">
          <div class="insight-icon">🏆</div>
          <div class="insight-text">
            Ton <strong>meilleur jour</strong> : {formatDate(insights.bestDay.date)} 
            (humeur {insights.bestDay.mood}/10, {insights.bestDay.habitRate}% habitudes{#if insights.bestDay.sleep}, sommeil {insights.bestDay.sleep}/10{/if})
          </div>
        </div>
      {/if}
      
      <!-- Jour difficile (encouragement) -->
      {#if insights.worstDay && insights.worstDay.mood < 5}
        <div class="insight-item">
          <div class="insight-icon">💪</div>
          <div class="insight-text">
            <strong>Jour à retenir</strong> : {formatDate(insights.worstDay.date)} 
            (humeur {insights.worstDay.mood}/10{#if insights.worstDay.sleep}, sommeil {insights.worstDay.sleep}/10{/if}) — mais tu as persévéré !
          </div>
        </div>
      {/if}
    </div>
  </Card>
{/if}

<style>
  .micro {
    font-size: 10px;
    letter-spacing: 2px;
    font-family: 'Rajdhani', sans-serif;
    color: var(--muted);
    margin-bottom: 14px;
  }
  
  .purple {
    color: var(--accent);
  }
  
  .insights-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .insight-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px;
    background: var(--bg);
    border-radius: 10px;
    border-left: 3px solid var(--accent);
  }
  
  .insight-icon {
    font-size: 20px;
    flex-shrink: 0;
  }
  
  .insight-text {
    font-size: 13px;
    line-height: 1.5;
    color: var(--text);
  }
  
  .insight-text strong {
    color: var(--accent-light);
    font-weight: 700;
  }
  
  .highlight {
    font-weight: 900;
    padding: 2px 4px;
    border-radius: 4px;
  }
  
  .highlight.green {
    color: var(--green);
  }
  
  .highlight.red {
    color: var(--red);
  }
  
  .highlight.cyan {
    color: var(--cyan);
  }
</style>
