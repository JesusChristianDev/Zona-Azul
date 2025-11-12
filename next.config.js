/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimizaciones de rendimiento
  compress: true,
  poweredByHeader: false,
  
  // Next.js ya tiene code splitting optimizado por defecto
  // No necesitamos modificar webpack para esto
  
  // Configuración para PWA
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate',
          },
        ],
      },
      {
        source: '/icon-:size.png',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Forzar no-cache para la página de admin/citas para evitar problemas de renderizado
        source: '/admin/citas',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        // Optimizar caché para assets estáticos de Next.js
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  
  // Optimizaciones de imágenes
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Optimización adicional
    unoptimized: false,
  },
  
  // Optimizaciones de compilación
  swcMinify: true,
  
  // Optimizaciones de producción
  productionBrowserSourceMaps: false,
  
  // Optimización de bundle
  experimental: {
    optimizeCss: false, // Ya removido anteriormente por problemas
  },
  
  // Configuración para evitar errores de prerenderizado de páginas de error
  // Las páginas de error (404, 500) son Client Components y no deben prerenderizarse
  skipTrailingSlashRedirect: true,
}

module.exports = nextConfig

