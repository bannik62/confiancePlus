import { Router } from 'express'
import { requireAuth } from '../../middlewares/requireAuth.js'
import * as service from './store.service.js'

const router = Router()
router.use(requireAuth)

router.get('/catalog', async (req, res, next) => {
  try {
    res.json(service.getStoreCatalog())
  } catch (e) {
    next(e)
  }
})

router.post('/purchase', async (req, res, next) => {
  try {
    const sku = typeof req.body?.sku === 'string' ? req.body.sku : ''
    if (!sku) return res.status(400).json({ message: 'SKU requis.' })
    res.json(await service.purchaseStoreItem(req.user.id, sku))
  } catch (e) {
    next(e)
  }
})

export default router
