"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import Modal from '../../../components/ui/Modal'
import { NotificationHelpers } from '../../../lib/notifications'
import { getAppointments, updateAppointment, createUser, getCalendarAuthUrl, getNutritionistSchedule, updateNutritionistSchedule } from '../../../lib/api'
import { formatAppointmentDateTime, formatCreatedDate } from '../../../lib/dateFormatters'

interface Appointment {
  id: string
  name: string
  email: string
  phone?: string
  slot: string
  date_time?: string
  created_at?: string
  status?: 'pendiente' | 'nueva' | 'confirmada' | 'cancelada' | 'completada'
  notes?: string
  nutricionista_id?: string
  user_id?: string | null
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
  // Estados para crear usuario
  const [creatingUser, setCreatingUser] = useState(false)
  const [userPassword, setUserPassword] = useState('')
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false)

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
        .map((apt: any) => {
          // Normalizar estado: 'nueva' -> 'pendiente'
          const normalizedStatus = (apt.status === 'nueva' ? 'pendiente' : apt.status) || 'pendiente'
          
          // Generar slot formateado de manera consistente
          let slot = ''
          if (apt.date_time) {
            try {
              const date = new Date(apt.date_time)
              if (!isNaN(date.getTime())) {
                const weekday = date.toLocaleDateString('es-ES', { weekday: 'long' })
                const day = date.getDate()
                const month = date.toLocaleDateString('es-ES', { month: 'long' })
                const year = date.getFullYear()
                const time = date.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)
                const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1)
                slot = `${capitalizedWeekday}, ${day} de ${capitalizedMonth} de ${year} a las ${time}`
              }
            } catch (error) {
              console.error('Error formatting slot:', error)
            }
          }
          
          return {
            id: apt.id,
            name: apt.name || 'Cliente',
            email: apt.email || '',
            phone: apt.phone || undefined,
            slot,
            date_time: apt.date_time || undefined,
            created_at: apt.created_at,
            status: normalizedStatus,
            notes: apt.notes || undefined,
            nutricionista_id: apt.nutricionista_id || undefined,
            user_id: apt.user_id || null,
          } as Appointment
        })

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

    // Buscar por nombre, email, teléfono o fecha
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (apt) =>
          apt.name.toLowerCase().includes(term) ||
          apt.email.toLowerCase().includes(term) ||
          (apt.phone && apt.phone.includes(term)) ||
          (apt.slot && apt.slot.toLowerCase().includes(term))
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

  // Función helper para extraer datos del invitado de las notes
  const extractGuestDataFromNotes = (notes: string | null | undefined): { name: string; email: string; phone?: string } | null => {
    if (!notes) return null
    try {
      const guestDataMatch = notes.match(/--- DATOS DEL INVITADO ---\s*(\{[\s\S]*?\})/)
      if (guestDataMatch) {
        const guestData = JSON.parse(guestDataMatch[1])
        return {
          name: guestData.name || '',
          email: guestData.email || '',
          phone: guestData.phone || undefined,
        }
      }
    } catch (error) {
      console.error('Error parsing guest data from notes:', error)
    }
    return null
  }

  const handleSubmitCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAppointment || !userPassword) {
      showToast('La contraseña es requerida', true)
      return
    }

    setCreatingUser(true)
    try {
      const guestData = extractGuestDataFromNotes(selectedAppointment.notes) || {
        name: selectedAppointment.name,
        email: selectedAppointment.email,
        phone: selectedAppointment.phone,
      }

      // Si la cita está completada, crear el usuario con suscripción activa
      // Si no, crear con suscripción inactiva (por defecto)
      const subscriptionStatus = selectedAppointment.status === 'completada' 
        ? 'active' as const 
        : 'inactive' as const

      const newUser = await createUser({
        name: guestData.name,
        email: guestData.email,
        password: userPassword,
        role: 'suscriptor',
        phone: guestData.phone,
        subscription_status: subscriptionStatus,
      })

      if (!newUser) {
        throw new Error('Error al crear usuario')
      }

      // Asociar la cita con el nuevo usuario
      if (selectedAppointment.id) {
        try {
          await updateAppointment(selectedAppointment.id, { user_id: newUser.id })
        } catch (updateError: any) {
          console.error('Error asociando cita al usuario:', updateError)
          // No fallar si hay error al asociar, el usuario ya fue creado
          showToast('Usuario creado. La cita se asociará automáticamente.', false)
        }
      }

      showToast('Usuario creado y cita asociada correctamente')
      
      // Cerrar el modal
      setIsCreateUserModalOpen(false)
      setUserPassword('')
      setSelectedAppointment(null)
      
      // Recargar citas para reflejar los cambios
      await loadAppointments()
      
      window.dispatchEvent(new Event('zona_azul_subscribers_updated'))
      window.dispatchEvent(new Event('zona_azul_appointments_updated'))
    } catch (err: any) {
      console.error('Error creating user:', err)
      const errorMessage = err.message || err.error || 'Error al crear usuario'
      showToast(errorMessage, true)
    } finally {
      setCreatingUser(false)
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

  const handleChangeStatus = async (appointmentId: string, newStatus: 'pendiente' | 'confirmada' | 'cancelada' | 'completada') => {
    if (!userId) return

    try {
      // Mapear estados del frontend a estados de API
      const apiStatusMap: Record<string, string> = {
        'pendiente': 'pendiente',
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
        showToast(`Cita ${newStatus === 'pendiente' ? 'marcada como pendiente' : newStatus === 'confirmada' ? 'confirmada' : newStatus === 'completada' ? 'marcada como completada' : 'cancelada'} correctamente`)

        // Actualizar selectedAppointment si es el mismo
        if (selectedAppointment?.id === appointmentId) {
          const updatedApt = appointments.find((apt) => apt.id === appointmentId)
          if (updatedApt) {
            setSelectedAppointment({ ...updatedApt, status: newStatus })
          }
        }

        // Si se completó una cita sin usuario, abrir modal de crear usuario
        if (newStatus === 'completada') {
          const currentAppointment = appointments.find(apt => apt.id === appointmentId) || 
            filteredAppointments.find(apt => apt.id === appointmentId)
          if (currentAppointment && !currentAppointment.user_id) {
            setTimeout(() => {
              setSelectedAppointment(currentAppointment)
              setIsCreateUserModalOpen(true)
            }, 500)
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

      {/* Filtros y búsqueda mejorados */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
        <div className="space-y-4">
          {/* Barra de búsqueda */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre, email, teléfono o fecha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition placeholder-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Filtros por estado */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2">Filtrar por:</span>
            {(['todas', 'pendiente', 'confirmada', 'completada', 'cancelada'] as FilterStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  filter === status
                    ? 'bg-primary text-white shadow-md scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'
                }`}
              >
                {status === 'todas' ? 'Todas' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Resultados */}
          {searchTerm && (
            <div className="text-xs text-gray-500">
              Mostrando {filteredAppointments.length} de {appointments.length} citas
            </div>
          )}
        </div>
      </section>

      {/* Lista de citas */}
      <div className="bg-white rounded-lg shadow">
        {filteredAppointments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm
              ? 'No se encontraron citas con ese criterio de búsqueda.'
              : filter !== 'todas'
                ? `No hay citas ${filter === 'pendiente' ? 'pendientes' : filter}.`
                : 'No hay citas registradas aún.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="p-4 hover:bg-gray-50 transition-colors relative"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                  <div 
                    className="flex-1 cursor-pointer min-w-0"
                    onClick={() => handleViewDetail(appointment)}
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{appointment.name}</h3>
                      {!appointment.user_id && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          appointment.status === 'completada' 
                            ? 'bg-red-100 text-red-800 animate-pulse' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {appointment.status === 'completada' ? '⚠️ Sin Usuario (Completada)' : 'Sin Usuario'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{appointment.email}</p>
                    {appointment.phone && (
                      <p className="text-sm text-gray-600">{appointment.phone}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      {formatAppointmentDateTime(appointment.slot, appointment.date_time)}
                    </p>
                  </div>
                  <div 
                    className="flex gap-3 flex-shrink-0 flex-wrap items-center"
                    style={{ 
                      minWidth: '200px',
                      position: 'relative',
                      zIndex: 10
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                    }}
                  >
                    {/* Dropdown de Estado */}
                    <div className="relative" style={{ display: 'block', visibility: 'visible' }}>
                      <select
                        value={appointment.status || 'pendiente'}
                        onChange={(e) => {
                          const newStatus = e.target.value as 'pendiente' | 'confirmada' | 'cancelada' | 'completada'
                          if (newStatus !== appointment.status) {
                            handleChangeStatus(appointment.id, newStatus)
                          }
                        }}
                        className={`appearance-none px-4 py-2 pr-8 rounded-lg border-2 font-medium text-sm cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          appointment.status === 'pendiente' 
                            ? 'bg-yellow-50 border-yellow-300 text-yellow-800 focus:ring-yellow-500'
                            : appointment.status === 'confirmada'
                            ? 'bg-green-50 border-green-300 text-green-800 focus:ring-green-500'
                            : appointment.status === 'cancelada'
                            ? 'bg-red-50 border-red-300 text-red-800 focus:ring-red-500'
                            : 'bg-blue-50 border-blue-300 text-blue-800 focus:ring-blue-500'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                          display: 'block',
                          visibility: 'visible',
                          opacity: 1,
                          position: 'relative',
                          zIndex: 12
                        }}
                      >
                        <option value="pendiente">⏳ Pendiente</option>
                        <option value="confirmada">✓ Confirmada</option>
                        <option value="cancelada">✕ Cancelada</option>
                        <option value="completada">✓ Completada</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none" style={{ zIndex: 13 }}>
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        handleViewDetail(appointment)
                      }}
                      style={{ 
                        position: 'relative',
                        zIndex: 11,
                        minWidth: '80px'
                      }}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shadow-sm flex-shrink-0"
                      title="Ver detalle"
                      aria-label="Ver detalle"
                    >
                      👁️ Ver
                    </button>
                    {!appointment.user_id && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          setSelectedAppointment(appointment)
                          setIsCreateUserModalOpen(true)
                        }}
                        style={{ 
                          position: 'relative',
                          zIndex: 11,
                          minWidth: '120px'
                        }}
                        className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap shadow-sm flex-shrink-0"
                        aria-label="Crear usuario"
                      >
                        👤 Crear Usuario
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Detalle */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedAppointment(null)
        }}
        title="Detalle de la Cita"
        size="md"
      >
        {selectedAppointment && (
          <div className="space-y-6">
            {/* Información del Cliente */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide mb-3">Información del Cliente</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
                  <p className="text-sm text-gray-900 font-medium">{selectedAppointment.name}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                  <p className="text-sm text-gray-900 break-all">{selectedAppointment.email}</p>
                </div>
                {selectedAppointment.phone && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Teléfono</label>
                    <p className="text-sm text-gray-900">{selectedAppointment.phone}</p>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                  <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusColor(selectedAppointment.status || 'pendiente')}`}>
                    {selectedAppointment.status === 'pendiente' && '⏳ Pendiente'}
                    {selectedAppointment.status === 'confirmada' && '✓ Confirmada'}
                    {selectedAppointment.status === 'cancelada' && '✕ Cancelada'}
                    {selectedAppointment.status === 'completada' && '✓ Completada'}
                  </span>
                </div>
                {!selectedAppointment.user_id && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Usuario</label>
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                      ⚠️ Sin usuario asociado
                    </span>
                    {selectedAppointment.status === 'completada' && (
                      <p className="text-xs text-orange-600 mt-1 italic">
                        Se recomienda crear un usuario para esta cita completada
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Información de la Cita */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Información de la Cita</h3>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Fecha y Hora</label>
                <p className="text-sm text-gray-900 font-medium">
                  {formatAppointmentDateTime(selectedAppointment.slot, selectedAppointment.date_time)}
                </p>
              </div>
              {selectedAppointment.created_at && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de Solicitud</label>
                  <p className="text-sm text-gray-900">{formatCreatedDate(selectedAppointment.created_at)}</p>
                </div>
              )}
            </div>

            {/* Notas */}
            {selectedAppointment.notes && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Notas</h3>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {selectedAppointment.notes.replace(/--- DATOS DEL INVITADO ---[\s\S]*/, '').trim() || 'Sin notas adicionales'}
                  </p>
                </div>
              </div>
            )}

            {/* Mensaje informativo */}
            <div className="pt-4 border-t">
              <p className="text-xs text-gray-500 text-center italic">
                Para editar, cambiar el estado o crear un usuario, usa los botones en la lista de citas
              </p>
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

      {/* Modal Crear Usuario */}
      <Modal
        isOpen={isCreateUserModalOpen}
        onClose={() => {
          setIsCreateUserModalOpen(false)
          setUserPassword('')
          setSelectedAppointment(null)
        }}
        title="Crear Usuario desde Cita"
        size="md"
      >
        {selectedAppointment && (
          <form onSubmit={handleSubmitCreateUser} className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide mb-2">Datos del Cliente</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={selectedAppointment.name}
                    disabled
                    autoComplete="name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={selectedAppointment.email}
                    disabled
                    autoComplete="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-600"
                  />
                </div>
                {selectedAppointment.phone && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Teléfono</label>
                    <input
                      type="tel"
                      value={selectedAppointment.phone}
                      disabled
                      autoComplete="tel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-600"
                    />
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ingresa la contraseña para el nuevo usuario"
              />
            </div>
            <div className="flex gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setIsCreateUserModalOpen(false)
                  setUserPassword('')
                  setSelectedAppointment(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={creatingUser}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                disabled={creatingUser || !userPassword}
              >
                {creatingUser ? 'Creando...' : 'Crear Usuario'}
              </button>
            </div>
          </form>
        )}
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

