"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import Modal from '../../../components/ui/Modal'
import { NotificationHelpers } from '../../../lib/notifications'

interface Appointment {
  id: string
  name: string
  email: string
  phone?: string
  slot: string
  created_at?: string
  status?: 'pendiente' | 'confirmada' | 'cancelada' | 'completada'
  notes?: string
  nutritionistId?: string
}

type FilterStatus = 'todas' | 'pendiente' | 'confirmada' | 'cancelada' | 'completada'

export default function NutricionistaCitasPage() {
  const { userId } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [previousAppointments, setPreviousAppointments] = useState<Appointment[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([])
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [filter, setFilter] = useState<FilterStatus>('todas')
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Función para cargar citas
  const loadAppointments = () => {
    try {
      const stored = localStorage.getItem('demo_appointments')
      if (stored) {
        const parsed = JSON.parse(stored)
        // Filtrar citas asignadas a este nutricionista o sin asignar
        const filtered = parsed.filter((apt: Appointment) => 
          !apt.nutritionistId || apt.nutritionistId === userId
        )
        // Ordenar por fecha de creación (más recientes primero)
        const sorted = filtered.sort((a: Appointment, b: Appointment) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
          return dateB - dateA
        })

        // Detectar nuevas citas pendientes
        if (previousAppointments.length > 0 && document.hidden) {
          const newAppointments = sorted.filter(
            (current: Appointment) =>
              (current.status === 'pendiente' || !current.status) &&
              !previousAppointments.some((prev) => prev.id === current.id)
          )

          newAppointments.forEach((apt: Appointment) => {
            NotificationHelpers.newAppointment(
              apt.name,
              apt.slot,
              '/nutricionista/citas',
              userId
            )
          })
        }

        setPreviousAppointments(sorted)
        setAppointments(sorted)
      } else {
        setAppointments([])
      }
    } catch (error) {
      console.error('Error loading appointments:', error)
      setAppointments([])
    }
  }

  useEffect(() => {
    loadAppointments()

    // Escuchar cambios en localStorage (otras pestañas)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'demo_appointments') {
        loadAppointments()
      }
    }

    // Escuchar cambios locales (misma pestaña)
    const handleAppointmentsUpdate = () => {
      loadAppointments()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('zona_azul_appointments_updated', handleAppointmentsUpdate)

    // Polling cada 2 segundos para detectar cambios (fallback)
    const interval = setInterval(loadAppointments, 2000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('zona_azul_appointments_updated', handleAppointmentsUpdate)
      clearInterval(interval)
    }
  }, [userId])

  // Filtrar y buscar citas
  useEffect(() => {
    let filtered = appointments

    // Filtrar por estado
    if (filter !== 'todas') {
      filtered = filtered.filter((apt) => {
        if (filter === 'pendiente') {
          return !apt.status || apt.status === 'pendiente' || apt.status === 'nueva'
        }
        return apt.status === filter
      })
    }

    // Buscar por nombre o email
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (apt) =>
          apt.name.toLowerCase().includes(term) ||
          apt.email.toLowerCase().includes(term) ||
          (apt.phone && apt.phone.includes(term))
      )
    }

    setFilteredAppointments(filtered)
  }, [appointments, filter, searchTerm])

  const showToast = (message: string, isError = false) => {
    if (isError) {
      setError(message)
      setTimeout(() => setError(null), 5000)
    } else {
      setSuccess(message)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  // Notificar a otras pestañas/componentes que las citas fueron actualizadas
  const notifyAppointmentsUpdate = () => {
    window.dispatchEvent(new Event('zona_azul_appointments_updated'))
  }

  const handleViewDetail = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setNotes(appointment.notes || '')
    setIsDetailModalOpen(true)
  }

  const handleChangeStatus = (appointmentId: string, newStatus: 'confirmada' | 'cancelada' | 'completada') => {
    const updated = appointments.map((apt) => {
      if (apt.id === appointmentId) {
        const updatedApt = { ...apt, status: newStatus }
        // Si se confirma, asignar al nutricionista actual
        if (newStatus === 'confirmada' && !apt.nutritionistId) {
          updatedApt.nutritionistId = userId
        }
        return updatedApt
      }
      return apt
    })
    setAppointments(updated)
    localStorage.setItem('demo_appointments', JSON.stringify(updated))
    notifyAppointmentsUpdate()
    showToast(`Cita ${newStatus === 'confirmada' ? 'confirmada' : newStatus === 'completada' ? 'marcada como completada' : 'cancelada'} correctamente`)
    if (selectedAppointment?.id === appointmentId) {
      setSelectedAppointment({ ...selectedAppointment, status: newStatus })
    }
  }

  const handleSaveNotes = () => {
    if (!selectedAppointment) return

    const updated = appointments.map((apt) =>
      apt.id === selectedAppointment.id ? { ...apt, notes } : apt
    )
    setAppointments(updated)
    localStorage.setItem('demo_appointments', JSON.stringify(updated))
    notifyAppointmentsUpdate()
    setSelectedAppointment({ ...selectedAppointment, notes })
    setIsNotesModalOpen(false)
    showToast('Notas guardadas correctamente')
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'confirmada':
        return 'bg-primary/10 text-primary border-primary/20'
      case 'completada':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'cancelada':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'pendiente':
      default:
        return 'bg-highlight/10 text-highlight border-highlight/20'
    }
  }

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'confirmada':
        return 'Confirmada'
      case 'completada':
        return 'Completada'
      case 'cancelada':
        return 'Cancelada'
      case 'pendiente':
      default:
        return 'Pendiente'
    }
  }

  const pendingAppointments = appointments.filter(
    (apt) => !apt.status || apt.status === 'pendiente' || apt.status === 'nueva'
  )
  const confirmedAppointments = appointments.filter((apt) => apt.status === 'confirmada')
  const completedAppointments = appointments.filter((apt) => apt.status === 'completada')
  const todayAppointments = appointments.filter((apt) => {
    if (!apt.slot) return false
    const today = new Date().toLocaleDateString('es-ES')
    return apt.slot.includes(today) || apt.slot.toLowerCase().includes('hoy')
  })

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-700 text-sm animate-in fade-in slide-in-from-top-2">
          {success}
        </div>
      )}

      <header className="rounded-2xl border border-accent/30 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">Gestión de citas</h2>
        <p className="mt-2 text-sm text-gray-600">
          Administra tus citas nutricionales. Confirma, programa y realiza seguimiento de tus consultas.
        </p>
      </header>

      {/* Resumen */}
      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-2xl border border-highlight/20 bg-white p-5 shadow-sm transition hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wider text-highlight/80">Pendientes</p>
          <p className="mt-3 text-3xl font-bold text-gray-900">{pendingAppointments.length}</p>
          <p className="mt-2 text-xs text-gray-500">Requieren atención</p>
        </article>
        <article className="rounded-2xl border border-primary/20 bg-white p-5 shadow-sm transition hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary/80">Confirmadas</p>
          <p className="mt-3 text-3xl font-bold text-gray-900">{confirmedAppointments.length}</p>
          <p className="mt-2 text-xs text-gray-500">Citas programadas</p>
        </article>
        <article className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm transition hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wider text-green-700">Completadas</p>
          <p className="mt-3 text-3xl font-bold text-gray-900">{completedAppointments.length}</p>
          <p className="mt-2 text-xs text-gray-500">Sesiones finalizadas</p>
        </article>
        <article className="rounded-2xl border border-accent/20 bg-white p-5 shadow-sm transition hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent/80">Hoy</p>
          <p className="mt-3 text-3xl font-bold text-gray-900">{todayAppointments.length}</p>
          <p className="mt-2 text-xs text-gray-500">Citas de hoy</p>
        </article>
      </section>

      {/* Filtros y búsqueda */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por nombre, email o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['todas', 'pendiente', 'confirmada', 'completada', 'cancelada'] as FilterStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  filter === status
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'todas' ? 'Todas' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Lista de citas */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {filter === 'todas' ? 'Todas las citas' : `Citas ${filter === 'pendiente' ? 'pendientes' : filter}`}
            {filteredAppointments.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">({filteredAppointments.length})</span>
            )}
          </h3>
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">
              {searchTerm
                ? 'No se encontraron citas con ese criterio de búsqueda.'
                : filter !== 'todas'
                ? `No hay citas ${filter === 'pendiente' ? 'pendientes' : filter}.`
                : 'No hay citas registradas aún.'}
            </p>
          </div>
        ) : (
          filteredAppointments.map((appointment) => (
            <article
              key={appointment.id}
              className="rounded-2xl border border-gray-200 p-5 transition hover:border-primary/40 hover:shadow-md animate-in fade-in slide-in-from-bottom-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold text-sm">
                        {appointment.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{appointment.name}</p>
                      <p className="text-xs text-gray-500">{appointment.email}</p>
                    </div>
                  </div>
                  {appointment.phone && (
                    <p className="text-xs text-gray-500 mb-2">
                      <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      {appointment.phone}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-sm font-medium text-gray-700">{appointment.slot}</p>
                  </div>
                  {appointment.created_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      Solicitud: {new Date(appointment.created_at).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold border ${getStatusColor(appointment.status)}`}
                  >
                    {getStatusLabel(appointment.status)}
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleViewDetail(appointment)}
                      className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-primary hover:text-primary hover:bg-primary/5 transition"
                    >
                      Ver detalle
                    </button>
                    {appointment.status !== 'confirmada' && appointment.status !== 'completada' && (
                      <button
                        onClick={() => handleChangeStatus(appointment.id, 'confirmada')}
                        className="rounded-full border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary hover:text-white transition"
                      >
                        Confirmar
                      </button>
                    )}
                    {appointment.status === 'confirmada' && (
                      <button
                        onClick={() => handleChangeStatus(appointment.id, 'completada')}
                        className="rounded-full border border-green-500 px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-500 hover:text-white transition"
                      >
                        Completar
                      </button>
                    )}
                    {appointment.status !== 'cancelada' && appointment.status !== 'completada' && (
                      <button
                        onClick={() => handleChangeStatus(appointment.id, 'cancelada')}
                        className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-500 hover:text-white transition"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {appointment.notes && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-1">Notas:</p>
                  <p className="text-sm text-gray-700">{appointment.notes}</p>
                </div>
              )}
            </article>
          ))
        )}
      </section>

      {/* Modal Detalle */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedAppointment(null)
        }}
        title="Detalle de la cita"
        size="md"
      >
        {selectedAppointment && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Nombre completo</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{selectedAppointment.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{selectedAppointment.email}</p>
            </div>
            {selectedAppointment.phone && (
              <div>
                <p className="text-sm font-medium text-gray-500">Teléfono</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">{selectedAppointment.phone}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-500">Horario solicitado</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{selectedAppointment.slot}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Estado</p>
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-semibold border mt-1 ${getStatusColor(
                  selectedAppointment.status
                )}`}
              >
                {getStatusLabel(selectedAppointment.status)}
              </span>
            </div>
            {selectedAppointment.created_at && (
              <div>
                <p className="text-sm font-medium text-gray-500">Fecha de solicitud</p>
                <p className="text-sm text-gray-700 mt-1">
                  {new Date(selectedAppointment.created_at).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-500">Notas de la consulta</p>
                <button
                  onClick={() => {
                    setIsNotesModalOpen(true)
                  }}
                  className="text-xs text-primary hover:text-primary/80 font-medium"
                >
                  {selectedAppointment.notes ? 'Editar' : 'Agregar'} notas
                </button>
              </div>
              {selectedAppointment.notes ? (
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedAppointment.notes}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No hay notas registradas</p>
              )}
            </div>
            <div className="flex gap-3 pt-4 border-t">
              {selectedAppointment.status !== 'confirmada' && selectedAppointment.status !== 'completada' && (
                <button
                  onClick={() => {
                    handleChangeStatus(selectedAppointment.id, 'confirmada')
                    setIsDetailModalOpen(false)
                  }}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium"
                >
                  Confirmar cita
                </button>
              )}
              {selectedAppointment.status === 'confirmada' && (
                <button
                  onClick={() => {
                    handleChangeStatus(selectedAppointment.id, 'completada')
                    setIsDetailModalOpen(false)
                  }}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium"
                >
                  Marcar como completada
                </button>
              )}
              {selectedAppointment.status !== 'cancelada' && selectedAppointment.status !== 'completada' && (
                <button
                  onClick={() => {
                    handleChangeStatus(selectedAppointment.id, 'cancelada')
                    setIsDetailModalOpen(false)
                  }}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium"
                >
                  Cancelar cita
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Notas */}
      <Modal
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        title="Notas de la consulta"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agrega notas sobre la consulta, objetivos, recomendaciones, etc.
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition resize-none"
              placeholder="Escribe tus notas aquí..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setIsNotesModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveNotes}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium"
            >
              Guardar notas
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

