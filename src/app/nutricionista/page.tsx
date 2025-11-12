"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import * as api from '../../lib/api'
import { getSubscribers } from '../../lib/subscribers'
import { getAppointments } from '../../lib/api'
import InteractiveGreeting from '../../components/ui/InteractiveGreeting'
import { formatAppointmentDateTime } from '../../lib/dateFormatters'

export default function NutricionistaPage() {
  const { userId, userName } = useAuth()
  const [summary, setSummary] = useState([
    { label: 'Clientes activos', value: 0, delta: 'Cargando...' },
    { label: 'Planes en revisión', value: 0, delta: 'Cargando...' },
    { label: 'Citas pendientes', value: 0, delta: 'Requieren atención' },
  ])
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([])

  useEffect(() => {
    const loadStats = async () => {
      if (!userId) return

      // Obtener clientes del nutricionista desde la API
      const clients = await api.getNutricionistaClients(userId)
      const activeClients = clients.length

      // Contar planes en revisión (clientes con planes asignados) desde la API
      const subscribers = await getSubscribers()
      let plansInReview = 0
      for (const subscriber of subscribers) {
        try {
          const plan = await api.getPlan()
          // Verificar si el plan es del suscriptor actual
          if (plan && plan.user_id === subscriber.id && plan.days && plan.days.length > 0) {
            plansInReview++
          }
        } catch (e) {
          // Plan no encontrado o error
        }
      }

      // Calcular delta de clientes (comparar con semana anterior - mock por ahora)
      const deltaClients = activeClients > 0 ? `Total de clientes asignados` : 'Sin clientes asignados'

      // Cargar citas pendientes y próximas desde la API
      let pendingAppointments = 0
      const appointments: any[] = []
      try {
        const apiAppointments = await getAppointments()
        // Filtrar citas asignadas a este nutricionista o sin asignar
        const myAppointments = apiAppointments.filter(
          (apt: any) => !apt.nutricionista_id || apt.nutricionista_id === userId
        )
        pendingAppointments = myAppointments.filter(
          (apt: any) => !apt.status || apt.status === 'pendiente' || apt.status === 'nueva'
        ).length
        
        // Obtener próximas citas confirmadas (máximo 3)
        const confirmed = myAppointments
          .filter((apt: any) => apt.status === 'confirmada')
          .map((apt: any) => ({
            id: apt.id,
            name: apt.name || 'Cliente',
            email: apt.email || '',
            slot: apt.slot || apt.date_time || '',
            date_time: apt.date_time,
          }))
          .slice(0, 3)
        appointments.push(...confirmed)
      } catch (e) {
        console.error('Error loading appointments:', e)
      }

      setUpcomingAppointments(appointments)

      setSummary([
        { label: 'Clientes activos', value: activeClients, delta: deltaClients },
        { label: 'Planes en revisión', value: plansInReview, delta: `${plansInReview} planes activos` },
        { label: 'Citas pendientes', value: pendingAppointments, delta: 'Requieren atención' },
      ])
    }

    loadStats()

    // Polling cada 5 segundos para actualizar desde la API
    const interval = setInterval(loadStats, 5000)

    return () => {
      clearInterval(interval)
    }
  }, [userId])

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Saludo siempre primero */}
      <div className="w-full">
        <InteractiveGreeting userName={userName || 'Nutricionista'} role="nutricionista" />
      </div>
      <section className="grid gap-3 sm:gap-4 md:grid-cols-3">
        {summary.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-primary/20 bg-white p-4 sm:p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-primary/60">{item.label}</p>
            <p className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-bold text-gray-900">{item.value}</p>
            <p className="mt-1 sm:mt-2 text-xs font-medium text-gray-500">{item.delta}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Próximas citas confirmadas</h2>
            <p className="text-sm text-gray-500">Citas programadas para los próximos días.</p>
          </div>
          <a
            href="/nutricionista/citas"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition"
          >
            Ver todas las citas
          </a>
        </div>
        <div className="mt-5 space-y-3">
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No hay citas confirmadas próximas. Las nuevas solicitudes aparecerán aquí una vez confirmadas.
            </div>
          ) : (
            upcomingAppointments.map((appointment) => (
              <article
                key={appointment.id}
                className="rounded-2xl border border-gray-100 p-4 transition hover:border-primary/40 hover:shadow-md animate-in fade-in slide-in-from-bottom-2"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">
                      {appointment.name
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{appointment.name}</p>
                    <p className="text-xs text-gray-500">{appointment.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-gray-700">
                    {formatAppointmentDateTime(appointment.slot, appointment.date_time)}
                  </p>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

