import { verifyToken } from '../core/auth.js'
import { db } from '../core/db.js'

export const requireAuth = async (req, res, next) => {
  try {
    // Cookie httpOnly en priorité (web/PWA)
    // Fallback Bearer header pour les clients API externes si besoin
    const token = req.cookies?.token
      ?? req.headers.authorization?.split(' ')[1]

    if (!token)
      return res.status(401).json({ error: 'Non authentifié' })

    try {
      req.user = verifyToken(token)
    } catch {
      return res.status(401).json({ error: 'Session expirée, veuillez vous reconnecter' })
    }

    const row = await db.user.findUnique({
      where: { id: req.user.id },
      select: { isSuspended: true },
    })
    if (row?.isSuspended)
      return res.status(403).json({ error: 'Compte suspendu — contacte le support.', code: 'SUSPENDED' })

    next()
  } catch (e) {
    next(e)
  }
}
