"use client"

import { useState, useEffect } from 'react'
import Modal from '../../../components/ui/Modal'
import { useAuth } from '../../../hooks/useAuth'
import { getUserData, setUserData } from '../../../lib/storage'
import { getSubscribers } from '../../../lib/subscribers'
import { assignPlanToSubscriber, getAllAvailableTemplates, PlanTemplate, hasPlanAssigned } from '../../../lib/planAssignment'

interface Client {
  id: string
  name: string
  plan: string
  progress: string
  lastCheck: string
  notes: string
  email: string
}

// Generar clientes iniciales basados en suscriptores reales
function generateInitialClients(): Client[] {
  const subscribers = getSubscribers()
  const plans = ['Flexitariano', 'Pérdida de peso', 'Ganancia de masa', 'Plan Energía']
  const progressValues = ['85%', '62%', '78%', '90%']
  const notes = [
    'Aumentar ingesta de omega 3',
    'Registrar hidratación diaria',
    'Refuerzo de proteína post entreno',
    'Mantener ritmo actual',
  ]

  return subscribers.map((subscriber, index) => ({
    id: subscriber.id,
    name: subscriber.name,
    plan: plans[index % plans.length] || 'Plan Personalizado',
    progress: progressValues[index % progressValues.length] || '75%',
    lastCheck: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    notes: notes[index % notes.length] || 'Seguimiento regular',
    email: subscriber.email,
  }))
}

const initialClients = generateInitialClients()

export default function NutricionistaClientesPage() {
  const { userId } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [availableTemplates, setAvailableTemplates] = useState<PlanTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [noteText, setNoteText] = useState('')
  const [planText, setPlanText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Función para cargar clientes
  const loadClients = () => {
    if (!userId) return
    
    const stored = getUserData<Client[]>('zona_azul_clients', userId)
    const subscribers = getSubscribers()
    const validSubscriberIds = new Set(subscribers.map((s) => s.id))
    
    if (stored) {
      // Solo mostrar clientes que tienen suscriptores válidos
      // NO asignar automáticamente nuevos suscriptores
      const validClients = stored.filter((c) => validSubscriberIds.has(c.id))
      setClients(validClients)
      // Actualizar solo si hay cambios (eliminar clientes de suscriptores que ya no existen)
      if (validClients.length !== stored.length) {
        setUserData('zona_azul_clients', validClients, userId)
      }
    } else {
      // Si no hay clientes asignados, empezar con lista vacía
      // Los clientes se asignan explícitamente desde el admin o cuando el nutricionista los agrega
      setClients([])
    }
  }

  useEffect(() => {
    if (!userId) return
    
    loadClients()
    setAvailableTemplates(getAllAvailableTemplates())

    // Escuchar cambios en localStorage para actualizar en tiempo real (otras pestañas)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('zona_azul_clients_user_')) {
        loadClients()
      }
      if (e.key?.startsWith('zona_azul_plans_user_')) {
        setAvailableTemplates(getAllAvailableTemplates())
      }
    }

    // Escuchar cambios locales (misma pestaña)
    const handleCustomClientsChange = () => {
      loadClients()
    }
    const handlePlansUpdate = () => {
      setAvailableTemplates(getAllAvailableTemplates())
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('zona_azul_clients_updated', handleCustomClientsChange)
    window.addEventListener('zona_azul_subscribers_updated', loadClients) // Escuchar nuevos suscriptores
    window.addEventListener('zona_azul_plans_updated', handlePlansUpdate)

    // Polling cada 2 segundos para detectar cambios (fallback)
    const interval = setInterval(() => {
      loadClients()
      setAvailableTemplates(getAllAvailableTemplates())
    }, 2000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('zona_azul_clients_updated', handleCustomClientsChange)
      window.removeEventListener('zona_azul_subscribers_updated', loadClients)
      window.removeEventListener('zona_azul_plans_updated', handlePlansUpdate)
      clearInterval(interval)
    }
  }, [userId])

  const showToast = (message: string, isError = false) => {
    if (isError) {
      setError(message)
      setTimeout(() => setError(null), 5000)
    } else {
      setSuccess(message)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  // Notificar a otras pestañas/componentes que los clientes fueron actualizados
  const notifyClientsUpdate = () => {
    window.dispatchEvent(new Event('zona_azul_clients_updated'))
  }

  const handleAddNote = (client: Client) => {
    setSelectedClient(client)
    setNoteText(client.notes)
    setIsNoteModalOpen(true)
  }

  const handleEditPlan = (client: Client) => {
    setSelectedClient(client)
    setPlanText(client.plan)
    // Si ya tiene un plan asignado, intentar seleccionarlo
    const currentPlan = hasPlanAssigned(client.id)
    setSelectedTemplate('')
    setIsPlanModalOpen(true)
  }

  const handleSubmitNote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClient) return

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
    if (userId) {
      setUserData('zona_azul_clients', updated, userId)
      notifyClientsUpdate()
    }
    setIsNoteModalOpen(false)
    setSelectedClient(null)
    showToast('Nota actualizada correctamente')
  }

  const handleSubmitPlan = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClient) return

    // Si se seleccionó un template, asignar el plan real
    if (selectedTemplate) {
      const template = availableTemplates.find((t) => t.id === selectedTemplate)
      if (template) {
        const success = assignPlanToSubscriber(selectedClient.id, template, userId || 'Nutricionista')
        if (success) {
          // Actualizar también el nombre del plan en la lista de clientes
          const updated = clients.map((c) =>
            c.id === selectedClient.id
              ? {
                  ...c,
                  plan: template.name,
                  lastCheck: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
                }
              : c
          )
          setClients(updated)
          if (userId) {
            setUserData('zona_azul_clients', updated, userId)
            notifyClientsUpdate()
          }
          showToast(`Plan "${template.name}" asignado correctamente a ${selectedClient.name}`)
          setIsPlanModalOpen(false)
          setSelectedClient(null)
          setSelectedTemplate('')
          return
        } else {
          showToast('Error al asignar el plan', true)
          return
        }
      }
    }

    // Si no se seleccionó template, solo actualizar el texto (compatibilidad)
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
    if (userId) {
      setUserData('zona_azul_clients', updated, userId)
      notifyClientsUpdate()
    }
    setIsPlanModalOpen(false)
    setSelectedClient(null)
    setSelectedTemplate('')
    showToast('Plan actualizado correctamente')
  }

  const handleUpdateProgress = (clientId: string, newProgress: string) => {
    const updated = clients.map((c) => (c.id === clientId ? { ...c, progress: newProgress } : c))
    setClients(updated)
    if (userId) {
      setUserData('zona_azul_clients', updated, userId)
      notifyClientsUpdate()
    }
    showToast('Progreso actualizado')
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-700 text-sm">
          {success}
        </div>
      )}

      <header className="rounded-2xl border border-primary/20 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">Clientes activos</h2>
        <p className="mt-2 text-sm text-gray-600">
          Visualiza el estado de cada suscriptor, identifica quién necesita soporte adicional y agrega notas
          para la app móvil.
        </p>
      </header>

      <section className="space-y-3">
        {clients.map((client) => (
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
          setSelectedTemplate('')
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
              Selecciona un plan nutricional
            </label>
            {availableTemplates.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">
                No hay planes disponibles. Crea planes desde la sección "Planes" en tu dashboard.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableTemplates.map((template) => (
                  <label
                    key={template.id}
                    className={`block p-3 border rounded-lg cursor-pointer transition ${
                      selectedTemplate === template.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-primary/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="template"
                      value={template.id}
                      checked={selectedTemplate === template.id}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{template.name}</p>
                        <p className="text-xs text-gray-600 mt-1">{template.focus}</p>
                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                          <span>Duración: {template.duration}</span>
                          {template.calories && <span>• {template.calories} kcal/día</span>}
                        </div>
                        {template.description && (
                          <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                        )}
                      </div>
                      {selectedTemplate === template.id && (
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
                ))}
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
                setSelectedTemplate('')
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!selectedTemplate && !planText}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedTemplate ? 'Asignar plan completo' : 'Actualizar nombre'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
