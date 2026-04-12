<script>
  import { clearAuth } from '../../stores/auth.js'
</script>

<div class="wrap">
  <div class="card">
    <div class="lock">🔒</div>
    <div class="title">Session expirée</div>
    <div class="sub">Veuillez vous reconnecter pour continuer.</div>
    <button on:click={clearAuth}>Se connecter</button>
  </div>
</div>

<style>
  .wrap {
    min-height: 60vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .card {
    background: var(--surface);
    border: 1px solid var(--accent)44;
    border-radius: 20px;
    padding: 36px 32px;
    text-align: center;
    max-width: 300px;
    width: 100%;
    box-shadow: 0 0 30px var(--accent)22;
  }
  .lock  { font-size: 40px; margin-bottom: 16px; }
  .title { font-size: 18px; font-weight: 900; font-family: 'Rajdhani', sans-serif; color: var(--text); margin-bottom: 8px; }
  .sub   { font-size: 13px; color: var(--muted); margin-bottom: 24px; line-height: 1.5; }
  button {
    background: var(--grad-cta);
    border: none; border-radius: 12px; color: #fff;
    font-weight: 900; font-size: 13px; padding: 11px 28px;
    cursor: pointer; font-family: 'Rajdhani', sans-serif;
    letter-spacing: 1px; box-shadow: 0 0 20px var(--accent)55;
  }
</style>
