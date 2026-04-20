import { Router } from 'express'
import { requireAuth } from '../../middlewares/requireAuth.js'
import { validate }    from '../../middlewares/validate.js'
import { dailyLogSchema } from './checkin.schema.js'
import * as service from './checkin.service.js'

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

const router = Router()
router.use(requireAuth)

router.get('/today', async (req, res, next) => {
  try {
    const raw = req.query.date
    const date =
      typeof raw === 'string' && YMD_RE.test(raw) ? raw : undefined
    res.json(await service.getToday(req.user.id, date))
  }
  catch (e) { next(e) }
})

router.post('/', validate(dailyLogSchema), async (req, res, next) => {
  try { res.json(await service.upsertDailyLog(req.user.id, req.body)) }
  catch (e) { next(e) }
})

export default router
