"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface Appointment {
  id: string
  name: string
  email: string
  phone?: string
  slot: string
  created_at?: string
}

export default function BookingSuccess() {
  const [last, setLast] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLastAppointment = async () => {
      try {
        const { getAppointments } = await import('../../lib/api')
        const appointments = await getAppointments()
        if (appointments && appointments.length > 0) {
          // Ordenar por fecha y obtener el más reciente
          const sorted = appointments.sort((a: any, b: any) => 
            new Date(b.created_at || b.date_time).getTime() - new Date(a.created_at || a.date_time).getTime()
          )
          const lastAppointment = sorted[0]
          setLast({
            id: lastAppointment.id,
            name: lastAppointment.user_name || 'Usuario',
            email: lastAppointment.user_email || '',
            phone: lastAppointment.user_phone,
            slot: new Date(lastAppointment.date_time).toLocaleString('es-ES'),
            created_at: lastAppointment.created_at,
          })
        }
      } catch (error) {
        console.error('Error reading appointments:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadLastAppointment()
  }, [])

  if (loading) {
    return (
      <div className="card p-4 sm:p-6 text-center">
        <p className="muted text-sm sm:text-base">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="card p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="text-center sm:text-left">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto sm:mx-0 mb-4 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold">Solicitud enviada</h2>
      </div>

      {last ? (
        <div className="mt-3 space-y-3">
          <p className="muted text-sm sm:text-base">
            Gracias <strong>{last.name}</strong>, hemos guardado tu solicitud.
          </p>
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Slot elegido:</p>
            <p className="font-semibold text-sm sm:text-base">{last.slot}</p>
          </div>
        </div>
      ) : (
        <p className="muted mt-3 text-sm sm:text-base text-center sm:text-left">
          No hay solicitudes recientes en este navegador.
        </p>
      )}

      <div className="mt-6 flex justify-center sm:justify-start">
        <Link
          href="/"
          className="inline-block w-full sm:w-auto text-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
