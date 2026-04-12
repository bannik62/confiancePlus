import { verifyCsrfToken } from '../core/csrf.js'

// Méthodes en lecture seule — pas de vérification CSRF
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export const csrfProtect = (req, res, next) => {
  // Les requêtes GET/HEAD/OPTIONS ne modifient pas l'état → exempt
  if (SAFE_METHODS.has(req.method)) return next()

  // Le token attendu vient du cookie (posé au login, lu par le JS de l'app)
  const expected = req.cookies?.csrfToken

  // Le token fourni vient du header X-CSRF-Token (ajouté par api/client.js)
  const provided  = req.headers['x-csrf-token']

  if (!verifyCsrfToken(provided, expected)) {
    return res.status(403).json({
      error: 'CSRF token invalide ou manquant',
      code:  'CSRF_INVALID',
    })
  }

  next()
}
