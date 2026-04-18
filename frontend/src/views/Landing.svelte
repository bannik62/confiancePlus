<svelte:head>
  <title>HabiTracks — Saison 1</title>
</svelte:head>

<!-- Contenu aligné sur public/landing/index.html (référence design) -->
<div class="ht-wrap">
  <div class="glow-hero"></div>

  <nav>
    <a href="/login" class="btn-nav">Connexion</a>
    <div class="logo">HABI<span>TRACKS</span></div>
  </nav>

  <section class="hero">
    <div class="season-badge">Saison 1 — Discipline</div>
    <a href="/login" class="btn-primary">Commencer l'aventure</a>
    <h1>Forge tes<br /><span class="grad-text">Habitudes.</span><br />Domine<br />ta vie.</h1>
    <p class="hero-sub">
      Le habit tracker qui transforme ta routine en <em>progression RPG</em>.
      XP, streaks, niveaux — chaque journée compte.
    </p>
    <div class="cta-row">
      <a href="#stats-bar" class="btn-outline">Voir le classement</a>
    </div>
  </section>

  <div id="stats-bar" class="stats-bar">
    <div class="stat-item">
      <span class="stat-val">12 400+</span>
      <span class="stat-label">Joueurs actifs</span>
    </div>
    <div class="stat-item">
      <span class="stat-val">3,2M</span>
      <span class="stat-label">Habitudes validées</span>
    </div>
    <div class="stat-item">
      <span class="stat-val">98 jours</span>
      <span class="stat-label">Streak record</span>
    </div>
    <div class="stat-item">
      <span class="stat-val">Saison 1</span>
      <span class="stat-label">Battle pass actif</span>
    </div>
  </div>

  <section class="section">
    <div class="section-label">Système de jeu</div>
    <h2 class="section-title">Tes armes<br />pour gagner</h2>
    <div class="cards-grid">
      <div class="card card-legendary">
        <div class="rarity-tag">Légendaire</div>
        <h3>Système d'XP</h3>
        <p>Chaque habitude validée rapporte des points. Monte en grade, débloque des récompenses.</p>
        <div class="xp-bar"><div class="xp-fill"></div></div>
        <div class="xp-label"><span>Niv. 14</span><span>7 200 / 10 000 XP</span></div>
      </div>
      <div class="card card-epic">
        <div class="rarity-tag">Épique</div>
        <h3>Streaks de feu</h3>
        <p>Maintiens la série. Chaque jour brisé remet le compteur à zéro.</p>
        <div class="streak-row">
          <div class="streak-day active"></div>
          <div class="streak-day active"></div>
          <div class="streak-day active"></div>
          <div class="streak-day on-fire"></div>
          <div class="streak-day on-fire"></div>
          <div class="streak-day on-fire"></div>
          <div class="streak-day"></div>
        </div>
      </div>
      <div class="card">
        <div class="rarity-tag">Rare</div>
        <h3>Niveaux & Grades</h3>
        <p>Progresse de Recrue à Légende. Chaque pallier débloque un nouveau titre.</p>
        <div class="level-ring">14</div>
      </div>
      <div class="card">
        <div class="rarity-tag">Commun</div>
        <h3>Battle Pass Saisonnier</h3>
        <p>Des défis exclusifs chaque saison. Complète-les avant la fin de la saison.</p>
      </div>
    </div>
  </section>

  <hr class="divider" />

  <section class="cta-section">
    <div class="cta-glow"></div>
    <h2>Prêt à rejoindre<br /><span class="grad-text">la guilde ?</span></h2>
    <p>Gratuit. Aucune carte bancaire. Commence ta première saison dès maintenant.</p>
    <div class="cta-row">
      <a href="/login" class="btn-primary cta-footer">Créer mon profil</a>
    </div>
  </section>

  <footer>
    <div class="logo">HABI<span>TRACKS</span></div>
    <p>© 2025 HabiTracks — Saison 1 en cours</p>
  </footer>
</div>

<style>
  .ht-wrap :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  .ht-wrap {
    background: #07071a;
    color: #e2e8f0;
    font-family: 'Exo 2', sans-serif;
    min-height: 100vh;
    position: relative;
    overflow-x: hidden;
  }

  .glow-hero {
    position: absolute;
    top: -80px;
    left: 50%;
    transform: translateX(-50%);
    width: 700px;
    height: 500px;
    background: radial-gradient(ellipse, rgba(124, 58, 237, 0.18) 0%, rgba(245, 158, 11, 0.05) 50%, transparent 70%);
    pointer-events: none;
  }

  .ht-wrap nav {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px clamp(16px, 4vw, 40px);
    border-bottom: 1px solid #1e1b4b;
    background: linear-gradient(180deg, #0d0030 0%, rgba(7, 7, 26, 0) 100%);
  }

  .logo {
    font-family: 'Rajdhani', sans-serif;
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: 2px;
    color: #e2e8f0;
    text-align: center;
  }
  .logo span {
    color: #7c3aed;
  }

  .btn-nav {
    position: absolute;
    right: clamp(16px, 4vw, 40px);
    top: 50%;
    transform: translateY(-50%);
    background: rgba(124, 58, 237, 0.15);
    border: 1px solid #7c3aed;
    color: #7c3aed;
    padding: 8px 20px;
    border-radius: 6px;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: 0.85rem;
    letter-spacing: 1px;
    cursor: pointer;
    text-transform: uppercase;
    text-decoration: none;
    transition: background 0.2s;
  }
  .btn-nav:hover {
    background: rgba(124, 58, 237, 0.3);
  }

  .hero {
    position: relative;
    text-align: center;
    padding: 80px 40px 60px;
    max-width: 900px;
    margin: 0 auto;
  }

  .season-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(124, 58, 237, 0.08);
    border: 1px solid rgba(124, 58, 237, 0.4);
    color: #7c3aed;
    padding: 6px 18px;
    border-radius: 99px;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 20px;
  }
  .season-badge::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #7c3aed;
    box-shadow: 0 0 6px #7c3aed;
  }

  a.btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    background: linear-gradient(135deg, #7c3aed, #f59e0b);
    border: none;
    padding: 16px 36px;
    border-radius: 37px;
    color: white;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: 1.05rem;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    cursor: pointer;
    box-shadow: 0 4px 24px rgba(124, 58, 237, 0.35);
    transition: transform 0.2s, box-shadow 0.2s;
    margin-bottom: 40px;
  }
  a.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(124, 58, 237, 0.5);
  }

  .hero h1 {
    font-family: 'Rajdhani', sans-serif;
    font-size: clamp(3.2rem, 9vw, 6.5rem);
    font-weight: 700;
    line-height: 0.88;
    text-transform: uppercase;
    letter-spacing: -1px;
    margin-bottom: 24px;
  }

  .grad-text {
    background: linear-gradient(135deg, #7c3aed 0%, #f59e0b 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hero-sub {
    color: #64748b;
    font-size: 1.1rem;
    line-height: 1.6;
    max-width: 560px;
    margin: 0 auto 40px;
  }
  .hero-sub em {
    color: #e2e8f0;
    font-style: normal;
  }

  .cta-row {
    display: flex;
    gap: 16px;
    justify-content: center;
    flex-wrap: wrap;
  }

  a.btn-outline {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    background: transparent;
    border: 1px solid #2d2b5e;
    padding: 16px 36px;
    border-radius: 37px;
    color: #e2e8f0;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: 1.05rem;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
  }
  a.btn-outline:hover {
    border-color: #7c3aed;
    background: rgba(124, 58, 237, 0.06);
  }

  .stats-bar {
    scroll-margin-top: 24px;
    display: flex;
    justify-content: center;
    gap: 0;
    border-top: 1px solid #1e1b4b;
    border-bottom: 1px solid #1e1b4b;
    margin: 40px 0;
    background: #0e0e2a;
  }
  .stat-item {
    flex: 1;
    max-width: 200px;
    text-align: center;
    padding: 24px 20px;
    border-right: 1px solid #1e1b4b;
  }
  .stat-item:last-child {
    border-right: none;
  }
  .stat-val {
    font-family: 'Rajdhani', sans-serif;
    font-size: 2rem;
    font-weight: 700;
    color: #f59e0b;
    display: block;
  }
  .stat-label {
    font-size: 0.75rem;
    color: #64748b;
    letter-spacing: 1px;
    text-transform: uppercase;
    font-family: 'Rajdhani', sans-serif;
  }

  .section {
    padding: 60px 40px;
    max-width: 1200px;
    margin: 0 auto;
  }

  .section-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.75rem;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #7c3aed;
    margin-bottom: 12px;
  }

  .section-title {
    font-family: 'Rajdhani', sans-serif;
    font-size: 2.4rem;
    font-weight: 700;
    text-transform: uppercase;
    margin-bottom: 48px;
    line-height: 1;
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
  }

  .card {
    background: #0e0e2a;
    border: 1px solid #1e1b4b;
    border-radius: 12px;
    padding: 28px;
    position: relative;
    overflow: hidden;
    transition: border-color 0.2s, transform 0.2s;
  }
  .card:hover {
    border-color: #3730a3;
    transform: translateY(-2px);
  }

  .card-legendary {
    border-color: rgba(245, 158, 11, 0.4);
    box-shadow: 0 0 24px rgba(245, 158, 11, 0.08);
  }
  .card-legendary:hover {
    border-color: #f59e0b;
  }

  .card-epic {
    border-color: rgba(124, 58, 237, 0.4);
    box-shadow: 0 0 24px rgba(124, 58, 237, 0.08);
  }
  .card-epic:hover {
    border-color: #7c3aed;
  }

  .rarity-tag {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .rarity-tag::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
  }

  .card-legendary .rarity-tag {
    color: #f59e0b;
  }
  .card-legendary .rarity-tag::before {
    background: #f59e0b;
  }
  .card-epic .rarity-tag {
    color: #7c3aed;
  }
  .card-epic .rarity-tag::before {
    background: #7c3aed;
  }

  .card h3 {
    font-family: 'Rajdhani', sans-serif;
    font-size: 1.3rem;
    font-weight: 700;
    color: #e2e8f0;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .card p {
    font-size: 0.9rem;
    color: #64748b;
    line-height: 1.5;
  }

  .xp-bar {
    margin-top: 20px;
    background: #1e1b4b;
    height: 6px;
    border-radius: 3px;
    overflow: hidden;
  }
  .xp-fill {
    height: 100%;
    width: 72%;
    background: linear-gradient(90deg, #7c3aed, #f59e0b);
    border-radius: 3px;
  }
  .xp-label {
    display: flex;
    justify-content: space-between;
    margin-top: 6px;
    font-size: 0.72rem;
    color: #64748b;
    font-family: 'Rajdhani', sans-serif;
  }
  .xp-label span:last-child {
    color: #f59e0b;
  }

  .streak-row {
    display: flex;
    gap: 6px;
    margin-top: 20px;
  }
  .streak-day {
    flex: 1;
    height: 28px;
    border-radius: 4px;
    background: #1e1b4b;
  }
  .streak-day.active {
    background: linear-gradient(135deg, #7c3aed, #06b6d4);
  }
  .streak-day.on-fire {
    background: linear-gradient(135deg, #f59e0b, #ef4444);
  }

  .level-ring {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: 3px solid #f59e0b;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 16px;
    font-family: 'Rajdhani', sans-serif;
    font-size: 1.4rem;
    font-weight: 700;
    color: #f59e0b;
  }

  .divider {
    border: none;
    border-top: 1px solid #1e1b4b;
    margin: 0 40px;
  }

  .cta-section {
    text-align: center;
    padding: 80px 40px;
    position: relative;
  }
  .cta-glow {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 300px;
    background: radial-gradient(ellipse, rgba(124, 58, 237, 0.12) 0%, transparent 70%);
    pointer-events: none;
  }
  .cta-section h2 {
    font-family: 'Rajdhani', sans-serif;
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 700;
    text-transform: uppercase;
    margin-bottom: 16px;
  }
  .cta-section p {
    color: #64748b;
    margin-bottom: 36px;
    font-size: 1rem;
  }

  a.btn-primary.cta-footer {
    margin-bottom: 0;
  }

  .ht-wrap footer {
    border-top: 1px solid #1e1b4b;
    padding: 24px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .ht-wrap footer .logo {
    font-size: 1rem;
  }
  .ht-wrap footer p {
    font-size: 0.8rem;
    color: #64748b;
  }

  @media (max-width: 640px) {
    .stats-bar {
      flex-wrap: wrap;
    }
    .stat-item {
      flex: 1 1 50%;
      max-width: none;
      border-right: 1px solid #1e1b4b;
      border-bottom: 1px solid #1e1b4b;
    }
    .stat-item:nth-child(2n) {
      border-right: none;
    }
    .btn-nav {
      right: 12px;
      padding: 6px 12px;
      font-size: 0.7rem;
    }
  }
</style>
