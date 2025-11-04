'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function HomePage() {
  const [showLoginOptions, setShowLoginOptions] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header con opciones de login */}
      <header className="sticky top-0 bg-white shadow-sm z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">🥗 Zona Azul</span>
            <span className="text-sm text-gray-500">HealthyBox</span>
          </div>

          {/* Login Buttons - Top Right */}
          <nav className="flex gap-3">
            <Link
              href="/suscriptor"
              className="px-4 py-2 text-blue-600 font-semibold hover:bg-blue-50 rounded-lg transition-colors text-sm sm:text-base"
            >
              Suscriptor
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base"
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Principal */}
      <section className="container mx-auto px-4 py-12 sm:py-16 lg:py-24">
        <div className="max-w-5xl mx-auto">
          {/* Hero Content */}
          <div className="text-center mb-12">
            <div className="inline-block mb-4">
              <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-4 py-2 rounded-full">
                ✨ Nuevos planes disponibles
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Alimentación Saludable<br />
              <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Diseñada para Ti
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Planes nutricionales personalizados, menús equilibrados y entrega directa a tu puerta.
              Nuestros nutricionistas certificados diseñarán tu plan ideal.
            </p>

            {/* CTA Principal - Para Invitados */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/booking"
                className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 text-base"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Agendar Cita Gratis
              </Link>

              <Link
                href="/menu"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition-all text-base"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Explorar Menús
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {[
              {
                icon: '⚡',
                title: 'Rápido',
                description: 'Gestión simple y ágil de tus pedidos',
              },
              {
                icon: '🥗',
                title: 'Saludable',
                description: 'Ingredientes frescos y de calidad premium',
              },
              {
                icon: '👨‍⚕️',
                title: 'Profesional',
                description: 'Nutricionistas certificados',
              },
              {
                icon: '🚚',
                title: 'Entrega',
                description: 'Puntual y a domicilio',
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100"
              >
                <div className="text-4xl mb-3">{feature.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Testimonials o Stats */}
          <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl p-8 sm:p-12 text-white mb-16">
            <div className="grid sm:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold mb-2">2500+</div>
                <p className="text-blue-100">Clientes Satisfechos</p>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">1500+</div>
                <p className="text-blue-100">Planes Personalizados</p>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">100%</div>
                <p className="text-blue-100">Satisfacción Garantizada</p>
              </div>
            </div>
          </div>

          {/* Call to Action Final */}
          <div className="text-center py-12 border-t border-gray-200">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              ¿Listo para empezar?
            </h2>
            <p className="text-gray-600 mb-6">
              Contáctanos hoy para tu consulta inicial sin costo
            </p>
            <Link
              href="/booking"
              className="inline-block px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all"
            >
              Agendar Ahora
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Simple */}
      <footer className="bg-gray-900 text-gray-300 py-8">
        <div className="container mx-auto px-4 text-center text-sm">
          <p>© 2025 Zona Azul HealthyBox. Todos los derechos reservados.</p>
        </div>
<<<<<<< HEAD
      </footer>
    </div>
=======
      </div>
<div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center sm:justify-start">
        <Link href="/invitado" className="inline-block px-5 py-3 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors text-center text-sm sm:text-base">
          Entrar como Invitado
        </Link>
</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card text-center p-4 sm:p-6">
          <h3 className="font-semibold text-base sm:text-lg">Rápido</h3>
          <p className="muted mt-2 text-xs sm:text-sm">Pedidos y gestión simples para clientes ocupados.</p>
        </div>
        <div className="card text-center p-4 sm:p-6">
          <h3 className="font-semibold text-base sm:text-lg">Personalizado</h3>
          <p className="muted mt-2 text-xs sm:text-sm">Planes y menús hechos por nutricionistas.</p>
        </div>
        <div className="card text-center p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
          <h3 className="font-semibold text-base sm:text-lg">Entrega</h3>
          <p className="muted mt-2 text-xs sm:text-sm">Logística integrada para entregas puntuales.</p>
        </div>
      </div>
    </section>
>>>>>>> 4e7b504aa020ec2781caf47bf091f0921a3e2cce
  )
}
