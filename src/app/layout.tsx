import './globals.css'
import { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import nextDynamic from 'next/dynamic'
import RegisterServiceWorker from './register-sw'
import { PanelProvider } from '../contexts/PanelContext'
import UserPreferencesLoader from '../components/settings/UserPreferencesLoader'

// Lazy load de componentes pesados para mejorar FCP y TTI
// Deshabilitar SSR para evitar problemas de hidratación con hooks del cliente
const DashboardHeader = nextDynamic(() => import('../components/ui/DashboardHeader'), {
  ssr: false, // Deshabilitar SSR porque usa hooks del cliente (useAuth, usePathname)
  loading: () => (
    <header className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-40 border-b border-gray-200 dark:border-slate-700 w-full">
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-4 py-2.5 sm:py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
          <div className="h-8 w-24 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
        </div>
      </div>
    </header>
  ),
})

// Importar PanelsContainer directamente - el componente maneja su propia renderización condicional
import PanelsContainer from '../components/ui/PanelsContainer'

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
        {/* Resource Hints - Optimización de rendimiento */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Preload de recursos críticos - Solo recursos que realmente mejoran LCP */}
        {/* Nota: No preload de iconos/manifest ya que no son críticos para LCP */}
        
        {/* Icons */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="msapplication-TileColor" content="#1d4ed8" />
      </head>
      <body className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 antialiased transition-colors">
        <PanelProvider>
          {/* Cargar preferencias del usuario inmediatamente después del login */}
          <UserPreferencesLoader />
          
          <DashboardHeader />
          
          {/* Contenedor de paneles renderizado fuera del header para asegurar visibilidad */}
          {/* PanelsContainer se renderiza directamente pero solo en el cliente cuando es necesario */}
          <PanelsContainer />

          <main className="w-full">{children}</main>

          <footer className="mt-12 border-t bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
            <div className="w-full max-w-6xl mx-auto px-4 py-6 text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
              Demo público — Zona Azul
            </div>
          </footer>
          <RegisterServiceWorker />
        </PanelProvider>
      </body>
    </html>
  )
}
