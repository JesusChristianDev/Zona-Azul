import React from 'react'
import Link from 'next/link'

export default function HomePage() {
  return (
    <section className="space-y-6 sm:space-y-8 container">
      <div className="card hero-gradient flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-4 sm:p-6">
        <div className="flex-1 w-full sm:w-auto text-center sm:text-left">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight">
            HealthyBox — Comidas saludables entregadas
          </h2>
          <p className="muted mt-2 text-sm sm:text-base">
            Solicita una cita con un nutricionista, explora nuestra carta pública y activa tu cuenta después de la consulta.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center sm:justify-start">
            <Link
              href="/booking"
              className="inline-block px-5 py-3 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors text-center text-sm sm:text-base"
            >
              Agendar cita
            </Link>
            <Link
              href="/menu"
              className="inline-block px-5 py-3 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors text-center text-sm sm:text-base"
            >
              Ver carta
            </Link>
          </div>
        </div>

        <div className="w-full sm:w-80 flex-shrink-0">
          <img
            src="/images/salad.svg"
            alt="hero"
            className="w-full rounded-lg shadow-md"
          />
        </div>
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
  )
}
