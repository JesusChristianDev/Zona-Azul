import React from 'react'

export default function Hero() {
  return (
    <div className="card hero-gradient flex items-center gap-6">
      <div className="flex-1">
        <h2 className="text-3xl font-bold">HealthyBox — Comidas saludables entregadas</h2>
        <p className="muted mt-2">Solicita una cita con un nutricionista, explora nuestra carta pública y activa tu cuenta después de la consulta.</p>
      </div>
      <div className="w-80">
        <img src="/images/salad.svg" alt="hero" className="w-full rounded-lg shadow-md" />
      </div>
    </div>
  )
}
