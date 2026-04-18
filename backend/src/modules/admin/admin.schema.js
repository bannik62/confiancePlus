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
