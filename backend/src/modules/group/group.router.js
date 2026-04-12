import { Router } from 'express'
import { requireAuth } from '../../middlewares/requireAuth.js'
import { validate }    from '../../middlewares/validate.js'
import { createGroupSchema, joinGroupSchema, createMemberSchema } from './group.schema.js'
import * as service from './group.service.js'

const router = Router()
router.use(requireAuth)

router.get('/',                    async (req, res, next) => {
  try { res.json(await service.getMyGroups(req.user.id)) }
  catch (e) { next(e) }
})

router.post('/',                   validate(createGroupSchema), async (req, res, next) => {
  try { res.status(201).json(await service.createGroup(req.user.id, req.body)) }
  catch (e) { next(e) }
})

router.post('/join',               validate(joinGroupSchema), async (req, res, next) => {
  try { res.json(await service.joinGroup(req.user.id, req.body)) }
  catch (e) { next(e) }
})

router.get('/:id/leaderboard',     async (req, res, next) => {
  try { res.json(await service.getLeaderboard(req.params.id)) }
  catch (e) { next(e) }
})

// Éducateur crée un membre pending dans son groupe
router.post('/:id/members', validate(createMemberSchema), async (req, res, next) => {
  try { res.status(201).json(await service.createMember(req.params.id, req.user.id, req.body)) }
  catch (e) { next(e) }
})

export default router
