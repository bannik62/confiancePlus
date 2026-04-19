import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL:        z.string().url(),
  JWT_SECRET:          z.string().min(16),
  JWT_EXPIRES_IN:      z.string().default('7d'),
  NODE_ENV:            z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL:        z.string().default('http://localhost'),
  API_RATE_WINDOW_MS:  z.coerce.number().default(900000),
  API_RATE_MAX:        z.coerce.number().default(100),
  /** POST login/register/activate/check-code — /me exclu du compteur authLimiter */
  AUTH_RATE_MAX:       z.coerce.number().default(30),
  /** Derrière reverse proxy : `TRUST_PROXY=1` ou `true` — ne pas utiliser `z.coerce.boolean()` (\"false\" → true). */
  TRUST_PROXY: z
    .union([z.string(), z.undefined()])
    .transform((s) => typeof s === 'string' && /^(1|true|yes)$/i.test(s.trim())),
  /**
   * Inscription publique `POST /auth/register`.
   * `false` / `0` / `no` / `off` (insensible à la casse) → fermé. Absent ou autre → ouvert.
   * Les flux code association (`check-code` / `activate`) restent disponibles.
   */
  REGISTER_OPEN: z
    .union([z.string(), z.undefined()])
    .transform((s) => {
      if (typeof s !== 'string' || !s.trim()) return true
      return !/^(0|false|no|off)$/i.test(s.trim())
    }),
  /** Gmail (même schéma que zerok-billing) — rappels RDV. Absent = pas d’e-mail. */
  GMAIL_USER: z.string().default(''),
  GMAIL_APP_PASSWORD: z.string().default(''),
  /** Heure locale assignée (0–23) pour l’e-mail le jour avant le RDV. */
  APPOINTMENT_REMINDER_DAY_BEFORE_HOUR: z.coerce.number().min(0).max(23).default(18),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Variables d\'environnement invalides :')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data
