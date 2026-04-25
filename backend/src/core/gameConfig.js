// ── Configuration du système de jeu ───────────────────────────────────────────
// Tous les paramètres de gameplay sont ici.
// Modifier ce fichier suffit pour rééquilibrer sans toucher la DB ni les services.

export const GAME = {

  // ── XP par action ───────────────────────────────────────────────────────────
  xp: {
    habitBase:      10,   // XP de repli si l’habitude n’a pas de champ `xp` en base (aligné habitudes perso)
    /** Coefficient × nombre d’habitudes dues le jour (si toutes cochées) → multiplicateur sur l’XP habitudes ; min 1 */
    bonusPerTask:     0.2,
    checkInBonus:   5,    // XP pour avoir fait son check-in du jour
    journalBonus:   5,    // XP pour avoir rempli le journal
    sleepBonus:     3,    // XP pour avoir renseigné la qualité du sommeil
    /** XP par défaut à la création manuelle d’une habitude (sans valeur perso) */
    newHabitDefault: 10,
  },

  // ── Courbe de niveaux ───────────────────────────────────────────────────────
  // xpForLevel(n) = base * n^exponent
  // Niveau 1  → 100 XP
  // Niveau 5  → 1 906 XP  (~12 jours assidus)
  // Niveau 10 → 6 310 XP  (~38 jours)
  // Niveau 20 → 21 110 XP (~128 jours)
  // Niveau 50 → 93 300 XP (~566 jours)
  levels: {
    base:     100,
    exponent: 1.8,
  },

  // ── Places habitudes actives (par niveau) ───────────────────────────────────
  habitSlots: {
    /** Places de base jusqu’à levelAnchor (ex. 10 pour niveaux 0–5) */
    baseSlots: 10,
    /** Jusqu’à ce niveau inclus : base slots (niveaux 0–5 → 10) */
    levelAnchor: 5,
    /** +N places par niveau au-delà de levelAnchor */
    bonusPerLevel: 2,
    /** Plafond absolu (la formule ne dépasse pas cette valeur) */
    absoluteMax: 20,
  },

  // ── Rendez-vous (agenda) ────────────────────────────────────────────────────
  appointments: {
    /** Au plus ce nombre de RDV validés le même jour civil rapportent de l’XP (ordre des validations libre). */
    maxRewardingCompletionsPerDay: 2,
    /** Plafond d’XP issue des RDV pour un même jour civil (somme des xpEarned). */
    maxXpFromAppointmentsPerDay: 60,
    /** XP à la création d’un RDV (affichage / plafond par RDV côté validation). */
    xpRewardOnCreate: 30,
  },

  // ── Streak ──────────────────────────────────────────────────────────────────
  streak: {
    // Nombre de jours consécutifs avec au moins 1 habitude cochée
    // Paliers affichant un badge spécial dans le profil
    badgeAt: [7, 14, 30, 60, 100, 365],
  },

  // ── Titres par niveau (fil jardin ; dernier : boucle / accomplissement) ───────
  titles: [
    { from: 0,  label: 'Semeur d’habitudes',       icon: '🌱' },
    { from: 5,  label: 'Cultivateur de constance', icon: '⚡' },
    { from: 10, label: 'Jardinier de gestes',      icon: '🔥' },
    { from: 20, label: 'Récolteur des saisons',    icon: '🛡️' },
    { from: 35, label: 'Gardien du verger',        icon: '🏆' },
    { from: 50, label: 'Ce qui est en haut est en bas', icon: '💎' },
  ],

  // ── UI (durées animations, ms) — surchargeable via Admin → gameplay ────────
  ui: {
    animations: {
      countUpDefault: 1100,
      homeTotalXp: 1200,
      homeToday: 750,
      homeCombined: 900,
      statsCountUp: 850,
      statsBarsCss: 650,
      statsLeaderboardXp: 1000,
      statsLeaderboardTag: 700,
      insightsTitle: 900,
      insightsBody: 700,
      profilTotalXp: 1200,
    },
  },
}
