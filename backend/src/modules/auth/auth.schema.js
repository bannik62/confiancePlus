import { z } from 'zod'

export const registerSchema = z.object({
  email:      z.string().email(),
  username:   z.string().min(2).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Lettres, chiffres et _ uniquement'),
  password:   z.string().min(8).max(100),
  avatar:     z.string().emoji().optional().default('🦊'),
  // Contexte groupe optionnel
  group:      z.object({
    name: z.string().min(2).max(50),
    type: z.enum(['FRIENDS', 'ASSOCIATION']).default('FRIENDS'),
  }).optional(),
  inviteCode: z.string().optional(),
})

export const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

export const checkCodeSchema = z.object({
  code: z.string()
    .min(1)
    .transform(v => v.trim().toUpperCase())
    .pipe(z.string().length(6).regex(/^[A-Z0-9]{6}$/, 'Code invalide — 6 caractères alphanumériques')),
})

export const activateSchema = z.object({
  code: z.string()
    .min(1)
    .transform(v => v.trim().toUpperCase())
    .pipe(z.string().length(6).regex(/^[A-Z0-9]{6}$/)),
  password: z.string().min(8).max(100),
})
