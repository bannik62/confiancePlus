import rateLimit from 'express-rate-limit'
import { config } from '../core/config.js'

export const apiLimiter = rateLimit({
  windowMs: config.API_RATE_WINDOW_MS,
  max:      config.API_RATE_MAX,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Trop de requêtes, réessaie dans quelques minutes' },
})

/** GET /me (session) ne doit pas partager le même quota que login / register — évite 429 au rechargement. */
const isAuthSessionProbe = (req) =>
  req.method === 'GET' &&
  (req.path === '/me' ||
    req.path.endsWith('/me') ||
    req.path === '/register-status' ||
    req.path.endsWith('/register-status'))

// Plus strict sur les routes d'auth (brute force) — hors lecture session /me
export const authLimiter = rateLimit({
  windowMs: config.API_RATE_WINDOW_MS,
  max:      config.AUTH_RATE_MAX,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Trop de tentatives, réessaie dans 15 min' },
  skip:     (req) => isAuthSessionProbe(req),
})
