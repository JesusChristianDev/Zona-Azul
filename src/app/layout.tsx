import './globals.css'
import React from 'react'
import Link from 'next/link'
import { Metadata, Viewport } from 'next'
import RegisterServiceWorker from './register-sw'
import MobileMenu from '../components/MobileMenu'

export const metadata: Metadata = {
  title: 'HealthyBox - Comidas saludables',
  description: 'Plataforma para agendar citas con nutricionistas y explorar menús saludables',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HealthyBox',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'HealthyBox',
    title: 'HealthyBox - Comidas saludables',
    description: 'Plataforma para agendar citas con nutricionistas y explorar menús saludables',
  },
  twitter: {
    card: 'summary',
    title: 'HealthyBox - Comidas saludables',
    description: 'Plataforma para agendar citas con nutricionistas y explorar menús saludables',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#059669',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="msapplication-TileColor" content="#059669" />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="container flex items-center justify-between py-3 px-4 sm:py-4">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base">
                HB
              </div>
              <h1 className="text-base sm:text-lg font-semibold">HealthyBox</h1>
            </Link>

            <nav className="hidden sm:flex space-x-4">
              <Link href="/" className="text-sm text-gray-700 hover:text-primary transition-colors">
                Inicio
              </Link>
              <Link href="/booking" className="text-sm text-gray-700 hover:text-primary transition-colors">
                Agendar cita
              </Link>
              <Link href="/menu" className="text-sm text-gray-700 hover:text-primary transition-colors">
                Carta
              </Link>
            </nav>

            {/* Mobile menu button */}
            <div className="sm:hidden relative">
              <MobileMenu />
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8 min-h-[calc(100vh-200px)]">{children}</main>

        <footer className="mt-12 border-t bg-white">
          <div className="max-w-5xl mx-auto px-4 py-6 text-xs sm:text-sm text-gray-600 text-center sm:text-left">
            Demo público - HealthyBox
          </div>
        </footer>
        <RegisterServiceWorker />
      </body>
    </html>
  )
}
