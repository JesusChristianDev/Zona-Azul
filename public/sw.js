// Service Worker para la PWA Zona Azul
const CACHE_NAME = 'zona-azul-cache-v3'
const urlsToCache = [
  '/',
  '/login',
  '/invitado',
  '/booking',
  '/activate',
  '/menu',
  '/admin',
  '/admin/menu',
  '/admin/usuarios',
  '/admin/pedidos',
  '/suscriptor',
  '/suscriptor/plan',
  '/suscriptor/pedidos',
  '/suscriptor/progreso',
  '/nutricionista',
  '/nutricionista/clientes',
  '/nutricionista/planes',
  '/repartidor',
  '/repartidor/pedidos',
  '/repartidor/historial',
  '/images/salad.svg',
  '/images/bowl.svg',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
]

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Zona Azul SW: caché precargado')
        return cache.addAll(urlsToCache)
      })
  )
})

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Zona Azul SW: eliminando caché antiguo', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// Estrategia: Network First, fallback a cache
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // No cachear requests POST, PUT, DELETE, etc. (solo GET)
  if (request.method !== 'GET') {
    return
  }

  // No cachear requests a API routes
  if (url.pathname.startsWith('/api/')) {
    return
  }

  // No cachear requests a _next (Next.js internals)
  if (url.pathname.startsWith('/_next/')) {
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Solo cachear respuestas exitosas y básicas (no opaques)
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }

        const responseToCache = response.clone()

        // Cachear en background (no bloquear la respuesta)
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache).catch((err) => {
            console.warn('Zona Azul SW: Error al cachear', request.url, err)
          })
        })

        return response
      })
      .catch(() => {
        // Si falla la red, intentar obtener del cache
        return caches.match(request)
      })
  )
})

