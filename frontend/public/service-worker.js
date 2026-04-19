// Service worker — fetch + notifications Web Push
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

self.addEventListener('push', (event) => {
  let data = {}
  try {
    if (event.data) data = event.data.json()
  } catch {
    data = { body: event.data?.text?.() ?? '' }
  }
  const title = data.title || 'HabiTracks'
  const options = {
    body: data.body || '',
    data: { url: data.url || '/' },
    tag: data.tag || 'habitracks',
    icon: '/favicon.ico',
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const path = event.notification?.data?.url || '/'
  const targetUrl = new URL(path, self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const c of clientList) {
        if (c.url && 'focus' in c) return c.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
    })
  )
})
