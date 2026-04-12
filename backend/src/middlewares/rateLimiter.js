import rateLimit from 'express-rate-limit'
import { config } from '../core/config.js'

export const apiLimiter = rateLimit({
  windowMs: config.API_RATE_WINDOW_MS,
  max:      config.API_RATE_MAX,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Trop de requêtes, réessaie dans quelques minutes' },
})

// Plus strict sur les routes d'auth (brute force)
export const authLimiter = rateLimit({
  windowMs: config.API_RATE_WINDOW_MS,
  max:      config.AUTH_RATE_MAX,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Trop de tentatives, réessaie dans 15 min' },
})
