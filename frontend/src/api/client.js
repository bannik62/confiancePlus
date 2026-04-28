const BASE = '/api'

/** Délai max avant abandon de la requête (évite UI bloquée si le backend ne répond pas). */
const FETCH_TIMEOUT_MS = 15000

// Lit le csrfToken depuis le cookie (non-httpOnly, accessible au JS)
const getCsrfToken = () => {
  const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/)
  return match ? match[1] : null
}

// Méthodes qui modifient l'état → doivent porter le header CSRF
const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

const pathBase = (path) => path.split('?')[0]

/** 401 sans session établie : ne pas traiter comme « session expirée » (évite fausse déco + mauvais message). */
const shouldDispatchSessionExpiredOn401 = (method, path) => {
  const base = pathBase(path)
  if (method === 'GET' && base === '/checkin/today') return false
  if (method === 'GET' && base === '/auth/register-status') return false
  if (
    method === 'POST' &&
    [
      '/auth/login',
      '/auth/register',
      '/auth/activate',
      '/auth/check-code',
      '/auth/forgot-password',
      '/auth/reset-password',
    ].includes(base)
  )
    return false
  return true
}

const request = async (method, path, body) => {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const headers = isFormData ? {} : { 'Content-Type': 'application/json' }

  // Injecte le token CSRF sur toutes les mutations
  if (MUTATION_METHODS.has(method)) {
    const csrf = getCsrfToken()
    if (csrf) headers['X-CSRF-Token'] = csrf
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include',   // envoie le cookie httpOnly automatiquement
      headers,
      signal: controller.signal,
      ...(body !== undefined ? { body: isFormData ? body : JSON.stringify(body) } : {}),
    })
  } catch (e) {
    if (e?.name === 'AbortError')
      throw { status: 408, message: 'Délai dépassé — vérifie ta connexion et réessaie.' }
    throw e
  } finally {
    clearTimeout(timeoutId)
  }

  if (res.ok)
    return res.status === 204 ? null : res.json()

  const err = await res.json().catch(() => ({ error: 'Erreur réseau' }))

  if (res.status === 401) {
    const message =
      typeof err.error === 'string' && err.error.length ? err.error : 'Session expirée'
    if (shouldDispatchSessionExpiredOn401(method, path))
      window.dispatchEvent(new CustomEvent('session:expired'))
    throw { status: 401, message }
  }

  if (res.status === 403 && err.code === 'SUSPENDED') {
    try {
      sessionStorage.setItem(
        'authNotice',
        JSON.stringify({
          type: 'suspended',
          message:
            typeof err.error === 'string' && err.error.length ? err.error : 'Compte suspendu',
        }),
      )
    } catch {
      /* mode privé / quota */
    }
    window.dispatchEvent(new CustomEvent('session:suspended'))
  }

  let message = typeof err.error === 'string' ? err.error : null
  if (!message && err.errors && typeof err.errors === 'object') {
    const parts = []
    for (const [field, msgs] of Object.entries(err.errors)) {
      if (Array.isArray(msgs) && msgs.length)
        parts.push(`${field}: ${msgs.join(', ')}`)
    }
    message = parts.length ? parts.join(' · ') : 'Données invalides'
  }
  if (!message) message = 'Erreur inconnue'
  throw { status: res.status, message, code: err.code, errors: err.errors }
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)   => request('POST',   path, body),
  put:    (path, body)   => request('PUT',    path, body),
  patch:  (path, body)   => request('PATCH',  path, body),
  delete: (path, body)   => request('DELETE', path, body),
}
