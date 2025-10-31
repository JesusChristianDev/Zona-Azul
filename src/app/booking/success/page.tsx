import React from 'react'

export default function BookingSuccess() {
  const appointments = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('demo_appointments') || '[]') : []
  const last = appointments.length ? appointments[appointments.length - 1] : null

  return (
    <div className="card">
      <h2 className="text-xl font-semibold">Solicitud enviada</h2>
      {last ? (
        <div className="mt-3">
          <p className="muted">Gracias {last.name}, hemos guardado tu solicitud.</p>
          <p className="mt-2">Slot elegido: <strong>{last.slot}</strong></p>
        </div>
      ) : (
        <p className="muted mt-3">No hay solicitudes recientes en este navegador.</p>
      )}

      <div className="mt-4">
        <a className="px-4 py-2 bg-blue-600 text-white rounded" href="/">Volver al inicio</a>
      </div>
    </div>
  )
}
