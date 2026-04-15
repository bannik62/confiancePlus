import { z } from 'zod'
import { normalizeEmail } from '../../core/emailUtil.js'

export const createGroupSchema = z.object({
  name: z.string().min(2).max(50),
  type: z.enum(['FRIENDS', 'ASSOCIATION']).default('FRIENDS'),
})

export const joinGroupSchema = z.object({
  inviteCode: z.string().min(1),
})

/** Invité asso : e-mail seul (MVP) — pseudo généré côté serveur */
export const createMemberSchema = z.object({
  email: z.string().email().transform((v) => normalizeEmail(v)),
})
