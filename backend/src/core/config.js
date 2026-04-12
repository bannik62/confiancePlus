import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL:        z.string().url(),
  JWT_SECRET:          z.string().min(16),
  JWT_EXPIRES_IN:      z.string().default('7d'),
  NODE_ENV:            z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL:        z.string().default('http://localhost'),
  API_RATE_WINDOW_MS:  z.coerce.number().default(900000),
  API_RATE_MAX:        z.coerce.number().default(100),
  AUTH_RATE_MAX:       z.coerce.number().default(10),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Variables d\'environnement invalides :')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data
