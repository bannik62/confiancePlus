import { verifyToken } from '../core/auth.js'

export const requireAuth = (req, res, next) => {
  // Cookie httpOnly en priorité (web/PWA)
  // Fallback Bearer header pour les clients API externes si besoin
  const token = req.cookies?.token
    ?? req.headers.authorization?.split(' ')[1]

  if (!token)
    return res.status(401).json({ error: 'Non authentifié' })

  try {
    req.user = verifyToken(token)
    next()
  } catch {
    res.status(401).json({ error: 'Session expirée, veuillez vous reconnecter' })
  }
}
