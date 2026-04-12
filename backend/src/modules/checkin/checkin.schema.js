import { z } from 'zod'

export const dailyLogSchema = z.object({
  mood:         z.number().int().min(1).max(10).optional(),
  moodReason:   z.string().max(500).optional(),
  sleepQuality: z.number().int().min(1).max(10).optional(),
  journal:      z.string().max(2000).optional(),
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})
