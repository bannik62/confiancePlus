import { z } from 'zod'

export const mentionSuggestionsQuerySchema = z.object({
  q: z.string().max(40).optional().default(''),
})

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

export const reactionCommentParamsSchema = z.object({
  commentId: z.string().min(1),
})

const reactionKindEnum = z.enum(['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY'])

export const setReactionBodySchema = z.object({
  kind: reactionKindEnum.nullable(),
})
