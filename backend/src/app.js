import express      from 'express'
import cors         from 'cors'
import cookieParser from 'cookie-parser'
import { config }       from './core/config.js'
import { logger }       from './middlewares/logger.js'
import { apiLimiter, authLimiter } from './middlewares/rateLimiter.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { csrfProtect }  from './middlewares/csrfProtect.js'

import authRouter    from './modules/auth/auth.router.js'
import habitsRouter  from './modules/habits/habits.router.js'
import checkinRouter from './modules/checkin/checkin.router.js'
import groupRouter   from './modules/group/group.router.js'
import statsRouter   from './modules/stats/stats.router.js'

const app = express()

if (config.TRUST_PROXY)
  app.set('trust proxy', 1)

// ── Middlewares globaux ────────────────────────────────────────────────────────
app.use(cors({
  origin:      config.FRONTEND_URL,
  credentials: true,              // obligatoire pour envoyer/recevoir les cookies
}))
app.use(cookieParser())           // parse req.cookies
app.use(express.json())
app.use(logger)
app.use('/api', apiLimiter)

// ── Routes ────────────────────────────────────────────────────────────────────
// /api/auth est exempt du CSRF : pas de session au moment du login/register
app.use('/api/auth',    authLimiter, authRouter)
// CSRF actif sur toutes les routes authentifiées
app.use('/api/habits',  csrfProtect, habitsRouter)
app.use('/api/checkin', csrfProtect, checkinRouter)
app.use('/api/group',   csrfProtect, groupRouter)
app.use('/api/stats',   statsRouter)   // stats = GET uniquement, csrfProtect les ignore déjà

app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

// ── Error handler (toujours en dernier) ───────────────────────────────────────
app.use(errorHandler)

export default app
