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
