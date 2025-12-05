"use client"

import { useState, useEffect, useRef } from 'react'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import SearchFilters from '@/components/ui/SearchFilters'
import ToastMessage from '@/components/ui/ToastMessage'
import EmptyState from '@/components/ui/EmptyState'
import ResponsiveGrid from '@/components/ui/ResponsiveGrid'
import { useAuth } from '@/hooks/useAuth'
import * as api from '@/lib/api'
import { getSubscribers } from '@/lib/subscribers'
import type { DatabaseFichaTecnica } from '@/lib/db'

function getNextMonday(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 1 ? 0 : (8 - day) % 7
  today.setDate(today.getDate() + diff)
  return today.toISOString().split('T')[0]
}

function mapActividadToTrabajo(nivel: string) {
  switch (nivel) {
    case 'sedentario':
    case 'ligero':
      return 'sedentario'
    case 'moderado':
      return 'moderado'
    case 'intenso':
    case 'atleta':
      return 'intenso'
    default:
      return 'sedentario'
  }
}

function getDistributionValue(ficha: DatabaseFichaTecnica | null, meal: 'lunch' | 'dinner') {
  const fallback = meal === 'lunch' ? 0.55 : 0.45
  if (!ficha?.distribucion_calorias) return fallback
  try {
    const raw = typeof ficha.distribucion_calorias === 'string'
      ? JSON.parse(ficha.distribucion_calorias)
      : ficha.distribucion_calorias
    const key = meal === 'lunch' ? 'lunch' : 'dinner'
    const legacyKey = meal === 'lunch' ? 'comida' : 'cena'
    const value = raw?.[key] ?? raw?.[legacyKey]
    return typeof value === 'number' ? value : fallback
  } catch (error) {
    console.warn('No se pudo interpretar la distribución de calorías', error)
    return fallback
  }
}

interface PlanBaseOption {
  id: string
  nombre: string
  objetivo?: string | null
  calorias_base?: number | null
}

interface Client {
  id: string
  name: string
  plan: string
  planWeekStart?: string | null
  planWeekEnd?: string | null
  planBaseId?: string | null
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
  const [isFichaModalOpen, setIsFichaModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [planBases, setPlanBases] = useState<PlanBaseOption[]>([])
  const [planBasesLoading, setPlanBasesLoading] = useState(true)
  const [planForm, setPlanForm] = useState({
    planBaseId: '',
    weekStartDate: getNextMonday(),
  })
  const [planSubmitting, setPlanSubmitting] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [fichaForm, setFichaForm] = useState({
    sexo: 'hombre',
    edad: '',
    peso_kg: '',
    altura_cm: '',
    objetivo: 'mantener',
    trabajo: 'sedentario',
    nivel_actividad: 'moderado',
    puesto_trabajo: '',
    intensidad_trabajo: 'moderada',
    comidas_por_dia: '2',
    entrenamientos_semanales: '',
    nivel_entrenamiento: 'principiante',
    preferencias: '',
    patologias: '',
    densidad_osea: '',
    masa_magra: '',
    masa_grasa: '',
    fecha_revision: '',
    observaciones: '',
  })
  const [fichaMetrics, setFichaMetrics] = useState<DatabaseFichaTecnica | null>(null)
  const [fichaLoading, setFichaLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const pendingPlanOverrides = useRef<Record<string, string>>({})

  // Función para cargar clientes desde la API
  const planRangeFormatter = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' })

  const formatPlanLabel = (planData: any) => {
    if (!planData?.plan_base?.nombre) return 'Plan no generado'
    const start = planData.week_start_date ? planRangeFormatter.format(new Date(planData.week_start_date)) : ''
    const end = planData.week_end_date ? planRangeFormatter.format(new Date(planData.week_end_date)) : ''
    const range = start && end ? `${start} · ${end}` : start || end
    return range ? `${planData.plan_base.nombre} · ${range}` : planData.plan_base.nombre
  }

  const loadClients = async () => {
    if (!userId) return

    try {
      const apiClients = await api.getNutricionistaClients(userId)
      const subscribers = await getSubscribers()
      const subscribersMap = new Map(subscribers.map((s) => [s.id, s]))

      const validClients: Client[] = apiClients
        .filter((ac: any) => subscribersMap.has(ac.client_id))
        .map((ac: any) => {
          const subscriber = subscribersMap.get(ac.client_id)!
          return {
            id: subscriber.id,
            name: subscriber.name,
            email: subscriber.email,
            plan: 'Cargando...',
            planWeekStart: null,
            planWeekEnd: null,
            planBaseId: null,
            progress: '0%',
            lastCheck: new Date(ac.updated_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
            notes: ac.notes || '',
          }
        })

      const clientsWithPlan = await Promise.all(
        validClients.map(async (client) => {
          const overrideWeek = pendingPlanOverrides.current[client.id]
          try {
            let latestPlan = null

            if (overrideWeek) {
              try {
                latestPlan = await api.getWeeklyPlan({
                  user_id: client.id,
                  week_start: overrideWeek,
                  include_meals: false,
                })
              } catch (overrideError) {
                console.warn('No se pudo obtener el plan solicitado para la semana', overrideError)
              }

              if (latestPlan) {
                delete pendingPlanOverrides.current[client.id]
              }
            }

            if (!latestPlan) {
              latestPlan = await api.getWeeklyPlan({ user_id: client.id, include_meals: false })
            }

            return {
              ...client,
              plan: latestPlan ? formatPlanLabel(latestPlan) : 'Plan no generado',
              planWeekStart: latestPlan?.week_start_date ?? client.planWeekStart ?? null,
              planWeekEnd: latestPlan?.week_end_date ?? client.planWeekEnd ?? null,
              planBaseId: latestPlan?.plan_base?.id ?? client.planBaseId ?? null,
            }
          } catch (planError) {
            console.warn('No se pudo obtener el plan del cliente', planError)
            return {
              ...client,
              plan: 'Plan no generado',
              planWeekStart: client.planWeekStart ?? null,
              planWeekEnd: client.planWeekEnd ?? null,
              planBaseId: client.planBaseId ?? null,
            }
          }
        })
      )

      setClients(clientsWithPlan)
    } catch (error) {
      console.error('Error loading clients:', error)
      setClients([])
    }
  }

  const loadPlanBases = async () => {
    try {
      setPlanBasesLoading(true)
      const planes = await api.getPlanBases()
      setPlanBases(planes)
      setPlanForm((prev) => ({
        ...prev,
        planBaseId: prev.planBaseId || planes[0]?.id || '',
      }))
    } catch (error) {
      console.error('Error loading plan bases:', error)
      setPlanBases([])
    } finally {
      setPlanBasesLoading(false)
    }
  }

  useEffect(() => {
    if (!userId) return

    const loadData = async () => {
      await loadClients()
    }
    loadData()

    // Polling cada 5 segundos para actualizar desde la API
    const interval = setInterval(async () => {
      await loadClients()
    }, 5000)

    return () => {
      clearInterval(interval)
    }
  }, [userId])

  useEffect(() => {
    loadPlanBases()
  }, [])

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

  const handleEditPlan = (client: Client) => {
    if (!planBases.length) {
      showToast('Primero crea un plan base en la sección Planes', true)
      return
    }
    setSelectedClient(client)
    setPlanForm({
      planBaseId: client.planBaseId || planBases[0]?.id || '',
      weekStartDate: client.planWeekStart || getNextMonday(),
    })
    setIsPlanModalOpen(true)
  }

  const handleEditFicha = async (client: Client) => {
    setSelectedClient(client)
    setFichaLoading(true)
    setIsFichaModalOpen(true)
    try {
      const ficha = await api.getFichaTecnica(client.id)
      const actividad = ficha?.nivel_actividad || ficha?.trabajo || 'moderado'
      setFichaForm({
        sexo: ficha?.sexo || 'hombre',
        edad: ficha?.edad?.toString() || '',
        peso_kg: ficha?.peso_kg?.toString() || '',
        altura_cm: ficha?.altura_cm?.toString() || '',
        objetivo: ficha?.objetivo || 'mantener',
        trabajo: ficha?.trabajo || mapActividadToTrabajo(actividad),
        nivel_actividad: actividad,
        puesto_trabajo: ficha?.puesto_trabajo || '',
        intensidad_trabajo: ficha?.intensidad_trabajo || 'moderada',
        comidas_por_dia: ficha?.comidas_por_dia?.toString() || '2',
        entrenamientos_semanales: ficha?.entrenamientos_semanales?.toString() || '',
        nivel_entrenamiento: ficha?.nivel_entrenamiento || 'principiante',
        preferencias: ficha?.preferencias || '',
        patologias: ficha?.patologias || '',
        densidad_osea: ficha?.densidad_osea?.toString() || '',
        masa_magra: ficha?.masa_magra?.toString() || '',
        masa_grasa: ficha?.masa_grasa?.toString() || '',
        fecha_revision: ficha?.fecha_revision || '',
        observaciones: ficha?.observaciones || '',
      })
      setFichaMetrics(ficha)
    } catch (error) {
      console.error('Error loading ficha tecnica:', error)
      showToast('No se pudo cargar la ficha técnica', true)
      setIsFichaModalOpen(false)
      setFichaMetrics(null)
    } finally {
      setFichaLoading(false)
    }
  }

  const handleSubmitFicha = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClient) return
    setFichaLoading(true)
    try {
      const nivelActividad = fichaForm.nivel_actividad || fichaForm.trabajo || 'moderado'
      const savedFicha = await api.saveFichaTecnica(selectedClient.id, {
        ...fichaForm,
        trabajo: mapActividadToTrabajo(nivelActividad),
        nivel_actividad: nivelActividad,
        edad: fichaForm.edad ? Number(fichaForm.edad) : null,
        peso_kg: fichaForm.peso_kg ? Number(fichaForm.peso_kg) : null,
        altura_cm: fichaForm.altura_cm ? Number(fichaForm.altura_cm) : null,
        entrenamientos_semanales: fichaForm.entrenamientos_semanales
          ? Number(fichaForm.entrenamientos_semanales)
          : null,
        densidad_osea: fichaForm.densidad_osea ? Number(fichaForm.densidad_osea) : null,
        masa_magra: fichaForm.masa_magra ? Number(fichaForm.masa_magra) : null,
        masa_grasa: fichaForm.masa_grasa ? Number(fichaForm.masa_grasa) : null,
        comidas_por_dia: fichaForm.comidas_por_dia ? Number(fichaForm.comidas_por_dia) : null,
      })
      showToast('Ficha técnica guardada correctamente')
      setFichaMetrics(savedFicha)
      setIsFichaModalOpen(false)
      setSelectedClient(null)
    } catch (error) {
      console.error('Error saving ficha tecnica:', error)
      showToast('Error al guardar la ficha técnica', true)
    } finally {
      setFichaLoading(false)
    }
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
    if (!selectedClient) return
    if (!planForm.planBaseId || !planForm.weekStartDate) {
      showToast('Selecciona un plan base y la fecha de inicio', true)
      return
    }
    const clientId = selectedClient.id
    const weekStartDate = planForm.weekStartDate
    try {
      setPlanSubmitting(true)
      pendingPlanOverrides.current[clientId] = weekStartDate

      // Generar el plan
      await api.generateWeeklyPlanForUser({
        user_id: clientId,
        plan_base_id: planForm.planBaseId,
        week_start_date: weekStartDate,
      })

      // Esperar un momento para que la base de datos se actualice
      await new Promise(resolve => setTimeout(resolve, 500))

      // Intentar obtener el plan recién generado con retry
      let newPlan = null
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          newPlan = await api.getWeeklyPlan({
            user_id: clientId,
            week_start: weekStartDate,
            include_meals: false,
          })
          if (newPlan) break
        } catch (err) {
          console.warn(`Intento ${attempt + 1} de obtener el plan falló:`, err)
        }
        if (!newPlan && attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }

      // Actualizar el cliente específico con el nuevo plan si se encontró
      if (newPlan) {
        const planLabel = formatPlanLabel(newPlan)
        setClients((prev) =>
          prev.map((c) =>
            c.id === clientId
              ? {
                ...c,
                plan: planLabel,
                planWeekStart: newPlan.week_start_date ?? null,
                planWeekEnd: newPlan.week_end_date ?? null,
                planBaseId: newPlan.plan_base?.id ?? null,
              }
              : c
          )
        )
        // NO eliminamos pendingPlanOverrides aquí - lo hará loadClients() cuando confirme
        // Esto asegura que el polling siga consultando la semana correcta
      } else {
        // Si no se encontró después de 3 intentos, recargar todos los clientes
        // El override se mantiene para que el siguiente loadClients() lo intente
        await loadClients()
      }

      showToast('Plan semanal generado correctamente')
      setIsPlanModalOpen(false)
      setSelectedClient(null)
    } catch (error: any) {
      console.error('Error generating weekly plan:', error)
      delete pendingPlanOverrides.current[clientId]
      showToast(error?.message || 'Error al generar el plan semanal', true)
    } finally {
      setPlanSubmitting(false)
    }
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
                  <p className="text-xs uppercase tracking-wider text-gray-400">
                    {client.plan ? client.plan : 'Plan no generado'}
                  </p>
                  {client.plan && (
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
                Generar plan semanal
              </button>
              <button
                onClick={() => handleEditFicha(client)}
                className="rounded-full border border-gray-200 px-3 py-1 font-semibold text-gray-600 hover:border-blue-400 hover:text-blue-500 transition"
              >
                Editar ficha técnica
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

      {/* Modal ficha técnica */}
      <Modal
        isOpen={isFichaModalOpen}
        onClose={() => {
          setIsFichaModalOpen(false)
          setSelectedClient(null)
          setFichaMetrics(null)
        }}
        title={`Ficha técnica de ${selectedClient?.name ?? 'cliente'}`}
        size="lg"
      >
        {fichaLoading ? (
          <div className="py-6 text-center text-sm text-gray-500">Cargando ficha...</div>
        ) : (
          <form onSubmit={handleSubmitFicha} className="space-y-4">
            {fichaMetrics && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-primary">Resumen calculado automáticamente</p>
                  {fichaMetrics.calorias_objetivo && (
                    <span className="text-xs text-gray-500">
                      Última actualización:{' '}
                      {new Date(fichaMetrics.updated_at).toLocaleDateString('es-ES')}
                    </span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-600">
                  <div>
                    <p className="uppercase tracking-wide text-[10px] text-gray-500">IMC</p>
                    <p className="text-base font-semibold text-gray-900">
                      {fichaMetrics.imc ? fichaMetrics.imc.toFixed(2) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wide text-[10px] text-gray-500">TMB</p>
                    <p className="text-base font-semibold text-gray-900">
                      {fichaMetrics.tmb ? `${Math.round(fichaMetrics.tmb)} kcal` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wide text-[10px] text-gray-500">GET estimado</p>
                    <p className="text-base font-semibold text-gray-900">
                      {fichaMetrics.get_total ? `${Math.round(fichaMetrics.get_total)} kcal` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wide text-[10px] text-gray-500">Calorías objetivo</p>
                    <p className="text-base font-semibold text-gray-900">
                      {fichaMetrics.calorias_objetivo ? `${fichaMetrics.calorias_objetivo} kcal` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wide text-[10px] text-gray-500">Proteínas</p>
                    <p className="text-base font-semibold text-gray-900">
                      {fichaMetrics.proteinas_objetivo ? `${fichaMetrics.proteinas_objetivo} g` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wide text-[10px] text-gray-500">Carbohidratos</p>
                    <p className="text-base font-semibold text-gray-900">
                      {fichaMetrics.carbohidratos_objetivo ? `${fichaMetrics.carbohidratos_objetivo} g` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wide text-[10px] text-gray-500">Grasas</p>
                    <p className="text-base font-semibold text-gray-900">
                      {fichaMetrics.grasas_objetivo ? `${fichaMetrics.grasas_objetivo} g` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wide text-[10px] text-gray-500">Fibra</p>
                    <p className="text-base font-semibold text-gray-900">
                      {fichaMetrics.fibra_objetivo ? `${fichaMetrics.fibra_objetivo} g` : '—'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-600">
                  <p className="font-medium text-gray-700">Distribución calorías</p>
                  <p>
                    Almuerzo:{' '}
                    {(getDistributionValue(fichaMetrics, 'lunch') * 100).toFixed(0)}% • Cena:{' '}
                    {(getDistributionValue(fichaMetrics, 'dinner') * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Sexo</label>
                <select
                  value={fichaForm.sexo}
                  onChange={(e) => setFichaForm((prev) => ({ ...prev, sexo: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                >
                  <option value="hombre">Hombre</option>
                  <option value="mujer">Mujer</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Objetivo</label>
                <select
                  value={fichaForm.objetivo}
                  onChange={(e) => setFichaForm((prev) => ({ ...prev, objetivo: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                >
                  <option value="perder_grasa">Perder grasa</option>
                  <option value="mantener">Mantener</option>
                  <option value="ganar_masa">Ganar masa</option>
                  <option value="recomp_corporal">Recomposición corporal</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Edad</label>
                <input
                  type="number"
                  min="0"
                  value={fichaForm.edad}
                  onChange={(e) => setFichaForm((prev) => ({ ...prev, edad: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Peso (kg)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={fichaForm.peso_kg}
                  onChange={(e) => setFichaForm((prev) => ({ ...prev, peso_kg: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Altura (cm)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={fichaForm.altura_cm}
                  onChange={(e) => setFichaForm((prev) => ({ ...prev, altura_cm: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Nivel de actividad diaria</label>
                <select
                  value={fichaForm.nivel_actividad}
                  onChange={(e) => {
                    const value = e.target.value
                    setFichaForm((prev) => ({
                      ...prev,
                      nivel_actividad: value,
                      trabajo: mapActividadToTrabajo(value),
                    }))
                  }}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                >
                  <option value="sedentario">Sedentario (oficina, poca movilidad)</option>
                  <option value="ligero">Ligero (camina ocasionalmente)</option>
                  <option value="moderado">Moderado (actividad constante)</option>
                  <option value="intenso">Intenso (trabajo físico)</option>
                  <option value="atleta">Atleta / alto rendimiento</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Puesto o rol laboral</label>
                <input
                  type="text"
                  value={fichaForm.puesto_trabajo}
                  onChange={(e) => setFichaForm((prev) => ({ ...prev, puesto_trabajo: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="Ej: Camarero, informática..."
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Intensidad del trabajo</label>
                <select
                  value={fichaForm.intensidad_trabajo}
                  onChange={(e) => setFichaForm((prev) => ({ ...prev, intensidad_trabajo: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                >
                  <option value="baja">Baja</option>
                  <option value="moderada">Moderada</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Comidas por día</label>
                <select
                  value={fichaForm.comidas_por_dia}
                  onChange={(e) => setFichaForm((prev) => ({ ...prev, comidas_por_dia: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                >
                  <option value="1">1 comida (plan adaptado)</option>
                  <option value="2">2 comidas (almuerzo + cena)</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Entrenamientos/semana</label>
                <input
                  type="number"
                  min="0"
                  value={fichaForm.entrenamientos_semanales}
                  onChange={(e) =>
                    setFichaForm((prev) => ({ ...prev, entrenamientos_semanales: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Nivel de entrenamiento</label>
                <select
                  value={fichaForm.nivel_entrenamiento}
                  onChange={(e) =>
                    setFichaForm((prev) => ({ ...prev, nivel_entrenamiento: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                >
                  <option value="principiante">Principiante</option>
                  <option value="intermedio">Intermedio</option>
                  <option value="avanzado">Avanzado</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Densidad ósea (g/cm²)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={fichaForm.densidad_osea}
                  onChange={(e) =>
                    setFichaForm((prev) => ({ ...prev, densidad_osea: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Masa magra (kg)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={fichaForm.masa_magra}
                  onChange={(e) =>
                    setFichaForm((prev) => ({ ...prev, masa_magra: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Masa grasa (kg)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={fichaForm.masa_grasa}
                  onChange={(e) =>
                    setFichaForm((prev) => ({ ...prev, masa_grasa: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Fecha revisión</label>
                <input
                  type="date"
                  value={fichaForm.fecha_revision}
                  onChange={(e) =>
                    setFichaForm((prev) => ({ ...prev, fecha_revision: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Preferencias / restricciones</label>
              <textarea
                value={fichaForm.preferencias}
                onChange={(e) => setFichaForm((prev) => ({ ...prev, preferencias: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
                placeholder="Ej: vegetariano, sin lácteos..."
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Patologías / notas médicas</label>
              <textarea
                value={fichaForm.patologias}
                onChange={(e) => setFichaForm((prev) => ({ ...prev, patologias: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
                placeholder="Ej: resistencia a la insulina, alergias..."
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Observaciones internas</label>
              <textarea
                value={fichaForm.observaciones}
                onChange={(e) => setFichaForm((prev) => ({ ...prev, observaciones: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
                placeholder="Anota información adicional relevante..."
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsFichaModalOpen(false)
                  setSelectedClient(null)
                  setFichaMetrics(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={fichaLoading}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
              >
                Guardar ficha
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Generar Plan */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => {
          setIsPlanModalOpen(false)
          setSelectedClient(null)
        }}
        title={`Generar plan semanal para ${selectedClient?.name || ''}`}
        size="md"
      >
        <form onSubmit={handleSubmitPlan} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan base
            </label>
            {planBasesLoading ? (
              <p className="text-sm text-gray-500 py-2">Cargando planes base...</p>
            ) : planBases.length === 0 ? (
              <p className="text-sm text-red-500 py-2">
                No hay planes base disponibles. Crea al menos uno desde la seccion "Planes".
              </p>
            ) : (
              <select
                value={planForm.planBaseId}
                onChange={(e) =>
                  setPlanForm((prev) => ({
                    ...prev,
                    planBaseId: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {planBases.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.nombre}
                    {plan.objetivo ? ` - ${plan.objetivo}` : ''}
                    {plan.calorias_base ? ` - ${plan.calorias_base} kcal` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Semana que inicia
            </label>
            <input
              type="date"
              value={planForm.weekStartDate}
              onChange={(e) =>
                setPlanForm((prev) => ({
                  ...prev,
                  weekStartDate: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              Se generaran automaticamente almuerzos y cenas ajustados a la ficha tecnica del cliente.
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-600">
            Si ya existe un plan semanal para esa fecha se reemplazara automaticamente con el nuevo plan generado.
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsPlanModalOpen(false)
                setSelectedClient(null)
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={planBases.length === 0 || !planForm.planBaseId || planSubmitting}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {planSubmitting ? 'Generando...' : 'Generar plan'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
