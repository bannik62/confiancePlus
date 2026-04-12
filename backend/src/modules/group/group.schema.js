import { z } from 'zod'

export const createGroupSchema = z.object({
  name: z.string().min(2).max(50),
  type: z.enum(['FRIENDS', 'ASSOCIATION']).default('FRIENDS'),
})

export const joinGroupSchema = z.object({
  inviteCode: z.string().min(1),
})

export const createMemberSchema = z.object({
  username: z.string().min(2).max(30).regex(/^[a-zA-Z0-9_]+$/),
  avatar:   z.string().emoji().optional().default('🦊'),
})
