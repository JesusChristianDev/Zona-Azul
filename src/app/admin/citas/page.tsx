"use client"

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import SearchFilters from '@/components/ui/SearchFilters'
import ToastMessage from '@/components/ui/ToastMessage'
import EmptyState from '@/components/ui/EmptyState'
import { getAppointments, updateAppointment, createUser, deleteAppointment } from '@/lib/api'
import { formatAppointmentDateTime, formatCreatedDate } from '@/lib/dateFormatters'

interface Appointment {
  id: string
  name: string
  email: string
  phone?: string
  slot: string
  date_time?: string
  created_at?: string
  status?: 'pendiente' | 'confirmada' | 'cancelada' | 'completada'
  notes?: string
  nutricionista_id?: string
  user_id?: string | null
}

type FilterStatus = 'todas' | 'pendiente' | 'confirmada' | 'cancelada' | 'completada' | 'sin_usuario'
type ModalMode = 'view' | 'edit' | 'createUser' | 'delete'

export default function AdminCitasPage() {
  const { userId } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>('view')
  const [filter, setFilter] = useState<FilterStatus>('todas')
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Estados para edición
  const [editingAppointment, setEditingAppointment] = useState(false)
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editNotes, setEditNotes] = useState('')
  
  // Estados para crear usuario
  const [creatingUser, setCreatingUser] = useState(false)
  const [userPassword, setUserPassword] = useState('')
  
  const [isMounted, setIsMounted] = useState(false)

  // Función helper para formatear slot (reutilizable)
  const formatSlot = (dateTime: string | undefined): string => {
    if (!dateTime) return ''
    try {
      const date = new Date(dateTime)
      if (isNaN(date.getTime())) return ''
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
      return `${capitalizedWeekday}, ${day} de ${capitalizedMonth} de ${year} a las ${time}`
    } catch (error) {
      console.error('Error formatting slot:', error)
      return ''
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

  const showToast = (message: string, isError = false) => {
    if (isError) {
      setError(message)
      setTimeout(() => setError(null), 5000)
    } else {
      setSuccess(message)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const loadAppointments = useCallback(async () => {
    if (!userId) return

    try {
      const apiAppointments = await getAppointments()
      const mappedAppointments = apiAppointments.map((apt: any) => {
        // Normalizar estado: 'nueva' -> 'pendiente'
        const normalizedStatus = (apt.status === 'nueva' ? 'pendiente' : apt.status) || 'pendiente'
        
        return {
          id: apt.id,
          name: apt.name || 'Cliente',
          email: apt.email || '',
          phone: apt.phone || undefined,
          slot: formatSlot(apt.date_time),
          date_time: apt.date_time || undefined,
          created_at: apt.created_at,
          status: normalizedStatus,
          notes: apt.notes || undefined,
          nutricionista_id: apt.nutricionista_id || undefined,
          user_id: apt.user_id || null,
        } as Appointment
      })

      const sorted = mappedAppointments.sort((a: Appointment, b: Appointment) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
        return dateB - dateA
      })

      setAppointments(sorted)
    } catch (error: any) {
      console.error('Error loading appointments:', error)
      showToast('Error al cargar citas', true)
    }
  }, [userId])

  useEffect(() => {
    setIsMounted(true)
    
    if (typeof window !== 'undefined') {
      if ('serviceWorker' in navigator && 'caches' in window) {
        caches.keys().then((cacheNames) => {
          cacheNames.forEach((cacheName) => {
            caches.open(cacheName).then((cache) => {
              cache.delete(window.location.pathname).catch(() => {})
            })
          })
        }).catch(() => {})
      }
    }
  }, [])

  useEffect(() => {
    if (!userId) return
    loadAppointments()
    const interval = setInterval(loadAppointments, 10000)
    return () => clearInterval(interval)
  }, [userId, loadAppointments])

  const filteredAppointments = useMemo(() => {
    let filtered = [...appointments]

    if (filter !== 'todas') {
      if (filter === 'sin_usuario') {
        filtered = filtered.filter(apt => !apt.user_id)
      } else {
        filtered = filtered.filter(apt => apt.status === filter)
      }
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(apt =>
        apt.name.toLowerCase().includes(term) ||
        apt.email.toLowerCase().includes(term) ||
        (apt.phone && apt.phone.includes(term)) ||
        (apt.slot && apt.slot.toLowerCase().includes(term))
      )
    }

    return filtered
  }, [appointments, filter, searchTerm])

  // Abrir modal en modo vista
  const handleOpenModal = (appointment: Appointment, mode: ModalMode = 'view') => {
    setSelectedAppointment(appointment)
    setModalMode(mode)
    setIsModalOpen(true)
    
    // Si es modo edición, preparar los campos
    if (mode === 'edit' && appointment.date_time) {
      const dateTime = new Date(appointment.date_time)
      setEditDate(dateTime.toISOString().split('T')[0])
      setEditTime(dateTime.toTimeString().slice(0, 5))
      setEditNotes(appointment.notes || '')
    } else if (mode === 'edit' && appointment.slot) {
      try {
        // Usar date_time si está disponible, si no intentar parsear slot
        const dateTimeStr = appointment.date_time || appointment.slot
        if (dateTimeStr) {
          const dateTime = new Date(dateTimeStr)
          if (!isNaN(dateTime.getTime())) {
            setEditDate(dateTime.toISOString().split('T')[0])
            setEditTime(dateTime.toTimeString().slice(0, 5))
          } else {
            setEditDate('')
            setEditTime('')
          }
        } else {
          setEditDate('')
          setEditTime('')
        }
      } catch {
        setEditDate('')
        setEditTime('')
      }
      setEditNotes(appointment.notes || '')
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedAppointment(null)
    setModalMode('view')
    setEditDate('')
    setEditTime('')
    setEditNotes('')
    setUserPassword('')
  }

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAppointment || !editDate || !editTime) {
      showToast('Fecha y hora son requeridas', true)
      return
    }

    setEditingAppointment(true)
    try {
      const dateTime = new Date(`${editDate}T${editTime}`).toISOString()
      const updated = await updateAppointment(selectedAppointment.id, {
        date_time: dateTime,
        notes: editNotes || undefined,
      })

      if (updated) {
        showToast('Cita actualizada correctamente')
        await loadAppointments()
        setModalMode('view')
        // Actualizar el appointment seleccionado
        const updatedAppointment = appointments.find(a => a.id === selectedAppointment.id)
        if (updatedAppointment) {
          setSelectedAppointment({
            ...updatedAppointment,
            date_time: dateTime,
            notes: editNotes || undefined,
            slot: formatSlot(dateTime)
          })
        }
        window.dispatchEvent(new Event('zona_azul_appointments_updated'))
      } else {
        showToast('Error al actualizar la cita', true)
      }
    } catch (err: any) {
      console.error('Error updating appointment:', err)
      showToast(err.message || 'Error al actualizar la cita', true)
    } finally {
      setEditingAppointment(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedAppointment) return

    try {
      const deleted = await deleteAppointment(selectedAppointment.id)
      if (deleted) {
        showToast('Cita eliminada correctamente')
        handleCloseModal()
        await loadAppointments()
        window.dispatchEvent(new Event('zona_azul_appointments_updated'))
      } else {
        showToast('Error al eliminar la cita', true)
      }
    } catch (err: any) {
      console.error('Error deleting appointment:', err)
      showToast(err.message || 'Error al eliminar la cita', true)
    }
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
      
      // Cerrar el modal completamente
      handleCloseModal()
      
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
      setUserPassword('')
    }
  }

  const handleChangeStatus = async (appointmentId: string, newStatus: 'pendiente' | 'confirmada' | 'cancelada' | 'completada') => {
    try {
      const currentAppointment = appointments.find(apt => apt.id === appointmentId) || 
        filteredAppointments.find(apt => apt.id === appointmentId)
      
      const updated = await updateAppointment(appointmentId, { status: newStatus })
      if (updated) {
        await loadAppointments()
        
        // Actualizar el appointment seleccionado si es el mismo
        if (selectedAppointment && selectedAppointment.id === appointmentId) {
          const updatedAppointment = appointments.find(a => a.id === appointmentId)
          if (updatedAppointment) {
            setSelectedAppointment(updatedAppointment)
          }
        }
        
        showToast(`Cita ${newStatus === 'confirmada' ? 'confirmada' : newStatus === 'completada' ? 'marcada como completada' : 'cancelada'} correctamente`)
        
        if (newStatus === 'completada' && currentAppointment && !currentAppointment.user_id) {
          setTimeout(() => {
            setModalMode('createUser')
          }, 500)
        }
      } else {
        showToast('Error al actualizar la cita', true)
      }
    } catch (error: any) {
      console.error('Error updating appointment:', error)
      showToast(error.message || 'Error al actualizar la cita', true)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'confirmada':
        return 'bg-green-100 text-green-800'
      case 'cancelada':
        return 'bg-red-100 text-red-800'
      case 'completada':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getModalTitle = () => {
    switch (modalMode) {
      case 'edit':
        return 'Editar Cita'
      case 'createUser':
        return 'Crear Usuario desde Cita'
      case 'delete':
        return 'Confirmar Eliminación'
      default:
        return 'Detalles de la Cita'
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <PageHeader
        title="Gestión de Citas"
        description="Administra todas las citas del sistema"
      />

      {/* Filtros y búsqueda */}
      <SearchFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por nombre, email, teléfono o fecha..."
        filters={
          <div className="col-span-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por estado:</label>
            <div className="flex flex-wrap items-center gap-2">
              {(['todas', 'pendiente', 'confirmada', 'cancelada', 'completada', 'sin_usuario'] as FilterStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                    filter === status
                      ? 'bg-primary text-white shadow-md scale-105'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'
                  }`}
                >
                  {status === 'todas' ? 'Todas' : status === 'sin_usuario' ? 'Sin Usuario' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        }
        resultsCount={
          searchTerm || filter !== 'todas'
            ? { showing: filteredAppointments.length, total: appointments.length }
            : undefined
        }
      />

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

      {/* Lista de citas */}
      {filteredAppointments.length === 0 ? (
        <EmptyState
          title={isMounted ? 'No hay citas que coincidan con los filtros' : 'Cargando citas...'}
          message={isMounted ? 'Intenta ajustar los filtros o la búsqueda.' : 'Por favor espera...'}
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="p-4 hover:bg-gray-50 transition-colors relative"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                  <div 
                    className="flex-1 cursor-pointer min-w-0"
                    onClick={() => handleOpenModal(appointment, 'view')}
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
                    {isMounted && (
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
                    )}
                    {!isMounted && (
                      <div className="px-4 py-2 rounded-lg border-2 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        Cargando...
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        handleOpenModal(appointment, 'edit')
                      }}
                      style={{ 
                        position: 'relative',
                        zIndex: 11,
                        minWidth: '80px'
                      }}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shadow-sm flex-shrink-0"
                      title="Editar cita"
                      aria-label="Editar cita"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        handleOpenModal(appointment, 'delete')
                      }}
                      style={{ 
                        position: 'relative',
                        zIndex: 11,
                        minWidth: '80px'
                      }}
                      className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap shadow-sm flex-shrink-0"
                      title="Eliminar cita"
                      aria-label="Eliminar cita"
                    >
                      🗑️ Eliminar
                    </button>
                    {!appointment.user_id && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          handleOpenModal(appointment, 'createUser')
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
        </div>
      )}

      {/* Modal Unificado */}
      {isModalOpen && selectedAppointment && (
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={getModalTitle()}
          size={modalMode === 'edit' || modalMode === 'createUser' ? 'lg' : 'md'}
        >
          {/* Modo Vista - Solo Detalles */}
          {modalMode === 'view' && (
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
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusBadgeColor(selectedAppointment.status || 'pendiente')}`}>
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
                <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide mb-3">Información de la Cita</h3>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fecha y Hora</label>
                  <p className="text-sm text-gray-900 font-medium">
                    {formatAppointmentDateTime(selectedAppointment.slot, selectedAppointment.date_time)}
                  </p>
                </div>
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
                    <div className="space-y-3">
                      {motivo && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Motivo de la Cita</label>
                          <div className="text-sm text-gray-900 whitespace-pre-wrap bg-blue-50 p-3 rounded-lg border border-blue-200">
                            {motivo}
                          </div>
                        </div>
                      )}
                      
                      {guestData && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Datos del Solicitante</label>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
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
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Notas</label>
                          <div className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-200">
                            {notes}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
                {selectedAppointment.created_at && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de Creación</label>
                    <p className="text-sm text-gray-900">{formatCreatedDate(selectedAppointment.created_at)}</p>
                  </div>
                )}
              </div>

              {/* Mensaje informativo */}
              <div className="pt-4 border-t">
                <p className="text-xs text-gray-500 text-center italic">
                  Para editar, eliminar o cambiar el estado, usa los botones en la lista de citas
                </p>
              </div>
            </div>
          )}

          {/* Modo Edición */}
          {modalMode === 'edit' && (
            <form onSubmit={handleSubmitEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Notas adicionales sobre la cita..."
                />
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setModalMode('view')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={editingAppointment}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  disabled={editingAppointment || !editDate || !editTime}
                >
                  {editingAppointment ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          )}

          {/* Modo Crear Usuario */}
          {modalMode === 'createUser' && (
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
                  onClick={() => setModalMode('view')}
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

          {/* Modo Eliminar */}
          {modalMode === 'delete' && (
            <div className="space-y-4">
              <p className="text-gray-700">
                ¿Estás seguro de que deseas eliminar la cita de <strong>{selectedAppointment.name}</strong>?
              </p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Fecha:</strong> {selectedAppointment.slot}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Email:</strong> {selectedAppointment.email}
                </p>
              </div>
              <p className="text-sm text-red-600 font-medium">
                Esta acción no se puede deshacer. Si la cita tiene un evento en Google Calendar, también se eliminará.
              </p>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setModalMode('view')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Eliminar Cita
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
