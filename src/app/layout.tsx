import './globals.css'
import React from 'react'

export const metadata = {
  title: 'HealthyBox - Demo Public UI',
  description: 'Interfaz pública para testing de booking y carta',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="bg-white shadow">
          <div className="container flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">HB</div>
              <h1 className="text-lg font-semibold">HealthyBox</h1>
            </div>

            <nav className="space-x-4">
              <a href="/" className="text-sm text-gray-700 hover:text-primary">Inicio</a>
              <a href="/booking" className="text-sm text-gray-700 hover:text-primary">Agendar cita</a>
              <a href="/menu" className="text-sm text-gray-700 hover:text-primary">Carta</a>
            </nav>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>

        <footer className="mt-12 border-t bg-white">
          <div className="max-w-5xl mx-auto px-4 py-6 text-sm text-gray-600">Demo público - HealthyBox</div>
        </footer>
      </body>
    </html>
  )
}
