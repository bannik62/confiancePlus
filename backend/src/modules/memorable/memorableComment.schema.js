import { z } from 'zod'

export const listMemorableCommentsQuerySchema = z.object({
  dailyLogId: z.string().min(1),
})

export const createMemorableCommentBodySchema = z.object({
  dailyLogId: z.string().min(1),
  body:       z.string().min(1).max(500),
})

export const deleteMemorableCommentParamsSchema = z.object({
  id: z.string().min(1),
})
