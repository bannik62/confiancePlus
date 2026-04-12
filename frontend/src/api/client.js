const BASE = '/api'

// Lit le csrfToken depuis le cookie (non-httpOnly, accessible au JS)
const getCsrfToken = () => {
  const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/)
  return match ? match[1] : null
}

// Méthodes qui modifient l'état → doivent porter le header CSRF
const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

/** Ne pas diffuser session:expired sur ce GET — évite une fausse déconnexion juste après login (cookie pas encore pris en compte sur la requête suivante). */
const isTransientAuthCheckGet = (method, path) => {
  if (method !== 'GET') return false
  const base = path.split('?')[0]
  return base === '/checkin/today'
}

const request = async (method, path, body) => {
  const headers = { 'Content-Type': 'application/json' }

  // Injecte le token CSRF sur toutes les mutations
  if (MUTATION_METHODS.has(method)) {
    const csrf = getCsrfToken()
    if (csrf) headers['X-CSRF-Token'] = csrf
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',   // envoie le cookie httpOnly automatiquement
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

  // Session expirée → nettoyage (sauf GET /checkin/today : voir isTransientAuthCheckGet)
  if (res.status === 401) {
    if (!isTransientAuthCheckGet(method, path))
      window.dispatchEvent(new CustomEvent('session:expired'))
    throw { status: 401, message: 'Session expirée' }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur réseau' }))
    throw { status: res.status, message: err.error ?? 'Erreur inconnue', code: err.code }
  }

  return res.status === 204 ? null : res.json()
}

export const api = {
  get:    (path)       => request('GET',    path),
  post:   (path, body) => request('POST',   path, body),
  patch:  (path, body) => request('PATCH',  path, body),
  delete: (path)       => request('DELETE', path),
}
