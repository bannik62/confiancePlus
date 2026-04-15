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

router.get('/educator-overview', async (req, res, next) => {
  try { res.json(await service.getEducatorAssociationOverview(req.user.id)) }
  catch (e) { next(e) }
})

router.get('/calendar/:year', async (req, res, next) => {
  try {
    const year = parseInt(req.params.year, 10)
    if (!year || year < 2020 || year > 2100) {
      return res.status(400).json({ message: 'Année invalide' })
    }
    res.json(await service.getCalendarYear(req.user.id, year))
  }
  catch (e) { next(e) }
})

router.get('/insights', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30
    res.json(await service.getInsights(req.user.id, days))
  }
  catch (e) { next(e) }
})

export default router
