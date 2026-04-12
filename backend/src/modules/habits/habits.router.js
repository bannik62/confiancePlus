import { Router } from 'express'
import { requireAuth } from '../../middlewares/requireAuth.js'
import { validate }    from '../../middlewares/validate.js'
import {
  createHabitSchema,
  updateHabitSchema,
  toggleSchema,
  listHabitsQuerySchema,
} from './habits.schema.js'
import * as service from './habits.service.js'

const router = Router()
router.use(requireAuth)

router.get(
  '/',
  validate(listHabitsQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      res.json(await service.getHabits(req.user.id, req.query.date))
    } catch (e) {
      next(e)
    }
  },
)

router.post('/',               validate(createHabitSchema), async (req, res, next) => {
  try { res.status(201).json(await service.createHabit(req.user.id, req.body)) }
  catch (e) { next(e) }
})

router.patch('/:id',           validate(updateHabitSchema), async (req, res, next) => {
  try { res.json(await service.updateHabit(req.params.id, req.user.id, req.body)) }
  catch (e) { next(e) }
})

router.delete('/:id',          async (req, res, next) => {
  try { await service.deleteHabit(req.params.id, req.user.id); res.sendStatus(204) }
  catch (e) { next(e) }
})

router.patch('/:id/toggle',    validate(toggleSchema), async (req, res, next) => {
  try { res.json(await service.toggleHabit(req.params.id, req.user.id, req.body.date)) }
  catch (e) { next(e) }
})

export default router
