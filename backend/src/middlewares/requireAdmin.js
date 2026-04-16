/**
 * Après requireAuth — JWT doit contenir isAdmin: true (aligné sur la BDD au login).
 */
export const requireAdmin = (req, res, next) => {
  if (req.user?.isAdmin !== true)
    return res.status(403).json({ error: 'Accès réservé administrateur' })
  next()
}
