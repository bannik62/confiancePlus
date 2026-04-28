import { z } from 'zod'

export const dailyLogSchema = z.object({
  mood:         z.coerce.number().int().min(1).max(10).optional(),
  moodReason:   z.string().max(500).optional(),
  sleepQuality: z.coerce.number().int().min(1).max(10).optional(),
  journal:      z.string().max(2000).optional(),
  shareMemorableInLeaderboard: z.coerce.boolean().optional(),
  removeMemorableImage: z.coerce.boolean().optional(),
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})
