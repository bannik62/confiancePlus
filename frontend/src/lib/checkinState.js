/**
 * Détermine si le check-in « humeur du jour » est déjà fait.
 *
 * Ce n’est PAS « première connexion au compte », mais :
 * « pour la date locale du jour, a-t-on déjà enregistré une humeur (1–10) ? »
 *
 * Source : GET /api/checkin/today?date=YYYY-MM-DD → objet DailyLog ou null.
 */
export const hasMoodForToday = (log) => {
  const m = log?.mood
  const n = typeof m === 'number' && Number.isFinite(m) ? m : Number(m)
  return Number.isFinite(n) && n >= 1 && n <= 10
}
