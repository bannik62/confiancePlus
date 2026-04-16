import { Router } from 'express'
import * as service from './content.service.js'

const router = Router()

router.get('/day-messages', async (req, res, next) => {
  try {
    res.json(await service.getDayMessagesPublic())
  } catch (e) {
    next(e)
  }
})

export default router
