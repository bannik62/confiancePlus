import { Router } from 'express'
import { requireAuth } from '../../middlewares/requireAuth.js'
import { validate } from '../../middlewares/validate.js'
import * as service from './appointments.service.js'
import {
  createAppointmentSchema,
  createForMemberSchema,
  updateAppointmentSchema,
  completeAppointmentSchema,
  notDoneAppointmentSchema,
  listQuerySchema,
  listManagedQuerySchema,
  dayQuerySchema,
} from './appointments.schema.js'

const router = Router()
router.use(requireAuth)

router.get('/calendar', validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    res.json(await service.listCalendar(req.user.id, req.query.year))
  } catch (e) {
    next(e)
  }
})

router.get('/day', validate(dayQuerySchema, 'query'), async (req, res, next) => {
  try {
    res.json(await service.listDay(req.user.id, req.query.date))
  } catch (e) {
    next(e)
  }
})

router.get('/managed', validate(listManagedQuerySchema, 'query'), async (req, res, next) => {
  try {
    res.json(await service.listManaged(req.user.id, req.query.groupId, req.query.year))
  } catch (e) {
    next(e)
  }
})

router.post('/', validate(createAppointmentSchema), async (req, res, next) => {
  try {
    res.status(201).json(await service.createMine(req.user.id, req.body))
  } catch (e) {
    next(e)
  }
})

router.post('/for-member', validate(createForMemberSchema), async (req, res, next) => {
  try {
    res.status(201).json(await service.createForMember(req.user.id, req.body))
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', validate(updateAppointmentSchema), async (req, res, next) => {
  try {
    res.json(await service.update(req.user.id, req.params.id, req.body))
  } catch (e) {
    next(e)
  }
})

router.post('/:id/complete', validate(completeAppointmentSchema), async (req, res, next) => {
  try {
    res.json(await service.complete(req.user.id, req.params.id, req.body))
  } catch (e) {
    next(e)
  }
})

router.post('/:id/not-done', validate(notDoneAppointmentSchema), async (req, res, next) => {
  try {
    res.json(await service.declineNotDone(req.user.id, req.params.id, req.body))
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    res.json(await service.remove(req.user.id, req.params.id))
  } catch (e) {
    next(e)
  }
})

export default router
