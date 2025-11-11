"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import Modal from '../../../components/ui/Modal'
import { NotificationHelpers } from '../../../lib/notifications'
import { getAppointments, updateAppointment, getCalendarAuthUrl, getNutritionistSchedule, updateNutritionistSchedule } from '../../../lib/api'

interface Appointment {
  id: string
  name: string
  email: string
  phone?: string
  slot: string
  created_at?: string
  status?: 'pendiente' | 'nueva' | 'confirmada' | 'cancelada' | 'completada'
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
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [checkingCalendar, setCheckingCalendar] = useState(true)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [schedule, setSchedule] = useState<any>(null)
  const [savingSchedule, setSavingSchedule] = useState(false)

  // Verificar si el calendario está conectado
  const checkCalendarConnection = async () => {
    if (!userId) return

    try {
      const response = await fetch('/api/calendar/status', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setCalendarConnected(data.connected || false)
      }
    } catch (error) {
      console.error('Error checking calendar connection:', error)
    } finally {
      setCheckingCalendar(false)
    }
  }

  const handleConnectCalendar = async () => {
    try {
      console.log('Iniciando conexión de calendario...')
      const authUrl = await getCalendarAuthUrl()
      console.log('URL de autorización obtenida:', authUrl ? 'Sí' : 'No')

      if (authUrl) {
        console.log('Redirigiendo a Google OAuth...')
        window.location.href = authUrl
      } else {
        console.error('No se obtuvo URL de autorización')
        showToast('Error al obtener URL de autorización', true)
      }
    } catch (error: any) {
      console.error('Error connecting calendar:', error)
      const errorMessage = error?.message || 'Error desconocido al conectar calendario'
      showToast(`Error: ${errorMessage}`, true)
    }
  }

  // Cargar horarios del nutricionista
  const loadSchedule = async () => {
    if (!userId) return

    try {
      const nutritionistSchedule = await getNutritionistSchedule()
      // Si no hay horarios configurados, usar valores por defecto
      if (!nutritionistSchedule) {
        setSchedule({
          monday_start_hour: 9,
          monday_end_hour: 18,
          monday_enabled: true,
          tuesday_start_hour: 9,
          tuesday_end_hour: 18,
          tuesday_enabled: true,
          wednesday_start_hour: 9,
          wednesday_end_hour: 18,
          wednesday_enabled: true,
          thursday_start_hour: 9,
          thursday_end_hour: 18,
          thursday_enabled: true,
          friday_start_hour: 9,
          friday_end_hour: 18,
          friday_enabled: true,
          saturday_start_hour: null,
          saturday_end_hour: null,
          saturday_enabled: false,
          sunday_start_hour: null,
          sunday_end_hour: null,
          sunday_enabled: false,
          slot_duration_minutes: 60,
        })
      } else {
        setSchedule(nutritionistSchedule)
      }
    } catch (error) {
      console.error('Error loading schedule:', error)
      // Usar valores por defecto en caso de error
      setSchedule({
        monday_start_hour: 9,
        monday_end_hour: 18,
        monday_enabled: true,
        tuesday_start_hour: 9,
        tuesday_end_hour: 18,
        tuesday_enabled: true,
        wednesday_start_hour: 9,
        wednesday_end_hour: 18,
        wednesday_enabled: true,
        thursday_start_hour: 9,
        thursday_end_hour: 18,
        thursday_enabled: true,
        friday_start_hour: 9,
        friday_end_hour: 18,
        friday_enabled: true,
        saturday_start_hour: null,
        saturday_end_hour: null,
        saturday_enabled: false,
        sunday_start_hour: null,
        sunday_end_hour: null,
        sunday_enabled: false,
        slot_duration_minutes: 60,
      })
    }
  }

  // Guardar horarios
  const handleSaveSchedule = async () => {
    if (!userId || !schedule) return

    setSavingSchedule(true)
    try {
      const updated = await updateNutritionistSchedule(schedule)
      if (updated) {
        setSchedule(updated)
        setIsScheduleModalOpen(false)
        showToast('Horarios guardados correctamente')
      } else {
        showToast('Error al guardar horarios', true)
      }
    } catch (error: any) {
      console.error('Error saving schedule:', error)
      showToast(error?.message || 'Error al guardar horarios', true)
    } finally {
      setSavingSchedule(false)
    }
  }

  // Función para cargar citas desde la API
  const loadAppointments = async () => {
    if (!userId) return

    try {
      const apiAppointments = await getAppointments()

      // Filtrar citas asignadas a este nutricionista o sin asignar
      const filtered = apiAppointments
        .filter((apt: any) => !apt.nutricionista_id || apt.nutricionista_id === userId)
        .map((apt: any) => ({
          id: apt.id,
          name: apt.name || 'Cliente',
          email: apt.email || '',
          phone: apt.phone || undefined,
          slot: apt.date_time || '',
          created_at: apt.created_at,
          status: apt.status || 'pendiente',
          notes: apt.notes || undefined,
          nutritionistId: apt.nutricionista_id || undefined,
        } as Appointment))

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
    } catch (error) {
      console.error('Error loading appointments:', error)
      setAppointments([])
    }
  }

  useEffect(() => {
    loadAppointments()
    checkCalendarConnection()
    loadSchedule()

    // Verificar si hay mensajes de éxito/error en la URL (del callback de OAuth)
    const urlParams = new URLSearchParams(window.location.search)
    const successParam = urlParams.get('success')
    const errorParam = urlParams.get('error')

    if (successParam === 'calendar_connected') {
      showToast('Calendario de Google conectado correctamente')
      setCalendarConnected(true)
      // Limpiar URL
      window.history.replaceState({}, '', window.location.pathname)
    } else if (errorParam) {
      showToast(`Error al conectar calendario: ${errorParam}`, true)
      // Limpiar URL
      window.history.replaceState({}, '', window.location.pathname)
    }

    // Escuchar cambios locales (misma pestaña)
    const handleAppointmentsUpdate = () => {
      loadAppointments()
    }

    window.addEventListener('zona_azul_appointments_updated', handleAppointmentsUpdate)

    // Polling cada 10 segundos para actualizar
    const interval = setInterval(loadAppointments, 10000)

    return () => {
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

  const handleChangeStatus = async (appointmentId: string, newStatus: 'confirmada' | 'cancelada' | 'completada') => {
    if (!userId) return

    try {
      // Mapear estados del frontend a estados de API
      const apiStatusMap: Record<string, string> = {
        'confirmada': 'confirmada',
        'cancelada': 'cancelada',
        'completada': 'completada',
      }
      const apiStatus = apiStatusMap[newStatus] || 'pendiente'

      const updateData: any = { status: apiStatus }

      // Si se confirma, asignar al nutricionista actual
      if (newStatus === 'confirmada') {
        updateData.nutricionista_id = userId
      }

      const updated = await updateAppointment(appointmentId, updateData)

      if (updated) {
        // Recargar citas
        await loadAppointments()
        showToast(`Cita ${newStatus === 'confirmada' ? 'confirmada' : newStatus === 'completada' ? 'marcada como completada' : 'cancelada'} correctamente`)

        // Actualizar selectedAppointment si es el mismo
        if (selectedAppointment?.id === appointmentId) {
          const updatedApt = appointments.find((apt) => apt.id === appointmentId)
          if (updatedApt) {
            setSelectedAppointment({ ...updatedApt, status: newStatus })
          }
        }
      } else {
        showToast('Error al actualizar la cita', true)
      }
    } catch (error: any) {
      console.error('Error updating appointment:', error)
      showToast(error.message || 'Error al actualizar la cita', true)
    }
  }

  const handleSaveNotes = async () => {
    if (!selectedAppointment) return

    try {
      const updated = await updateAppointment(selectedAppointment.id, { notes })

      if (updated) {
        // Recargar citas
        await loadAppointments()
        setSelectedAppointment({ ...selectedAppointment, notes })
        setIsNotesModalOpen(false)
        showToast('Notas guardadas correctamente')
      } else {
        showToast('Error al guardar las notas', true)
      }
    } catch (error: any) {
      console.error('Error saving notes:', error)
      showToast(error.message || 'Error al guardar las notas', true)
    }
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
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gestión de citas</h2>
            <p className="mt-2 text-sm text-gray-600">
              Administra tus citas nutricionales. Confirma, programa y realiza seguimiento de tus consultas.
            </p>
          </div>
          {!checkingCalendar && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsScheduleModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition text-sm font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Configurar Horarios
              </button>
              {calendarConnected ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Calendario conectado</span>
                </div>
              ) : (
                <button
                  onClick={handleConnectCalendar}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Conectar Google Calendar
                </button>
              )}
            </div>
          )}
        </div>
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
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${filter === status
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

      {/* Modal Configurar Horarios */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title="Configurar Horarios de Trabajo"
        size="lg"
      >
        {schedule && (
          <div className="space-y-6">
            <p className="text-sm text-gray-600">
              Configura tus horarios de disponibilidad. Los usuarios solo podrán agendar citas en estos horarios.
            </p>

            {/* Duración de las citas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duración de las citas (minutos)
              </label>
              <input
                type="number"
                min="15"
                max="240"
                step="15"
                value={schedule.slot_duration_minutes || 60}
                onChange={(e) => setSchedule({ ...schedule, slot_duration_minutes: parseInt(e.target.value) || 60 })}
                className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>

            {/* Horarios por día */}
            <div className="space-y-4">
              {[
                { key: 'monday', label: 'Lunes' },
                { key: 'tuesday', label: 'Martes' },
                { key: 'wednesday', label: 'Miércoles' },
                { key: 'thursday', label: 'Jueves' },
                { key: 'friday', label: 'Viernes' },
                { key: 'saturday', label: 'Sábado' },
                { key: 'sunday', label: 'Domingo' },
              ].map((day) => {
                const enabled = schedule[`${day.key}_enabled`] as boolean
                const startHour = schedule[`${day.key}_start_hour`] as number | null
                const endHour = schedule[`${day.key}_end_hour`] as number | null

                return (
                  <div key={day.key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => {
                            setSchedule({
                              ...schedule,
                              [`${day.key}_enabled`]: e.target.checked,
                              [`${day.key}_start_hour`]: e.target.checked ? (startHour || 9) : null,
                              [`${day.key}_end_hour`]: e.target.checked ? (endHour || 18) : null,
                            })
                          }}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <span>{day.label}</span>
                      </label>
                    </div>
                    {enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Hora inicio</label>
                          <input
                            type="number"
                            min="0"
                            max="23"
                            value={startHour || 9}
                            onChange={(e) => {
                              const hour = parseInt(e.target.value) || 0
                              if (hour >= 0 && hour <= 23) {
                                setSchedule({ ...schedule, [`${day.key}_start_hour`]: hour })
                              }
                            }}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Hora fin</label>
                          <input
                            type="number"
                            min="0"
                            max="23"
                            value={endHour || 18}
                            onChange={(e) => {
                              const hour = parseInt(e.target.value) || 0
                              if (hour >= 0 && hour <= 23) {
                                setSchedule({ ...schedule, [`${day.key}_end_hour`]: hour })
                              }
                            }}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSchedule}
                disabled={savingSchedule}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingSchedule ? 'Guardando...' : 'Guardar horarios'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

