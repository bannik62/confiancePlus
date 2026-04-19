import { z } from 'zod'

const phraseList = z.object({
  phrases: z.array(z.string()),
})

export const dayMessagesReplaceSchema = z.object({
  encouragement: phraseList,
  maintien: phraseList,
  felicitation: phraseList,
})

export const userSuspensionSchema = z.object({
  suspended: z.boolean(),
})

export const pushSettingsSchema = z.object({
  defaultReminderHour: z.coerce.number().int().min(0).max(23),
})

/** Corps de la notification test (Web Push — taille limitée côté navigateurs) */
export const pushTestSchema = z.object({
  message: z.string().trim().min(1).max(200),
})

export const dailyHabitTemplatesReplaceSchema = z.object({
  templates: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1).max(120),
        icon: z.string().min(1).max(16),
        xpTotal: z.number().int().min(5).max(100).optional(),
        sortOrder: z.number().int().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(200),
})
