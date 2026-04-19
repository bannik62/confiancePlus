import { Router } from 'express'
import { requireAuth } from '../../middlewares/requireAuth.js'
import * as service from './push.service.js'
import { getPublicVapidKey, isPushConfigured } from '../../core/pushWeb.js'

const router = Router()

router.get('/vapid-public', (_req, res) => {
  if (!isPushConfigured() || !getPublicVapidKey())
    return res.status(503).json({ error: 'Notifications push non configurées (VAPID)' })
  res.json({ publicKey: getPublicVapidKey() })
})

router.post('/subscribe', requireAuth, async (req, res, next) => {
  try {
    res.json(await service.subscribe(req.user.id, req.body))
  } catch (e) {
    next(e)
  }
})

router.delete('/subscribe', requireAuth, async (req, res, next) => {
  try {
    const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : undefined
    res.json(await service.unsubscribe(req.user.id, endpoint))
  } catch (e) {
    next(e)
  }
})

export default router
