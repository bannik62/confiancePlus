import { Router } from 'express'
import { requireAuth } from '../../middlewares/requireAuth.js'
import { validate } from '../../middlewares/validate.js'
import {
  listMemorableCommentsQuerySchema,
  createMemorableCommentBodySchema,
  deleteMemorableCommentParamsSchema,
} from './memorableComment.schema.js'
import * as service from './memorableComment.service.js'

const router = Router()
router.use(requireAuth)

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
