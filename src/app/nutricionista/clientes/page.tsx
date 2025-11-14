"use client"

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import SearchFilters from '@/components/ui/SearchFilters'
import ToastMessage from '@/components/ui/ToastMessage'
import EmptyState from '@/components/ui/EmptyState'
import ResponsiveGrid from '@/components/ui/ResponsiveGrid'
import { useAuth } from '@/hooks/useAuth'
import * as api from '@/lib/api'
import { getSubscribers } from '@/lib/subscribers'
import { hasPlanAssigned } from '@/lib/planAssignment'

interface Client {
  id: string
  name: string
  plan: string
  progress: string
  lastCheck: string
  notes: string
  email: string
}

// Ya no se generan clientes iniciales automáticamente
// Los clientes se asignan explícitamente desde el admin

export default function NutricionistaClientesPage() {
  const { userId } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [availablePlans, setAvailablePlans] = useState<any[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [noteText, setNoteText] = useState('')
  const [planText, setPlanText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Función para cargar clientes desde la API
  const loadClients = async () => {
    if (!userId) return
    
    try {
      // Obtener clientes asignados desde la API
      const apiClients = await api.getNutricionistaClients(userId)
      
      // Obtener suscriptores desde la API
      const subscribers = await getSubscribers()
      const subscribersMap = new Map(subscribers.map((s) => [s.id, s]))
      
      // Convertir a formato Client
      const validClients: Client[] = apiClients
        .filter((ac: any) => subscribersMap.has(ac.client_id))
        .map((ac: any) => {
          const subscriber = subscribersMap.get(ac.client_id)!
          return {
            id: subscriber.id,
            name: subscriber.name,
            email: subscriber.email,
            plan: '', // Se puede obtener del plan asignado si es necesario
            progress: '0%', // Se puede calcular desde el progreso
            lastCheck: new Date(ac.updated_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
            notes: ac.notes || '',
          }
        })
      
      setClients(validClients)
    } catch (error) {
      console.error('Error loading clients:', error)
      setClients([])
    }
  }

  useEffect(() => {
    if (!userId) return
    
    const loadData = async () => {
      await loadClients()
      // Cargar planes completos sin asignar del nutricionista
      const plans = await api.getMealPlansByNutricionista(userId)
      setAvailablePlans(plans)
    }
    loadData()

    // Polling cada 5 segundos para actualizar desde la API
    const interval = setInterval(async () => {
      await loadClients()
      const plans = await api.getMealPlansByNutricionista(userId)
      setAvailablePlans(plans)
    }, 5000)

    return () => {
      clearInterval(interval)
    }
  }, [userId])

  // Filtrar y buscar clientes
  useEffect(() => {
    let filtered = [...clients]

    // Buscar por nombre, email o plan
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(term) ||
        client.email.toLowerCase().includes(term) ||
        client.plan.toLowerCase().includes(term)
      )
    }

    setFilteredClients(filtered)
  }, [clients, searchTerm])

  const showToast = (message: string, isError = false) => {
    if (isError) {
      setError(message)
      setTimeout(() => setError(null), 5000)
    } else {
      setSuccess(message)
      setTimeout(() => setSuccess(null), 3000)
    }
  }


  const handleAddNote = (client: Client) => {
    setSelectedClient(client)
    setNoteText(client.notes)
    setIsNoteModalOpen(true)
  }

  const handleEditPlan = async (client: Client) => {
    setSelectedClient(client)
    setPlanText(client.plan)
    setSelectedPlanId('')
    // Cargar planes disponibles
    if (userId) {
      const plans = await api.getMealPlansByNutricionista(userId)
      setAvailablePlans(plans)
    }
    setIsPlanModalOpen(true)
  }


  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClient || !userId) return

    try {
      // Actualizar nota en la base de datos
      await api.assignClientToNutricionista(userId, selectedClient.id, noteText)
      
      // Actualizar estado local
      const updated = clients.map((c) =>
        c.id === selectedClient.id
          ? {
              ...c,
              notes: noteText,
              lastCheck: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
            }
          : c
      )
      setClients(updated)
      
      setIsNoteModalOpen(false)
      setSelectedClient(null)
      showToast('Nota actualizada correctamente')
    } catch (error) {
      console.error('Error updating note:', error)
      showToast('Error al actualizar la nota', true)
    }
  }

  const handleSubmitPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClient || !userId) return

    // Si se seleccionó un plan completo, copiarlo al cliente
    if (selectedPlanId) {
      const sourcePlan = availablePlans.find((p) => p.id === selectedPlanId)
      if (sourcePlan) {
        try {
          // Calcular fechas (plan de 5 días: lunes a viernes)
          const startDate = new Date()
          const endDate = new Date()
          endDate.setDate(endDate.getDate() + 4) // 5 días: lunes a viernes
          
          // Copiar el plan completo al cliente
          const copiedPlan = await api.copyPlanToUser(
            selectedPlanId,
            selectedClient.id,
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
          )
          
          if (copiedPlan) {
            // Actualizar estado local
            const updated = clients.map((c) =>
              c.id === selectedClient.id
                ? {
                    ...c,
                    plan: sourcePlan.name || 'Plan asignado',
                    lastCheck: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
                  }
                : c
            )
            setClients(updated)
            showToast(`Plan "${sourcePlan.name}" asignado correctamente al cliente`)
            setIsPlanModalOpen(false)
            setSelectedClient(null)
            setSelectedPlanId('')
            return
          } else {
            showToast('Error al copiar el plan al cliente', true)
            return
          }
        } catch (error) {
          console.error('Error copying plan:', error)
          showToast('Error al asignar el plan', true)
          return
        }
      }
    }

    // Si no se seleccionó plan, solo actualizar el texto (compatibilidad)
    // Nota: Esto solo actualiza el estado local, no guarda en la base de datos
    const updated = clients.map((c) =>
      c.id === selectedClient.id
        ? {
            ...c,
            plan: planText,
            lastCheck: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
          }
        : c
    )

    setClients(updated)
    setIsPlanModalOpen(false)
    setSelectedClient(null)
    setSelectedPlanId('')
    showToast('Plan actualizado correctamente')
  }

  const handleUpdateProgress = (clientId: string, newProgress: string) => {
    // Actualizar solo el estado local (el progreso real se guarda en la tabla progress)
    const updated = clients.map((c) => (c.id === clientId ? { ...c, progress: newProgress } : c))
    setClients(updated)
    showToast('Progreso actualizado')
  }

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
        title="Clientes activos"
        description="Visualiza el estado de cada suscriptor, identifica quién necesita soporte adicional y agrega notas para la app móvil."
      />

      {/* Búsqueda y filtros */}
      {clients.length > 0 && (
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por nombre, email o plan..."
          resultsCount={
            searchTerm
              ? { showing: filteredClients.length, total: clients.length }
              : undefined
          }
        />
      )}

      {/* Estado vacío */}
      {clients.length === 0 && (
        <EmptyState
          title="No hay clientes asignados"
          message="Los clientes se asignan desde el área de administración."
        />
      )}

      {filteredClients.length === 0 && clients.length > 0 && (
        <EmptyState
          title="No se encontraron clientes"
          message="Intenta ajustar la búsqueda."
        />
      )}

      <section className="space-y-3">
        {filteredClients.map((client) => (
          <article key={client.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs uppercase tracking-wider text-gray-400">{client.plan}</p>
                  {hasPlanAssigned(client.id) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Plan activo
                    </span>
                  )}
                </div>
                {client.email && <p className="text-xs text-gray-500 mt-1">{client.email}</p>}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/nutricionista/clientes/${client.id}/ficha-tecnica`}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition font-medium"
                >
                  Ficha Técnica
                </a>
                <input
                  type="text"
                  value={client.progress}
                  onChange={(e) => handleUpdateProgress(client.id, e.target.value)}
                  className="w-20 px-2 py-1 text-xs font-semibold text-primary border border-primary/20 rounded-lg text-center"
                />
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  Progreso
                </span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
              <span>Última revisión: {client.lastCheck}</span>
              <span className="italic text-gray-500">Nota: {client.notes}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => handleAddNote(client)}
                className="rounded-full border border-gray-200 px-3 py-1 font-semibold text-gray-600 hover:border-primary hover:text-primary transition"
              >
                Editar nota
              </button>
              <button
                onClick={() => handleEditPlan(client)}
                className="rounded-full border border-gray-200 px-3 py-1 font-semibold text-gray-600 hover:border-highlight hover:text-highlight transition"
              >
                Cambiar plan
              </button>
            </div>
          </article>
        ))}
      </section>

      {/* Modal Agregar Nota */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        title={`Nota para ${selectedClient?.name}`}
      >
        <form onSubmit={handleSubmitNote} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nota nutricional</label>
            <textarea
              required
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Escribe recomendaciones, observaciones o recordatorios para este cliente..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsNoteModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Guardar nota
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Plan */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => {
          setIsPlanModalOpen(false)
          setSelectedClient(null)
          setSelectedPlanId('')
        }}
        title={`Asignar plan a ${selectedClient?.name || ''}`}
        size="md"
      >
        <form onSubmit={handleSubmitPlan} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecciona un plan completo (con comidas ya asignadas)
            </label>
            {availablePlans.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">
                No hay planes disponibles. Crea planes completos con comidas desde la sección "Planes" en tu dashboard.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availablePlans.map((plan) => {
                  const totalMeals = plan.days?.reduce((sum: number, day: any) => sum + (day.meals?.length || 0), 0) || 0
                  return (
                    <label
                      key={plan.id}
                      className={`block p-3 border rounded-lg cursor-pointer transition ${
                        selectedPlanId === plan.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-primary/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value={plan.id}
                        checked={selectedPlanId === plan.id}
                        onChange={(e) => setSelectedPlanId(e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{plan.name}</p>
                          {plan.description && (
                            <p className="text-xs text-gray-600 mt-1">{plan.description}</p>
                          )}
                          <div className="flex gap-3 mt-2 text-xs text-gray-500">
                            <span>{plan.days?.length || 0} días</span>
                            <span>• {totalMeals} comidas</span>
                            {plan.totalCalories && <span>• {plan.totalCalories} kcal total</span>}
                          </div>
                        </div>
                        {selectedPlanId === plan.id && (
                          <svg className="w-5 h-5 text-primary ml-2" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-gray-500 mb-2">O actualiza solo el nombre del plan (sin asignar plan completo):</p>
            <input
              type="text"
              value={planText}
              onChange={(e) => setPlanText(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              placeholder="Ej: Flexitariano, Pérdida de peso..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setIsPlanModalOpen(false)
                setSelectedClient(null)
                setSelectedPlanId('')
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!selectedPlanId && !planText}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedPlanId ? 'Asignar plan completo' : 'Actualizar nombre'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
