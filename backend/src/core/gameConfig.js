// ── Configuration du système de jeu ───────────────────────────────────────────
// Tous les paramètres de gameplay sont ici.
// Modifier ce fichier suffit pour rééquilibrer sans toucher la DB ni les services.

export const GAME = {

  // ── XP par action ───────────────────────────────────────────────────────────
  xp: {
    habitBase:      20,   // XP de base si l'habitude n'a pas de valeur custom
    /** Coefficient × nombre d’habitudes dues le jour (si toutes cochées) → multiplicateur sur l’XP habitudes ; min 1 */
    bonusPerTask:     0.2,
    checkInBonus:   5,    // XP pour avoir fait son check-in du jour
    journalBonus:   5,    // XP pour avoir rempli le journal
    sleepBonus:     3,    // XP pour avoir renseigné la qualité du sommeil
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

  // ── Streak ──────────────────────────────────────────────────────────────────
  streak: {
    // Nombre de jours consécutifs avec au moins 1 habitude cochée
    // Paliers affichant un badge spécial dans le profil
    badgeAt: [7, 14, 30, 60, 100, 365],
  },

  // ── Titres par niveau ───────────────────────────────────────────────────────
  titles: [
    { from: 0,  label: 'Débutant',  icon: '🌱' },
    { from: 5,  label: 'Engagé',    icon: '⚡' },
    { from: 10, label: 'Régulier',  icon: '🔥' },
    { from: 20, label: 'Déterminé', icon: '🛡️' },
    { from: 35, label: 'Champion',  icon: '🏆' },
    { from: 50, label: 'Légende',   icon: '💎' },
  ],
}
