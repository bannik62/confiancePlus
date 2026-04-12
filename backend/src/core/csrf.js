import { randomBytes, timingSafeEqual } from 'crypto'

const TOKEN_BYTES = 32   // 256 bits

// Génère un token CSRF aléatoire en hex
export const generateCsrfToken = () => randomBytes(TOKEN_BYTES).toString('hex')

// Comparaison en temps constant — empêche les attaques par timing
export const verifyCsrfToken = (provided, expected) => {
  if (!provided || !expected) return false
  try {
    const a = Buffer.from(provided, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

// Options du cookie csrfToken :
// - PAS httpOnly → le JS de l'app doit pouvoir le lire pour l'envoyer en header
// - SameSite=Strict → inaccessible depuis un site tiers
// - secure en prod → HTTPS uniquement
export const CSRF_COOKIE_OPTIONS = {
  httpOnly: false,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'Strict',
  maxAge:   7 * 24 * 60 * 60 * 1000,   // aligné sur la durée du JWT
  path:     '/',
}
