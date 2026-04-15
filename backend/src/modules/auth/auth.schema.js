import { z } from 'zod'
import { normalizeEmail } from '../../core/emailUtil.js'

const iconSchema = z
  .string()
  .trim()
  .min(1, 'Icône requise')
  .max(8, 'Icône trop longue')
  .refine((s) => /\p{Extended_Pictographic}/u.test(s), {
    message: 'Utilise un emoji comme icône',
  })

export const registerSchema = z.object({
  email:      z.string().email().transform((v) => normalizeEmail(v)),
  username:   z.string().min(2).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Lettres, chiffres et _ uniquement'),
  password:   z.string().min(8).max(100),
  avatar:     iconSchema.optional().default('🦊'),
  // Contexte groupe optionnel
  group:      z.object({
    name: z.string().min(2).max(50),
    type: z.enum(['FRIENDS', 'ASSOCIATION']).default('FRIENDS'),
  }).optional(),
  inviteCode: z.string().optional(),
})

export const loginSchema = z.object({
  email:    z.string().email().transform((v) => normalizeEmail(v)),
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
  email: z.string().email().transform((v) => normalizeEmail(v)),
  password: z.string().min(8).max(100),
  username: z.string().min(2).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Lettres, chiffres et _ uniquement'),
  avatar:   iconSchema.optional().default('🦊'),
})
