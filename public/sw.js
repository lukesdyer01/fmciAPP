// Minimal service worker: exists to (1) satisfy PWA installability, and
// (2) receive Web Push on iOS/Android for an installed home-screen app.
// Deliberately does NOT precache the Vite build — bundle filenames are
// content-hashed per deploy and there's no build-time manifest generator
// (e.g. vite-plugin-pwa) in this project to keep a precache list in sync,
// so a hardcoded list would go stale and serve broken JS/CSS after a
// future deploy.
const SHELL_CACHE = 'fmci-shell-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  // Only special-case top-level page navigations. Everything else (JS, CSS,
  // images) passes straight through to the network untouched.
  if (event.request.mode !== 'navigate') return

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // Opportunistically keep a copy of the shell so a later offline/
        // failed navigation (see catch below) has something to serve.
        const copy = res.clone()
        caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy))
        return res
      })
      .catch(async () => {
        // Network failed, or (more commonly here) a direct/deep-link load of
        // an inner route like /resources — this serves the cached shell
        // directly instead of round-tripping through GitHub Pages' 404.html
        // redirect trick (public/404.html + the decode script in index.html).
        const cache = await caches.open(SHELL_CACHE)
        const cached = await cache.match('/index.html')
        return cached ?? fetch('/index.html')
      })
  )
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
