import { z } from 'zod'

// Icon : pas z.emoji() (trop strict selon versions Zod / séquences Unicode) — picto emoji côté serveur
const iconSchema = z
  .string()
  .trim()
  .min(1, 'Icône requise')
  .max(8, 'Icône trop longue')
  .refine((s) => /\p{Extended_Pictographic}/u.test(s), {
    message: 'Utilise un emoji comme icône',
  })

export const createHabitSchema = z.object({
  name:  z.string().min(1).max(60),
  icon:  iconSchema,
  xp:    z.number().int().min(10).max(10).default(10),
  order: z.number().int().default(0),
  /** 1–127 : bits lun→dim ; défaut 127 = tous les jours */
  weekdaysMask: z.number().int().min(1).max(127).optional(),
})

/** PATCH : champs éditables (xp / origin inchangés via API) */
export const updateHabitSchema = z
  .object({
    name:  z.string().min(1).max(60).optional(),
    icon:  iconSchema.optional(),
    order: z.number().int().optional(),
    weekdaysMask: z.number().int().min(1).max(127).optional(),
  })
  .strict()

export const toggleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

/** Query GET /habits — date = jour civil client (YYYY-MM-DD), comme /checkin/today */
export const listHabitsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const dailyOfferQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const dailyOfferBodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})
