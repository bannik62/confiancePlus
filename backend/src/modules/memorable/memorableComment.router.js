import { Router } from 'express'
import { requireAuth } from '../../middlewares/requireAuth.js'
import { validate } from '../../middlewares/validate.js'
import {
  mentionSuggestionsQuerySchema,
  listMemorableCommentsQuerySchema,
  dailyLogReactionSummaryQuerySchema,
  dailyLogReactionParamsSchema,
  createMemorableCommentBodySchema,
  deleteMemorableCommentParamsSchema,
  reactionCommentParamsSchema,
  setReactionBodySchema,
} from './memorableComment.schema.js'
import * as service from './memorableComment.service.js'

const router = Router()
router.use(requireAuth)

router.get(
  '/mention-suggestions',
  validate(mentionSuggestionsQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      res.json(
        await service.mentionUserSuggestions(req.query.q ?? '', req.user.id),
      )
    } catch (e) {
      next(e)
    }
  },
)

router.get(
  '/daily-log/reaction-summary',
  validate(dailyLogReactionSummaryQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      res.json(
        await service.getMemorableDailyLogReactionSummary(req.user.id, req.query.dailyLogId),
      )
    } catch (e) {
      next(e)
    }
  },
)

router.put(
  '/daily-log/:dailyLogId/reaction',
  validate(dailyLogReactionParamsSchema, 'params'),
  validate(setReactionBodySchema),
  async (req, res, next) => {
    try {
      res.json(
        await service.setMemorableDailyLogReaction(
          req.user.id,
          req.params.dailyLogId,
          req.body.kind,
        ),
      )
    } catch (e) {
      next(e)
    }
  },
)

router.get('/', validate(listMemorableCommentsQuerySchema, 'query'), async (req, res, next) => {
  try {
    res.json(await service.listMemorableComments(req.user.id, req.query.dailyLogId))
  } catch (e) {
    next(e)
  }
})

router.post('/', validate(createMemorableCommentBodySchema), async (req, res, next) => {
  try {
    res
      .status(201)
      .json(
        await service.createMemorableComment(
          req.user.id,
          req.body.dailyLogId,
          req.body.body,
        ),
      )
  } catch (e) {
    next(e)
  }
})

router.put(
  '/:commentId/reaction',
  validate(reactionCommentParamsSchema, 'params'),
  validate(setReactionBodySchema),
  async (req, res, next) => {
    try {
      res.json(
        await service.setMemorableCommentReaction(
          req.user.id,
          req.params.commentId,
          req.body.kind,
        ),
      )
    } catch (e) {
      next(e)
    }
  },
)

router.delete(
  '/:id',
  validate(deleteMemorableCommentParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      res.json(await service.deleteMemorableComment(req.user.id, req.params.id))
    } catch (e) {
      next(e)
    }
  },
)

export default router
