import { Router } from 'express'
import { requireAuth } from '../../middlewares/requireAuth.js'
import { validate } from '../../middlewares/validate.js'
import * as svc from './broadcast.service.js'
import { broadcastDismissSchema } from './broadcast.schema.js'

const router = Router()
router.use(requireAuth)

router.get('/me', async (req, res, next) => {
  try {
    const broadcast = await svc.getBroadcastForPlayer(req.user.id)
    res.json({ broadcast })
  } catch (e) {
    next(e)
  }
})

router.post('/me/dismiss', validate(broadcastDismissSchema), async (req, res, next) => {
  try {
    await svc.dismissBroadcast(req.user.id, req.body.broadcastId)
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
