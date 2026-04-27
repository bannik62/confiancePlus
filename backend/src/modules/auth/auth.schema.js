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

export const loginSchema = z
  .object({
    email: z.string().email().transform((v) => normalizeEmail(v)),
    password: z.string().min(1),
    loginMode: z.enum(['SOLO', 'EDUCATOR', 'FRIENDS']),
    inviteCode: z
      .string()
      .optional()
      .transform((v) => (typeof v === 'string' ? v.trim() : '')),
  })
  .superRefine((data, ctx) => {
    if (data.loginMode === 'FRIENDS' && !data.inviteCode) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        message: "Code d'invitation requis pour ce mode de connexion",
        path:    ['inviteCode'],
      })
    }
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

export const changeEmailSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mot de passe requis'),
    email: z.string().email().transform((v) => normalizeEmail(v)),
    confirmEmail: z
      .string()
      .email()
      .transform((v) => normalizeEmail(v)),
  })
  .refine((d) => d.email === d.confirmEmail, {
    message: 'Les adresses ne correspondent pas',
    path: ['confirmEmail'],
  })

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
    newPassword: z.string().min(8).max(100),
    confirmNewPassword: z.string().min(8).max(100),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmNewPassword'],
  })

export const forgotPasswordSchema = z.object({
  email: z.string().email().transform((v) => normalizeEmail(v)),
})

export const resetPasswordTokenSchema = z
  .object({
    token: z.string().min(16, 'Lien incomplet ou invalide'),
    newPassword: z.string().min(8).max(100),
    confirmNewPassword: z.string().min(8).max(100),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmNewPassword'],
  })

/** GET /auth/reset-password/check */
export const resetPasswordCheckQuerySchema = z.object({
  token: z.string().min(1),
})
