import React from 'react'

export default function HomePage() {
  return (
    <section className="space-y-8 container">
      <div className="card hero-gradient flex items-center gap-6">
        <div className="flex-1">
          <h2 className="text-3xl font-bold">HealthyBox — Comidas saludables entregadas</h2>
          <p className="muted mt-2">Solicita una cita con un nutricionista, explora nuestra carta pública y activa tu cuenta después de la consulta.</p>
          <div className="mt-4 flex gap-3">
            <a href="/booking" className="inline-block px-5 py-3 bg-primary text-white rounded-full">Agendar cita</a>
            <a href="/menu" className="inline-block px-5 py-3 border border-gray-200 rounded-full">Ver carta</a>
          </div>
        </div>

        <div className="w-80">
          <img src="/images/salad.svg" alt="hero" className="w-full rounded-lg shadow-md" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card text-center">
          <h3 className="font-semibold">Rápido</h3>
          <p className="muted mt-2">Pedidos y gestión simples para clientes ocupados.</p>
        </div>
        <div className="card text-center">
          <h3 className="font-semibold">Personalizado</h3>
          <p className="muted mt-2">Planes y menús hechos por nutricionistas.</p>
        </div>
        <div className="card text-center">
          <h3 className="font-semibold">Entrega</h3>
          <p className="muted mt-2">Logística integrada para entregas puntuales.</p>
        </div>
      </div>
    </section>
  )
}
