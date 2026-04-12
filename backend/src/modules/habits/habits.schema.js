import { z } from 'zod'

export const createHabitSchema = z.object({
  name:  z.string().min(1).max(60),
  icon:  z.string().emoji(),
  xp:    z.number().int().min(5).max(100).default(20),
  order: z.number().int().default(0),
})

export const updateHabitSchema = createHabitSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export const toggleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

/** Query GET /habits — date = jour civil client (YYYY-MM-DD), comme /checkin/today */
export const listHabitsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})
