import './globals.css'
import { Metadata, Viewport } from 'next'
import RegisterServiceWorker from './register-sw'
import DashboardHeader from '../components/ui/DashboardHeader'

// Forzar renderizado dinámico para evitar errores de prerenderizado con componentes cliente
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Zona Azul — Bienestar integral',
  description: 'Plataforma Zona Azul: nutrición personalizada, comunidad y seguimiento de hábitos en una PWA moderna.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Zona Azul',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Zona Azul',
    title: 'Zona Azul — Bienestar integral',
    description: 'Estrategia integral de bienestar: planes, dashboards y contenidos motivadores.',
  },
  twitter: {
    card: 'summary',
    title: 'Zona Azul — Bienestar integral',
    description: 'Plan maestro de bienestar: nutrición, comunidad y expansión.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#1d4ed8',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" type="image/png" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="msapplication-TileColor" content="#1d4ed8" />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <DashboardHeader />

        <main className="w-full">{children}</main>

        <footer className="mt-12 border-t bg-white">
          <div className="w-full max-w-6xl mx-auto px-4 py-6 text-xs sm:text-sm text-gray-600 text-center sm:text-left">
            Demo público — Zona Azul
          </div>
        </footer>
        <RegisterServiceWorker />
      </body>
    </html>
  )
}
