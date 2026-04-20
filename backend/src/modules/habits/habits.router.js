import { Router } from 'express'
import { requireAuth } from '../../middlewares/requireAuth.js'
import { validate }    from '../../middlewares/validate.js'
import {
  createHabitSchema,
  updateHabitSchema,
  toggleSchema,
  skipDaySchema,
  listHabitsQuerySchema,
  dailyOfferQuerySchema,
  dailyOfferBodySchema,
  perfReactionBodySchema,
} from './habits.schema.js'
import * as service from './habits.service.js'
import * as dailyOffer from './dailyOffer.service.js'
import { getPublicHabitsForPeer } from './habits.peer.js'
import { setPerfReaction } from './habits.perfReaction.js'

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

router.get(
  '/daily-offer',
  validate(dailyOfferQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      res.json(await dailyOffer.getOrCreateDailyOffer(req.user.id, req.query.date))
    } catch (e) {
      next(e)
    }
  },
)

router.post(
  '/daily-offer/dismiss',
  validate(dailyOfferBodySchema),
  async (req, res, next) => {
    try {
      res.json(await dailyOffer.dismissDailyOffer(req.user.id, req.body.date))
    } catch (e) {
      next(e)
    }
  },
)

router.post(
  '/daily-offer/accept',
  validate(dailyOfferBodySchema),
  async (req, res, next) => {
    try {
      const out = await dailyOffer.acceptDailyOffer(req.user.id, req.body.date)
      res.status(out.alreadyAccepted ? 200 : 201).json(out)
    } catch (e) {
      next(e)
    }
  },
)

/** Réaction ❤️ / 🤔 sur la perf (habitude validée) d’un autre joueur. */
router.post(
  '/perf-reactions',
  validate(perfReactionBodySchema),
  async (req, res, next) => {
    try {
      res.json(await setPerfReaction(req.user.id, req.body))
    } catch (e) {
      next(e)
    }
  },
)

/** Habitudes visibles depuis le classement (joueur du même groupe ou profil « classement global »). */
router.get('/public/:userId', async (req, res, next) => {
  try {
    res.json(await getPublicHabitsForPeer(req.user.id, req.params.userId))
  } catch (e) {
    next(e)
  }
})

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

router.post('/:id/skip-day', validate(skipDaySchema), async (req, res, next) => {
  try {
    res.json(await service.skipHabitForDay(req.params.id, req.user.id, req.body.date))
  } catch (e) {
    next(e)
  }
})

router.delete('/:id/skip-day', validate(listHabitsQuerySchema, 'query'), async (req, res, next) => {
  try {
    res.json(await service.unskipHabitForDay(req.params.id, req.user.id, req.query.date))
  } catch (e) {
    next(e)
  }
})

export default router
