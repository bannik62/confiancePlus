import { Router } from 'express'
import { requireAuth } from '../../middlewares/requireAuth.js'
import * as service from './educator.service.js'

const router = Router()
router.use(requireAuth)

router.get('/groups/:groupId/members/:memberId/overview', async (req, res, next) => {
  try {
    const year = req.query.year ? parseInt(String(req.query.year), 10) : undefined
    const habitsDate = typeof req.query.habitsDate === 'string' ? req.query.habitsDate : undefined
    const clientToday =
      typeof req.query.clientToday === 'string' ? req.query.clientToday : undefined
    res.json(
      await service.getMemberOverviewForEducator(req.user.id, req.params.groupId, req.params.memberId, {
        year,
        habitsDate,
        clientToday,
      }),
    )
  } catch (e) {
    next(e)
  }
})

export default router
