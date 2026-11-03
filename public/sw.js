// Only immutable public build assets are cached. Private data stays in memory.
const ASSET_CACHE = 'fmci-assets-v1'
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('fmci-shell-')) await caches.delete(key)
    }
    await self.clients.claim()
  })())
})
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin ||
      !/^\/assets\/.+-[a-zA-Z0-9_-]{8,}\.(js|css|png|jpg|jpeg|webp|gif|woff2?)$/.test(url.pathname)) return
  event.respondWith((async () => {
    let cache
    try {
      cache = await caches.open(ASSET_CACHE)
      const cached = await cache.match(event.request)
      if (cached) return cached
    } catch {}
    const response = await fetch(event.request)
    if (response.ok && cache) {
      try {
        await cache.put(event.request, response.clone())
        const keys = await cache.keys()
        for (const key of keys.slice(0, Math.max(0, keys.length - 100))) await cache.delete(key)
      } catch {}
    }
    return response
  })())
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'FMCI'
  const options = {
    body: data.body || '',
    icon: '/apple-touch-icon.png',
    badge: '/apple-touch-icon.png',
    data: { url: data.url || '/' },
    tag: data.tag || undefined,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin)
  const targetUrl = target.origin === self.location.origin ? target.href : self.location.origin + '/'

  event.waitUntil((async () => {
    const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windowClients) {
      if ('focus' in client) {
        if ('navigate' in client) await client.navigate(targetUrl)
        await client.focus()
        return
      }
    }
    await self.clients.openWindow(targetUrl)
  })())
})
