// Service worker minimal (comme vitalinfo) — installation PWA, pas de cache offline agressif
const CACHE_NAME = 'habitracks-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    )
  )
  return self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
