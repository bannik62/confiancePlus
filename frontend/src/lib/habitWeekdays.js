/** Bits 0–6 = lun→dim ; 127 = tous les jours (aligné backend) */
export const ALL_WEEKDAYS_MASK = 127

export const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

/** @param {boolean[]} checks — longueur 7, index 0 = lundi */
export const maskFromChecks = (checks) => {
  let m = 0
  for (let i = 0; i < 7; i++) {
    if (checks[i]) m |= 1 << i
  }
  return m >= 1 && m <= 127 ? m : ALL_WEEKDAYS_MASK
}

/** @param {number} mask */
export const checksFromMask = (mask) => {
  const m = mask == null || !Number.isFinite(Number(mask)) ? ALL_WEEKDAYS_MASK : Number(mask)
  const safe = m >= 1 && m <= 127 ? m : ALL_WEEKDAYS_MASK
  return Array.from({ length: 7 }, (_, i) => (safe & (1 << i)) !== 0)
}

export const isAllDaysMask = (mask) =>
  (mask == null ? ALL_WEEKDAYS_MASK : Number(mask)) === ALL_WEEKDAYS_MASK

/**
 * Libellé pour l’UI (ex. liste d’accueil) : jours où l’habitude est prévue.
 * @param {number | undefined | null} mask
 */
export const formatActiveDaysLabel = (mask) => {
  const m =
    mask == null || !Number.isFinite(Number(mask)) ? ALL_WEEKDAYS_MASK : Number(mask)
  const safe = m >= 1 && m <= 127 ? m : ALL_WEEKDAYS_MASK
  if (safe === ALL_WEEKDAYS_MASK) return 'Tous les jours'
  const checks = checksFromMask(safe)
  const labels = WEEKDAY_SHORT.filter((_, i) => checks[i])
  if (labels.length === 0) return '—'
  return labels.join(', ')
}
