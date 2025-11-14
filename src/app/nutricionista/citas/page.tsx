"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import SearchFilters from '@/components/ui/SearchFilters'
import ActionButton from '@/components/ui/ActionButton'
import ToastMessage from '@/components/ui/ToastMessage'
import EmptyState from '@/components/ui/EmptyState'
import { NotificationHelpers } from '@/lib/notifications'
import { getAppointments, updateAppointment, createUser, getCalendarAuthUrl, getNutritionistSchedule, updateNutritionistSchedule } from '@/lib/api'
import { formatAppointmentDateTime, formatCreatedDate } from '@/lib/dateFormatters'

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
  // Estados para crear usuario (unificado con admin)
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'suscriptor' as const,
    phone: '',
  })

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
    setError(null)

    if (!formData.name || !formData.email || !formData.password) {
      setError('Por favor completa todos los campos requeridos')
      showToast('Por favor completa todos los campos requeridos', true)
      return
    }

    if (!selectedAppointment) {
      setError('No hay cita seleccionada')
      showToast('No hay cita seleccionada', true)
      return
    }

    try {
      // Si la cita está completada, crear el usuario con suscripción activa
      // Si no, crear con suscripción inactiva (por defecto)
      const subscriptionStatus = selectedAppointment.status === 'completada' 
        ? 'active' as const 
        : 'inactive' as const

      const newUser = await createUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'suscriptor',
        phone: formData.phone || undefined,
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

      // Limpiar formulario
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'suscriptor',
        phone: '',
      })
      
      // Cerrar el modal
      setIsCreateUserModalOpen(false)
      setSelectedAppointment(null)
      
      // Recargar citas para reflejar los cambios
      await loadAppointments()
      
      // Notificar actualizaciones
      window.dispatchEvent(new Event('zona_azul_subscribers_updated'))
      window.dispatchEvent(new Event('zona_azul_appointments_updated'))
      
      showToast('Usuario creado y cita asociada correctamente')
    } catch (err: any) {
      console.error('Error creating user:', err)
      const errorMessage = err.message || err.error || 'Error al crear usuario'
      setError(errorMessage)
      showToast(errorMessage, true)
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
              const guestData = extractGuestDataFromNotes(currentAppointment.notes) || {
                name: currentAppointment.name,
                email: currentAppointment.email,
                phone: currentAppointment.phone,
              }
              setSelectedAppointment(currentAppointment)
              setFormData({
                name: guestData.name || '',
                email: guestData.email || '',
                password: '',
                role: 'suscriptor',
                phone: guestData.phone || '',
              })
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

  const scheduleIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )

  const calendarIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mensajes */}
      {error && (
        <ToastMessage
          message={error}
          type="error"
          onClose={() => setError(null)}
        />
      )}
      {success && (
        <ToastMessage
          message={success}
          type="success"
          onClose={() => setSuccess(null)}
        />
      )}

      {/* Header */}
      <PageHeader
        title="Gestión de citas"
        description="Administra tus citas nutricionales. Confirma, programa y realiza seguimiento de tus consultas."
        action={
          !checkingCalendar && (
            <div className="flex items-center gap-3 flex-wrap">
              <ActionButton
                onClick={() => setIsScheduleModalOpen(true)}
                icon={scheduleIcon}
                variant="secondary"
              >
                Configurar Horarios
              </ActionButton>
              {calendarConnected ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Calendario conectado</span>
                </div>
              ) : (
                <ActionButton
                  onClick={handleConnectCalendar}
                  icon={calendarIcon}
                >
                  Conectar Google Calendar
                </ActionButton>
              )}
            </div>
          )
        }
      />

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
      <SearchFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por nombre, email, teléfono o fecha..."
        filters={
          <div className="col-span-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por estado:</label>
            <div className="flex gap-2 flex-wrap">
              {(['todas', 'pendiente', 'confirmada', 'cancelada', 'completada'] as FilterStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === status
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'todas' ? 'Todas' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        }
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

                    {/* Botón Crear Usuario - Siempre visible para que el nutricionista pueda crear el usuario en la primera consulta */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        const guestData = extractGuestDataFromNotes(appointment.notes) || {
                          name: appointment.name,
                          email: appointment.email,
                          phone: appointment.phone,
                        }
                        setSelectedAppointment(appointment)
                        setFormData({
                          name: guestData.name || '',
                          email: guestData.email || '',
                          password: '',
                          role: 'suscriptor',
                          phone: guestData.phone || '',
                        })
                        setIsCreateUserModalOpen(true)
                      }}
                      style={{ 
                        position: 'relative',
                        zIndex: 11,
                        minWidth: '120px'
                      }}
                      className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap shadow-sm flex-shrink-0 ${
                        appointment.user_id 
                          ? 'bg-gray-400 hover:bg-gray-500 cursor-not-allowed' 
                          : 'bg-primary hover:bg-primary/90'
                      }`}
                      aria-label={appointment.user_id ? "Usuario ya creado" : "Crear usuario"}
                      disabled={!!appointment.user_id}
                      title={appointment.user_id ? "Este cliente ya tiene usuario creado" : "Crear usuario para iniciar ficha técnica"}
                    >
                      {appointment.user_id ? '✓ Usuario Creado' : '👤 Crear Usuario'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                {!selectedAppointment.user_id ? (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Usuario</label>
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                      ⚠️ Sin usuario asociado
                    </span>
                    <p className="text-xs text-gray-500 mt-2">
                      Usa el botón "Crear Usuario" en la lista para iniciar la ficha técnica
                    </p>
                  </div>
                ) : (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Usuario</label>
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      ✓ Usuario creado
                    </span>
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

            {/* Notas y Motivo de la Cita */}
            {selectedAppointment.notes && (() => {
              const notes = selectedAppointment.notes
              const motivoMatch = notes.match(/--- MOTIVO DE LA CITA ---\s*([\s\S]*?)(?=\n\n--- DATOS DEL INVITADO ---|$)/)
              const guestDataMatch = notes.match(/--- DATOS DEL INVITADO ---\s*(\{[\s\S]*?\})/)
              
              let guestData = null
              if (guestDataMatch) {
                try {
                  guestData = JSON.parse(guestDataMatch[1])
                } catch (e) {
                  console.error('Error parsing guest data:', e)
                }
              }
              
              const motivo = motivoMatch ? motivoMatch[1].trim() : null
              
              return (
                <div className="space-y-4">
                  {motivo && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Motivo de la Cita</h3>
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{motivo}</p>
                      </div>
                    </div>
                  )}
                  
                  {guestData && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Datos del Solicitante</h3>
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-2">
                        <div>
                          <span className="text-xs font-medium text-gray-500">Nombre:</span>
                          <p className="text-sm text-gray-900 font-medium">{guestData.name}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500">Email:</span>
                          <p className="text-sm text-gray-900">{guestData.email}</p>
                        </div>
                        {guestData.phone && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">Teléfono:</span>
                            <p className="text-sm text-gray-900">{guestData.phone}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {!motivo && !guestData && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Notas</h3>
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Botón cerrar */}
            <div className="pt-4 border-t">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cerrar
              </button>
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

      {/* Modal Crear Usuario (Unificado con admin) */}
      <Modal
        isOpen={isCreateUserModalOpen}
        onClose={() => {
          setIsCreateUserModalOpen(false)
          setFormData({
            name: '',
            email: '',
            password: '',
            role: 'suscriptor',
            phone: '',
          })
          setSelectedAppointment(null)
          setError(null)
        }}
        title="Crear Usuario - Iniciar Ficha Técnica"
        size="md"
      >
        <form onSubmit={handleSubmitCreateUser} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">{error}</div>
          )}
          
          {selectedAppointment && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-4">
              <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide mb-2">Datos de la Cita</h3>
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
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre completo</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ej: María García"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="usuario@zonaazul.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono (opcional)</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="+34 600 000 000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña <span className="text-red-500">*</span></label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
            <input
              type="text"
              value="Suscriptor"
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              Los usuarios creados desde citas siempre son suscriptores
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsCreateUserModalOpen(false)
                setFormData({
                  name: '',
                  email: '',
                  password: '',
                  role: 'suscriptor',
                  phone: '',
                })
                setSelectedAppointment(null)
                setError(null)
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Crear usuario
            </button>
          </div>
        </form>
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

