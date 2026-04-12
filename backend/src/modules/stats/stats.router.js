import { Router } from 'express'
import { requireAuth } from '../../middlewares/requireAuth.js'
import * as service from './stats.service.js'

const router = Router()
router.use(requireAuth)

router.get('/me',      async (req, res, next) => {
  try { res.json(await service.getMyStats(req.user.id)) }
  catch (e) { next(e) }
})

router.get('/profile', async (req, res, next) => {
  try { res.json(await service.getMyProfile(req.user.id)) }
  catch (e) { next(e) }
})

router.get('/leaderboard', async (req, res, next) => {
  try { res.json(await service.getGlobalLeaderboard()) }
  catch (e) { next(e) }
})

export default router
