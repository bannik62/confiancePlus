import { Router } from 'express'
import { validate }    from '../../middlewares/validate.js'
import { requireAuth } from '../../middlewares/requireAuth.js'
import { generateCsrfToken, CSRF_COOKIE_OPTIONS } from '../../core/csrf.js'
import { registerSchema, loginSchema, checkCodeSchema, activateSchema } from './auth.schema.js'
import * as service from './auth.service.js'

const router = Router()

const JWT_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'Strict',
  maxAge:   7 * 24 * 60 * 60 * 1000,
  path:     '/',
}

const setSessionCookies = (res, token) => {
  const csrfToken = generateCsrfToken()
  res.cookie('token',     token,     JWT_COOKIE_OPTIONS)
  res.cookie('csrfToken', csrfToken, CSRF_COOKIE_OPTIONS)
  return csrfToken
}

const clearSessionCookies = (res) => {
  res.clearCookie('token',     { path: '/' })
  res.clearCookie('csrfToken', { path: '/' })
}

// ── Compte autonome ────────────────────────────────────────────────────────────

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { user, token } = await service.register(req.body)
    const csrfToken = setSessionCookies(res, token)
    res.status(201).json({ user, csrfToken })
  } catch (e) { next(e) }
})

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { user, token } = await service.login(req.body)
    const csrfToken = setSessionCookies(res, token)
    res.json({ user, csrfToken })
  } catch (e) { next(e) }
})

router.post('/logout', (req, res) => {
  clearSessionCookies(res)
  res.json({ message: 'Déconnecté' })
})

// ── Compte association ─────────────────────────────────────────────────────────

// Étape 1 — vérifie le code, retourne infos limitées (sans session)
router.post('/check-code', validate(checkCodeSchema), async (req, res, next) => {
  try { res.json(await service.checkCode(req.body)) }
  catch (e) { next(e) }
})

// Étape 2 — code + e-mail + mdp + profil → active le compte + ouvre la session
router.post('/activate', validate(activateSchema), async (req, res, next) => {
  try {
    const { user, token } = await service.activate(req.body)
    const csrfToken = setSessionCookies(res, token)
    res.json({ user, csrfToken })
  } catch (e) { next(e) }
})

// ── Session ────────────────────────────────────────────────────────────────────

router.get('/me', requireAuth, async (req, res, next) => {
  try { res.json(await service.me(req.user.id)) }
  catch (e) { next(e) }
})

export default router
