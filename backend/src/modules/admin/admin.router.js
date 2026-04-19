import { Router } from 'express'
import { requireAuth } from '../../middlewares/requireAuth.js'
import { requireAdmin } from '../../middlewares/requireAdmin.js'
import { validate } from '../../middlewares/validate.js'
import {
  dayMessagesReplaceSchema,
  userSuspensionSchema,
  dailyHabitTemplatesReplaceSchema,
  pushSettingsSchema,
} from './admin.schema.js'
import * as service from './admin.service.js'

const router = Router()
router.use(requireAuth, requireAdmin)

router.get('/users', async (req, res, next) => {
  try {
    res.json(
      await service.listUsers({
        page: req.query.page,
        limit: req.query.limit,
      }),
    )
  } catch (e) {
    next(e)
  }
})

router.delete('/users/:id', async (req, res, next) => {
  try {
    res.json(await service.deleteUser(req.user.id, req.params.id))
  } catch (e) {
    next(e)
  }
})

router.patch('/users/:id/suspension', validate(userSuspensionSchema), async (req, res, next) => {
  try {
    res.json(await service.setUserSuspended(req.user.id, req.params.id, req.body.suspended))
  } catch (e) {
    next(e)
  }
})

router.get('/audit', async (req, res, next) => {
  try {
    res.json(await service.listAudit({ limit: req.query.limit }))
  } catch (e) {
    next(e)
  }
})

router.get('/groups', async (req, res, next) => {
  try {
    res.json(await service.listGroups())
  } catch (e) {
    next(e)
  }
})

router.get('/day-messages', async (req, res, next) => {
  try {
    res.json(await service.getDayMessagesAdmin())
  } catch (e) {
    next(e)
  }
})

router.put('/day-messages', validate(dayMessagesReplaceSchema), async (req, res, next) => {
  try {
    res.json(await service.replaceDayMessages(req.user.id, req.body))
  } catch (e) {
    next(e)
  }
})

router.get('/daily-habit-templates', async (req, res, next) => {
  try {
    res.json(await service.getDailyHabitTemplatesAdmin())
  } catch (e) {
    next(e)
  }
})

router.put(
  '/daily-habit-templates',
  validate(dailyHabitTemplatesReplaceSchema),
  async (req, res, next) => {
    try {
      res.json(await service.replaceDailyHabitTemplates(req.user.id, req.body))
    } catch (e) {
      next(e)
    }
  },
)

router.get('/push-settings', async (req, res, next) => {
  try {
    res.json(await service.getPushSettings())
  } catch (e) {
    next(e)
  }
})

router.put('/push-settings', validate(pushSettingsSchema), async (req, res, next) => {
  try {
    res.json(await service.putPushSettings(req.user.id, req.body))
  } catch (e) {
    next(e)
  }
})

router.post('/push/test', async (req, res, next) => {
  try {
    res.json(await service.sendPushTestGift(req.user.id))
  } catch (e) {
    next(e)
  }
})

export default router
