"use client"

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import SearchFilters from '@/components/ui/SearchFilters'
import ActionButton from '@/components/ui/ActionButton'
import ToastMessage from '@/components/ui/ToastMessage'
import LoadingState from '@/components/ui/LoadingState'
import EmptyState from '@/components/ui/EmptyState'
import ResponsiveGrid from '@/components/ui/ResponsiveGrid'
import { useAuth } from '@/hooks/useAuth'
import * as api from '@/lib/api'
import { getMeals } from '@/lib/api'

interface PlanTemplate {
  id: string
  name: string
  focus: string
  duration: string
  audience: string
  description?: string
  calories?: number
}

interface SuggestedMeal {
  id: string
  name: string
  calories: number
  description: string
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack'
}

const initialTemplates: PlanTemplate[] = [
  {
    id: 'template-1',
    name: 'Plan Azul Energía',
    focus: 'Balance mente-cuerpo',
    duration: '4 semanas',
    audience: 'Suscriptores nuevos',
    description: 'Plan equilibrado para iniciar el camino hacia el bienestar integral.',
    calories: 2000,
  },
  {
    id: 'template-2',
    name: 'Plan Fortaleza',
    focus: 'Ganancia de masa magra',
    duration: '6 semanas',
    audience: 'Atletas recreativos',
    description: 'Enfoque en proteína y entrenamiento para desarrollo muscular.',
    calories: 2500,
  },
  {
    id: 'template-3',
    name: 'Plan Ligereza',
    focus: 'Déficit calórico sostenible',
    duration: '8 semanas',
    audience: 'Clientes con sobrepeso moderado',
    description: 'Reducción gradual y saludable de peso corporal.',
    calories: 1800,
  },
]

const initialSuggestedMeals: SuggestedMeal[] = [
  {
    id: 'meal-1',
    name: 'Avena con frutas',
    calories: 350,
    description: 'Avena integral con plátano, frutos rojos y miel orgánica.',
    category: 'breakfast',
  },
  {
    id: 'meal-2',
    name: 'Smoothie Verde Vital',
    calories: 280,
    description: 'Espinaca, piña, pepino y proteína vegetal.',
    category: 'breakfast',
  },
  {
    id: 'meal-3',
    name: 'Tostadas de aguacate',
    calories: 320,
    description: 'Pan multigrano, aguacate, semillas de girasol y limón.',
    category: 'breakfast',
  },
  {
    id: 'meal-4',
    name: 'Pollo al horno con quinoa',
    calories: 620,
    description: 'Pechuga marinada con hierbas, quinoa tricolor y vegetales al vapor.',
    category: 'lunch',
  },
  {
    id: 'meal-5',
    name: 'Wrap proteico',
    calories: 540,
    description: 'Tortilla integral con falafel, hummus y vegetales frescos.',
    category: 'lunch',
  },
  {
    id: 'meal-6',
    name: 'Poke integral',
    calories: 580,
    description: 'Arroz integral, atún fresco, mango y edamame con soya ligera.',
    category: 'lunch',
  },
  {
    id: 'meal-7',
    name: 'Salmón con verduras',
    calories: 480,
    description: 'Filete de salmón al horno con espárragos y brócoli al vapor.',
    category: 'dinner',
  },
  {
    id: 'meal-8',
    name: 'Bowl Vitalidad',
    calories: 520,
    description: 'Base de quinoa, garbanzos especiados, aguacate y salsa tahini.',
    category: 'dinner',
  },
  {
    id: 'meal-9',
    name: 'Crema de coliflor',
    calories: 420,
    description: 'Coliflor rostizada, cúrcuma y crocante de garbanzo.',
    category: 'dinner',
  },
  {
    id: 'meal-10',
    name: 'Snack: Mix energía',
    calories: 210,
    description: 'Nueces activadas, almendras y chips de coco sin azúcar.',
    category: 'snack',
  },
  {
    id: 'meal-11',
    name: 'Snack: Yogurt con semillas',
    calories: 190,
    description: 'Yogurt griego con chía, linaza y un toque de miel.',
    category: 'snack',
  },
  {
    id: 'meal-12',
    name: 'Snack: Smoothie Azul',
    calories: 210,
    description: 'Blueberries, plátano, leche de almendra y espirulina.',
    category: 'snack',
  },
]

export default function NutricionistaPlanesPage() {
  const { userId } = useAuth()
  const [activeTab, setActiveTab] = useState<'plans' | 'suggestions'>('plans')
  const [templates, setTemplates] = useState<PlanTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<PlanTemplate[]>([])
  const [suggestedMeals, setSuggestedMeals] = useState<SuggestedMeal[]>([])
  const [filteredMeals, setFilteredMeals] = useState<SuggestedMeal[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('todas')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isMealModalOpen, setIsMealModalOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<PlanTemplate | null>(null)
  const [selectedMeal, setSelectedMeal] = useState<SuggestedMeal | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    focus: '',
    duration: '',
    audience: '',
    description: '',
    calories: '',
  })
  const [mealFormData, setMealFormData] = useState({
    name: '',
    calories: '',
    description: '',
    category: 'breakfast' as SuggestedMeal['category'],
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  // Estado para comidas seleccionadas por día al crear plan
  const [planMealsByDay, setPlanMealsByDay] = useState<{ [dayNumber: number]: string[] }>({})

  // Función para cargar planes completos desde la API
  const loadTemplates = async () => {
    if (!userId) return

    try {
      // Cargar planes completos sin asignar del nutricionista
      const plans = await api.getMealPlansByNutricionista(userId)

      // Convertir planes a formato PlanTemplate para mostrar
      const formattedTemplates: PlanTemplate[] = plans.map((p: any) => {
        const totalMeals = p.days?.reduce((sum: number, day: any) => sum + (day.meals?.length || 0), 0) || 0
        return {
          id: p.id,
          name: p.name,
          focus: `${p.days?.length || 0} días, ${totalMeals} comidas`,
          duration: `${Math.ceil((new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / (1000 * 60 * 60 * 24))} días`,
          audience: 'Plan completo',
          description: p.description || undefined,
          calories: p.totalCalories || undefined,
        }
      })

      setTemplates(formattedTemplates)
    } catch (error) {
      console.error('Error loading plans:', error)
      setTemplates([])
    }
  }

  // Función para cargar opciones sugeridas desde la API
  // Nota: Se cargan solo comidas para PLANES NUTRICIONALES (is_menu_item=false)
  // NO se incluyen comidas del menú del local (is_menu_item=true)
  const loadSuggestedMeals = async () => {
    if (!userId) return

    try {
      const meals = await getMeals()
      if (meals && meals.length > 0) {
        // Convertir meals de API a formato SuggestedMeal
        // Filtrar solo comidas para planes nutricionales (NO del menú del local)
        const suggested: SuggestedMeal[] = meals
          .filter((m: any) => m.available && m.is_menu_item === false)
          .map((m: any) => ({
            id: m.id,
            name: m.name,
            calories: m.calories || 0,
            description: m.description || '',
            category: (m.type || 'lunch') as SuggestedMeal['category'],
          }))
        setSuggestedMeals(suggested.length > 0 ? suggested : initialSuggestedMeals)
      } else {
        setSuggestedMeals(initialSuggestedMeals)
      }
    } catch (error) {
      console.error('Error loading suggested meals:', error)
      setSuggestedMeals(initialSuggestedMeals)
    }
  }

  useEffect(() => {
    if (!userId) return

    loadTemplates()
    loadSuggestedMeals()

    // Polling cada 30 segundos para actualizar templates y comidas desde API
    const interval = setInterval(() => {
      loadTemplates()
      loadSuggestedMeals()
    }, 30000)

    return () => {
      clearInterval(interval)
    }
  }, [userId])

  // Filtrar y buscar planes
  useEffect(() => {
    let filtered = [...templates]

    // Buscar por nombre, descripción o focus
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(term) ||
        (template.description && template.description.toLowerCase().includes(term)) ||
        template.focus.toLowerCase().includes(term)
      )
    }

    setFilteredTemplates(filtered)
  }, [templates, searchTerm])

  // Filtrar y buscar comidas sugeridas
  useEffect(() => {
    let filtered = [...suggestedMeals]

    // Filtrar por categoría
    if (filterCategory !== 'todas') {
      filtered = filtered.filter(meal => meal.category === filterCategory)
    }

    // Buscar por nombre o descripción
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(meal =>
        meal.name.toLowerCase().includes(term) ||
        meal.description.toLowerCase().includes(term) ||
        meal.calories.toString().includes(term)
      )
    }

    setFilteredMeals(filtered)
  }, [suggestedMeals, filterCategory, searchTerm])

  const showToast = (message: string, isError = false) => {
    if (isError) {
      setError(message)
      setTimeout(() => setError(null), 5000)
    } else {
      setSuccess(message)
      setTimeout(() => setSuccess(null), 3000)
    }
  }


  // Funciones para templates
  const handleCreate = () => {
    setFormData({
      name: '',
      focus: '',
      duration: '',
      audience: '',
      description: '',
      calories: '',
    })
    setPlanMealsByDay({}) // Resetear comidas seleccionadas
    setError(null)
    setIsCreateModalOpen(true)
  }

  const handleEdit = (template: PlanTemplate) => {
    setSelectedTemplate(template)
    setFormData({
      name: template.name,
      focus: template.focus,
      duration: template.duration,
      audience: template.audience,
      description: template.description || '',
      calories: template.calories?.toString() || '',
    })
    setError(null)
    setIsEditModalOpen(true)
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('¿Estás seguro de eliminar este plan?')) return

    try {
      // TODO: Implementar API para eliminar templates
      // Por ahora, solo actualizar el estado local
      const updated = templates.filter((t) => t.id !== templateId)
      setTemplates(updated)
      showToast('Plan eliminado correctamente')
      // Recargar templates desde la API
      await loadTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      showToast('Error al eliminar el plan', true)
    }
  }

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name) {
      setError('El nombre del plan es requerido')
      return
    }

    // Validar que cada día tenga al menos una comida (almuerzo o cena) y máximo 1 de cada tipo
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
    for (let dayNumber = 1; dayNumber <= 5; dayNumber++) {
      const dayMeals = planMealsByDay[dayNumber] || []
      if (dayMeals.length === 0) {
        setError(`El ${dayNames[dayNumber - 1]} debe tener al menos un almuerzo o una cena`)
        return
      }

      // Contar almuerzos y cenas
      const lunchCount = dayMeals.filter((mealId) => {
        const meal = suggestedMeals.find((m) => m.id === mealId)
        return meal && meal.category === 'lunch'
      }).length

      const dinnerCount = dayMeals.filter((mealId) => {
        const meal = suggestedMeals.find((m) => m.id === mealId)
        return meal && meal.category === 'dinner'
      }).length

      // Verificar que haya al menos un almuerzo o una cena
      if (lunchCount === 0 && dinnerCount === 0) {
        setError(`El ${dayNames[dayNumber - 1]} debe tener al menos un almuerzo o una cena`)
        return
      }

      // Verificar que no haya más de 1 almuerzo
      if (lunchCount > 1) {
        setError(`El ${dayNames[dayNumber - 1]} solo puede tener máximo 1 almuerzo`)
        return
      }

      // Verificar que no haya más de 1 cena
      if (dinnerCount > 1) {
        setError(`El ${dayNames[dayNumber - 1]} solo puede tener máximo 1 cena`)
        return
      }
    }

    try {
      // Calcular fechas (plan de 5 días: lunes a viernes)
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 4) // 5 días: lunes a viernes

      // Preparar días con comidas (lunes a viernes: días 1-5)
      const days = [1, 2, 3, 4, 5].map((dayNumber) => ({
        day_number: dayNumber,
        day_name: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'][dayNumber - 1],
        meals: planMealsByDay[dayNumber] || [], // Array de meal IDs
      }))

      // Crear plan completo con días y comidas
      const newPlan = await api.createPlan({
        user_id: null, // Sin asignar - será un plan template
        name: formData.name,
        description: formData.description || undefined,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        total_calories: formData.calories ? parseInt(formData.calories) : undefined,
        days: days, // Incluir días con comidas
      })

      if (newPlan) {
        // Recargar planes desde la API
        await loadTemplates()
        setIsCreateModalOpen(false)
        setPlanMealsByDay({}) // Limpiar comidas seleccionadas
        showToast('Plan completo creado correctamente')
      } else {
        showToast('Error al crear el plan', true)
      }
    } catch (error: any) {
      console.error('Error creating plan:', error)
      setError(error.message || 'Error al crear el plan')
      showToast('Error al crear el plan', true)
    }
  }

  // Funciones para agregar/eliminar comidas por día
  const handleAddMealToDay = (dayNumber: number, mealId: string) => {
    setPlanMealsByDay((prev) => ({
      ...prev,
      [dayNumber]: [...(prev[dayNumber] || []), mealId],
    }))
  }

  const handleRemoveMealFromDay = (dayNumber: number, mealIndex: number) => {
    setPlanMealsByDay((prev) => {
      const dayMeals = prev[dayNumber] || []
      return {
        ...prev,
        [dayNumber]: dayMeals.filter((_, index) => index !== mealIndex),
      }
    })
  }

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedTemplate) return

    if (!formData.name || !formData.focus || !formData.duration || !formData.audience) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    try {
      // TODO: Implementar API para actualizar templates
      // Por ahora, solo actualizar el estado local
      const updated = templates.map((t) =>
        t.id === selectedTemplate.id
          ? {
            ...t,
            name: formData.name,
            focus: formData.focus,
            duration: formData.duration,
            audience: formData.audience,
            description: formData.description,
            calories: formData.calories ? parseInt(formData.calories) : undefined,
          }
          : t
      )

      setTemplates(updated)
      setIsEditModalOpen(false)
      setSelectedTemplate(null)
      showToast('Plan actualizado correctamente')
      // Recargar templates desde la API
      await loadTemplates()
    } catch (error: any) {
      console.error('Error updating template:', error)
      setError(error.message || 'Error al actualizar el plan')
      showToast('Error al actualizar el plan', true)
    }
  }

  // Funciones para opciones sugeridas
  const handleCreateMeal = () => {
    setMealFormData({
      name: '',
      calories: '',
      description: '',
      category: 'breakfast',
    })
    setError(null)
    setIsMealModalOpen(true)
  }

  const handleEditMeal = (meal: SuggestedMeal) => {
    setSelectedMeal(meal)
    setMealFormData({
      name: meal.name,
      calories: meal.calories.toString(),
      description: meal.description,
      category: meal.category,
    })
    setError(null)
    setIsMealModalOpen(true)
  }

  const handleDeleteMeal = async (mealId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta opción sugerida?')) return

    try {
      // Las opciones sugeridas vienen de la API de meals
      // Si es una comida personalizada del nutricionista, se puede eliminar
      // Por ahora, solo actualizar el estado local
      const updated = suggestedMeals.filter((m) => m.id !== mealId)
      setSuggestedMeals(updated)
      showToast('Opción sugerida eliminada correctamente')
      // Recargar comidas desde la API
      await loadSuggestedMeals()
    } catch (error) {
      console.error('Error deleting meal:', error)
      showToast('Error al eliminar la opción sugerida', true)
    }
  }

  const handleSubmitMeal = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!mealFormData.name || !mealFormData.calories || !mealFormData.description) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    try {
      if (selectedMeal) {
        // Editar - actualizar meal en la API
        await api.updateMeal(selectedMeal.id, {
          name: mealFormData.name,
          calories: parseInt(mealFormData.calories),
          description: mealFormData.description,
          type: mealFormData.category,
        })
        setIsMealModalOpen(false)
        setSelectedMeal(null)
        showToast('Opción sugerida actualizada correctamente')
        await loadSuggestedMeals()
      } else {
        // Crear - crear meal en la API
        await api.createMeal({
          name: mealFormData.name,
          calories: parseInt(mealFormData.calories),
          description: mealFormData.description,
          type: mealFormData.category,
          available: true,
        })
        setIsMealModalOpen(false)
        showToast('Opción sugerida creada correctamente')
        await loadSuggestedMeals()
      }
    } catch (error: any) {
      console.error('Error saving meal:', error)
      setError(error.message || 'Error al guardar la opción sugerida')
      showToast('Error al guardar la opción sugerida', true)
    }
  }

  const getCategoryLabel = (category: SuggestedMeal['category']) => {
    const labels = {
      breakfast: 'Desayuno',
      lunch: 'Almuerzo',
      dinner: 'Cena',
      snack: 'Snack',
    }
    return labels[category]
  }

  const plusIcon = (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
        clipRule="evenodd"
      />
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
        title="Biblioteca de planes y opciones"
        description="Crea planes completos con comidas asignadas para cada día (Lunes a Viernes). Estos planes se pueden asignar a tus clientes desde la sección 'Clientes'."
      />

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('plans')
              setSearchTerm('')
              setFilterCategory('todas')
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'plans'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Planes
          </button>
          <button
            onClick={() => {
              setActiveTab('suggestions')
              setSearchTerm('')
              setFilterCategory('todas')
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'suggestions'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Opciones sugeridas
          </button>
        </nav>
      </div>

      {/* Tab: Planes */}
      {activeTab === 'plans' && (
        <>
          <div className="flex justify-end">
            <ActionButton onClick={handleCreate} icon={plusIcon}>
              Crear nuevo plan
            </ActionButton>
          </div>

          {/* Búsqueda para planes */}
          {templates.length > 0 && (
            <SearchFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Buscar por nombre, descripción o características..."
              resultsCount={
                searchTerm
                  ? { showing: filteredTemplates.length, total: templates.length }
                  : undefined
              }
            />
          )}

          {filteredTemplates.length === 0 && templates.length > 0 && (
            <EmptyState
              title="No se encontraron planes"
              message="Intenta ajustar la búsqueda."
            />
          )}

          {templates.length === 0 && (
            <EmptyState
              title="No hay planes creados"
              message="Crea tu primer plan nutricional para comenzar."
              action={
                <ActionButton onClick={handleCreate} icon={plusIcon}>
                  Crear Primer Plan
                </ActionButton>
              }
            />
          )}

          {filteredTemplates.length > 0 && (
            <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }} gap="md">
            {filteredTemplates.map((template) => (
              <article
                key={template.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                <p className="mt-2 text-sm text-primary font-medium">{template.focus}</p>
                {template.description && <p className="mt-2 text-xs text-gray-600">{template.description}</p>}
                <ul className="mt-3 space-y-1 text-xs text-gray-500">
                  <li>Duración: {template.duration}</li>
                  <li>Orientado a: {template.audience}</li>
                  {template.calories && <li>Calorías objetivo: {template.calories} kcal</li>}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleEdit(template)}
                    className="inline-flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:border-highlight hover:text-highlight transition"
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
            </ResponsiveGrid>
          )}
        </>
      )}

      {/* Tab: Opciones sugeridas */}
      {activeTab === 'suggestions' && (
        <>
          <div className="flex justify-end">
            <ActionButton onClick={handleCreateMeal} icon={plusIcon}>
              Agregar opción sugerida
            </ActionButton>
          </div>

          {/* Búsqueda y filtros para comidas */}
          {suggestedMeals.length > 0 && (
            <SearchFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Buscar por nombre, descripción o calorías..."
              filters={
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="todas">Todas</option>
                    <option value="breakfast">Desayuno</option>
                    <option value="lunch">Almuerzo</option>
                    <option value="dinner">Cena</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>
              }
              resultsCount={
                (searchTerm || filterCategory !== 'todas')
                  ? { showing: filteredMeals.length, total: suggestedMeals.length }
                  : undefined
              }
            />
          )}

          {suggestedMeals.length === 0 && (
            <EmptyState
              title="No hay opciones sugeridas"
              message="Agrega comidas sugeridas para usar en los planes nutricionales."
              action={
                <ActionButton onClick={handleCreateMeal} icon={plusIcon}>
                  Agregar Primera Opción
                </ActionButton>
              }
            />
          )}

          {filteredMeals.length === 0 && suggestedMeals.length > 0 && (
            <EmptyState
              title="No se encontraron opciones"
              message="Intenta ajustar los filtros o la búsqueda."
            />
          )}

          {filteredMeals.length > 0 && (
            <div className="space-y-6">
              {['breakfast', 'lunch', 'dinner', 'snack'].map((category) => {
                const categoryMeals = filteredMeals.filter((m) => m.category === category)
                if (categoryMeals.length === 0) return null

                return (
                  <section key={category}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                      {getCategoryLabel(category as SuggestedMeal['category'])}
                    </h3>
                    <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }} gap="md">
                    {categoryMeals.map((meal) => (
                      <article
                        key={meal.id}
                        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{meal.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">{meal.description}</p>
                            <p className="text-sm font-medium text-primary mt-2">{meal.calories} kcal</p>
                          </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleEditMeal(meal)}
                            className="flex-1 rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteMeal(meal.id)}
                            className="flex-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-highlight hover:text-highlight transition"
                          >
                            Eliminar
                          </button>
                        </div>
                      </article>
                    ))}
                    </ResponsiveGrid>
                  </section>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Modal Crear/Editar Plan */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setIsEditModalOpen(false)
          setPlanMealsByDay({}) // Limpiar comidas al cerrar
        }}
        title={isCreateModalOpen ? 'Crear nuevo plan completo' : 'Editar plan'}
        size={isCreateModalOpen ? 'xl' : 'md'}
      >
        <form onSubmit={isCreateModalOpen ? handleSubmitCreate : handleSubmitEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del plan</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ej: Plan Azul Energía"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Calorías objetivo (opcional)</label>
              <input
                type="number"
                min="0"
                value={formData.calories}
                onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ej: 2000"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descripción (opcional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Descripción del plan..."
            />
          </div>

          {/* Sección de comidas por día - Solo al crear */}
          {isCreateModalOpen && (
            <div className="border-t pt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Asignar comidas a cada día (Lunes a Viernes)
                </label>
                <p className="text-xs text-gray-500 mb-4">
                  Cada día debe tener al menos un <strong>almuerzo o una cena</strong>. Máximo 1 almuerzo y 1 cena por día.
                </p>

                {[1, 2, 3, 4, 5].map((dayNumber) => {
                  const dayName = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'][dayNumber - 1]
                  const dayMeals = planMealsByDay[dayNumber] || []

                  // Separar comidas por tipo
                  const lunchMeals = dayMeals
                    .map((mealId) => suggestedMeals.find((m) => m.id === mealId))
                    .filter((meal) => meal && meal.category === 'lunch')

                  const dinnerMeals = dayMeals
                    .map((mealId) => suggestedMeals.find((m) => m.id === mealId))
                    .filter((meal) => meal && meal.category === 'dinner')

                  // Filtrar comidas disponibles por tipo
                  const availableLunches = suggestedMeals.filter((m) => m.category === 'lunch')
                  const availableDinners = suggestedMeals.filter((m) => m.category === 'dinner')

                  return (
                    <div key={dayNumber} className="mb-4 p-3 border rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-900">{dayName}</h4>
                        <span className="text-xs text-gray-500">{dayMeals.length}/2 comidas</span>
                      </div>

                      {/* Sección de Almuerzos */}
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Almuerzos ({lunchMeals.length}/1)
                        </label>

                        {/* Almuerzos seleccionados */}
                        {lunchMeals.length > 0 && (
                          <div className="space-y-1 mb-2">
                            {lunchMeals.map((meal, index) => {
                              if (!meal) return null
                              const mealIndex = dayMeals.findIndex((id) => id === meal.id)
                              return (
                                <div key={meal.id} className="flex items-center justify-between p-2 bg-white rounded border text-xs">
                                  <span className="text-gray-700">{meal.name} ({meal.calories} kcal)</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMealFromDay(dayNumber, mealIndex)}
                                    className="text-red-600 hover:text-red-700 font-medium"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Selector de almuerzos */}
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAddMealToDay(dayNumber, e.target.value)
                              e.target.value = ''
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white"
                          defaultValue=""
                          disabled={lunchMeals.length >= 1}
                        >
                          <option value="">
                            {lunchMeals.length >= 1
                              ? 'Ya hay un almuerzo asignado (máximo 1)'
                              : `Agregar almuerzo a ${dayName}...`}
                          </option>
                          {availableLunches.map((meal) => (
                            <option key={meal.id} value={meal.id}>
                              {meal.name} ({meal.calories} kcal)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Sección de Cenas */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Cenas ({dinnerMeals.length}/1)
                        </label>

                        {/* Cenas seleccionadas */}
                        {dinnerMeals.length > 0 && (
                          <div className="space-y-1 mb-2">
                            {dinnerMeals.map((meal, index) => {
                              if (!meal) return null
                              const mealIndex = dayMeals.findIndex((id) => id === meal.id)
                              return (
                                <div key={meal.id} className="flex items-center justify-between p-2 bg-white rounded border text-xs">
                                  <span className="text-gray-700">{meal.name} ({meal.calories} kcal)</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMealFromDay(dayNumber, mealIndex)}
                                    className="text-red-600 hover:text-red-700 font-medium"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Selector de cenas */}
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAddMealToDay(dayNumber, e.target.value)
                              e.target.value = ''
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                          defaultValue=""
                          disabled={dinnerMeals.length >= 1}
                        >
                          <option value="">
                            {dinnerMeals.length >= 1
                              ? 'Ya hay una cena asignada (máximo 1)'
                              : `Agregar cena a ${dayName}...`}
                          </option>
                          {availableDinners.map((meal) => (
                            <option key={meal.id} value={meal.id}>
                              {meal.name} ({meal.calories} kcal)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false)
                setIsEditModalOpen(false)
                setPlanMealsByDay({}) // Limpiar comidas al cancelar
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              {isCreateModalOpen ? 'Crear plan' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Crear/Editar Opción Sugerida */}
      <Modal
        isOpen={isMealModalOpen}
        onClose={() => {
          setIsMealModalOpen(false)
          setSelectedMeal(null)
        }}
        title={selectedMeal ? 'Editar opción sugerida' : 'Agregar opción sugerida'}
      >
        <form onSubmit={handleSubmitMeal} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del plato</label>
            <input
              type="text"
              required
              value={mealFormData.name}
              onChange={(e) => setMealFormData({ ...mealFormData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ej: Avena con frutas"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Calorías</label>
              <input
                type="number"
                min="0"
                required
                value={mealFormData.calories}
                onChange={(e) => setMealFormData({ ...mealFormData, calories: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ej: 350"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
              <select
                value={mealFormData.category}
                onChange={(e) =>
                  setMealFormData({ ...mealFormData, category: e.target.value as SuggestedMeal['category'] })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="breakfast">Desayuno</option>
                <option value="lunch">Almuerzo</option>
                <option value="dinner">Cena</option>
                <option value="snack">Snack</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
            <textarea
              required
              value={mealFormData.description}
              onChange={(e) => setMealFormData({ ...mealFormData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Descripción del plato..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsMealModalOpen(false)
                setSelectedMeal(null)
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              {selectedMeal ? 'Guardar cambios' : 'Crear opción'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
