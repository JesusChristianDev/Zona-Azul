// Service Worker para la PWA Zona Azul - Optimizado
const CACHE_NAME = 'zona-azul-cache-v4'
const STATIC_CACHE = 'zona-azul-static-v4'
const DYNAMIC_CACHE = 'zona-azul-dynamic-v4'

// Recursos críticos para precache (solo assets estáticos)
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/images/salad.svg',
  '/images/bowl.svg',
]

// Instalación del Service Worker - Optimizada
self.addEventListener('install', (event) => {
  self.skipWaiting() // Activar inmediatamente
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        // Solo cachear assets estáticos críticos
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('SW: Error precacheando algunos assets', err)
        })
      })
  )
})

// Activación del Service Worker - Optimizada
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              return caches.delete(cacheName)
            }
          })
        )
      }),
      // Tomar control inmediatamente
      self.clients.claim()
    ])
  )
})

// Estrategia de caché optimizada
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Solo procesar requests GET
  if (request.method !== 'GET') {
    return
  }

  // Nunca cachear API routes (siempre frescas)
  if (url.pathname.startsWith('/api/')) {
    return
  }

  // Cache First para assets estáticos
  if (url.pathname.startsWith('/_next/static/') || 
      url.pathname.startsWith('/images/') ||
      url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff|woff2|ttf|eot)$/)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone()
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return response
        })
      })
    )
    return
  }

  // Network First para páginas HTML (siempre frescas, fallback a cache)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Solo cachear respuestas exitosas
          if (response && response.status === 200) {
            const responseToCache = response.clone()
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return response
        })
        .catch(() => {
          // Fallback a cache solo si falla la red
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || new Response('Sin conexión', { status: 503 })
          })
        })
    )
    return
  }

  // Para otros recursos, usar Network First
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseToCache = response.clone()
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache)
          })
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})

// Manejar notificaciones push
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'Zona Azul',
    body: 'Tienes una nueva notificación',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'zona-azul-notification',
    requireInteraction: false,
    data: {}
  }

  if (event.data) {
    try {
      const data = event.data.json()
      notificationData = {
        ...notificationData,
        ...data,
        data: data.data || {}
      }
    } catch (e) {
      notificationData.body = event.data.text() || notificationData.body
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      vibrate: [200, 100, 200],
      actions: notificationData.actions || []
    })
  )
})

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const notificationData = event.notification.data || {}
  const urlToOpen = notificationData.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si hay una ventana abierta, enfocarla
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      // Si no hay ventana abierta, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// Limpiar cache dinámico periódicamente (mantener solo últimas 50 entradas)
async function cleanDynamicCache() {
  const cache = await caches.open(DYNAMIC_CACHE)
  const keys = await cache.keys()
  if (keys.length > 50) {
    // Eliminar las más antiguas
    const toDelete = keys.slice(0, keys.length - 50)
    await Promise.all(toDelete.map(key => cache.delete(key)))
  }
}

// Limpiar cache cada hora
setInterval(cleanDynamicCache, 60 * 60 * 1000)

