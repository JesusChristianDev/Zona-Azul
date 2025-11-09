"use client"

import { useState, useEffect } from 'react'
import Modal from '../../../components/ui/Modal'
import { useAuth } from '../../../hooks/useAuth'
import { getUserData, setUserData } from '../../../lib/storage'

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
  const [suggestedMeals, setSuggestedMeals] = useState<SuggestedMeal[]>([])
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

  // Función para cargar templates
  const loadTemplates = () => {
    if (!userId) return

    const stored = getUserData<PlanTemplate[]>('zona_azul_plans', userId, initialTemplates)
    if (stored) {
      setTemplates(stored)
    } else {
      setTemplates(initialTemplates)
      setUserData('zona_azul_plans', initialTemplates, userId)
    }
  }

  // Función para cargar opciones sugeridas
  const loadSuggestedMeals = () => {
    if (!userId) return

    const storedMeals = getUserData<SuggestedMeal[]>('zona_azul_suggested_meals', userId, initialSuggestedMeals)
    if (storedMeals) {
      setSuggestedMeals(storedMeals)
    } else {
      setSuggestedMeals(initialSuggestedMeals)
      setUserData('zona_azul_suggested_meals', initialSuggestedMeals, userId)
    }
  }

  useEffect(() => {
    if (!userId) return

    loadTemplates()
    loadSuggestedMeals()

    // Escuchar cambios en localStorage para actualizar en tiempo real (otras pestañas)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && (e.key.startsWith('zona_azul_plans_user_') || e.key.startsWith('zona_azul_suggested_meals_user_'))) {
        loadTemplates()
        loadSuggestedMeals()
      }
    }

    // Escuchar cambios locales (misma pestaña)
    const handleCustomPlansChange = () => {
      loadTemplates()
    }
    const handleCustomMealsChange = () => {
      loadSuggestedMeals()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('zona_azul_plans_updated', handleCustomPlansChange)
    window.addEventListener('zona_azul_suggested_meals_updated', handleCustomMealsChange)

    // Polling cada 2 segundos para detectar cambios (fallback)
    const interval = setInterval(() => {
      loadTemplates()
      loadSuggestedMeals()
    }, 2000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('zona_azul_plans_updated', handleCustomPlansChange)
      window.removeEventListener('zona_azul_suggested_meals_updated', handleCustomMealsChange)
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

  const notifyMealsUpdate = () => {
    window.dispatchEvent(new Event('zona_azul_suggested_meals_updated'))
  }

  // Notificar a otras pestañas/componentes que los planes fueron actualizados
  const notifyPlansUpdate = () => {
    window.dispatchEvent(new Event('zona_azul_plans_updated'))
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

  const handleDelete = (templateId: string) => {
    if (confirm('¿Estás seguro de eliminar este plan?')) {
      const updated = templates.filter((t) => t.id !== templateId)
      setTemplates(updated)
      if (userId) {
        setUserData('zona_azul_plans', updated, userId)
        notifyPlansUpdate()
      }
      showToast('Plan eliminado correctamente')
    }
  }

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name || !formData.focus || !formData.duration || !formData.audience) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    const newTemplate: PlanTemplate = {
      id: `template-${Date.now()}`,
      name: formData.name,
      focus: formData.focus,
      duration: formData.duration,
      audience: formData.audience,
      description: formData.description,
      calories: formData.calories ? parseInt(formData.calories) : undefined,
    }

    const updated = [...templates, newTemplate]
    setTemplates(updated)
    if (userId) {
      setUserData('zona_azul_plans', updated, userId)
      notifyPlansUpdate()
    }
    setIsCreateModalOpen(false)
    showToast('Plan creado correctamente')
  }

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedTemplate) return

    if (!formData.name || !formData.focus || !formData.duration || !formData.audience) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

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
    if (userId) {
      setUserData('zona_azul_plans', updated, userId)
      notifyPlansUpdate()
    }
    setIsEditModalOpen(false)
    setSelectedTemplate(null)
    showToast('Plan actualizado correctamente')
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

  const handleDeleteMeal = (mealId: string) => {
    if (confirm('¿Estás seguro de eliminar esta opción sugerida?')) {
      const updated = suggestedMeals.filter((m) => m.id !== mealId)
      setSuggestedMeals(updated)
      if (userId) {
        setUserData('zona_azul_suggested_meals', updated, userId)
      }
      notifyMealsUpdate()
      showToast('Opción sugerida eliminada correctamente')
    }
  }

  const handleSubmitMeal = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!mealFormData.name || !mealFormData.calories || !mealFormData.description) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    if (selectedMeal) {
      // Editar
      const updated = suggestedMeals.map((m) =>
        m.id === selectedMeal.id
          ? {
            ...m,
            name: mealFormData.name,
            calories: parseInt(mealFormData.calories),
            description: mealFormData.description,
            category: mealFormData.category,
          }
          : m
      )
      setSuggestedMeals(updated)
      if (userId) {
        setUserData('zona_azul_suggested_meals', updated, userId)
      }
      notifyMealsUpdate()
      setIsMealModalOpen(false)
      setSelectedMeal(null)
      showToast('Opción sugerida actualizada correctamente')
    } else {
      // Crear
      const newMeal: SuggestedMeal = {
        id: `meal-${Date.now()}`,
        name: mealFormData.name,
        calories: parseInt(mealFormData.calories),
        description: mealFormData.description,
        category: mealFormData.category,
      }
      const updated = [...suggestedMeals, newMeal]
      setSuggestedMeals(updated)
      if (userId) {
        setUserData('zona_azul_suggested_meals', updated, userId)
      }
      notifyMealsUpdate()
      setIsMealModalOpen(false)
      showToast('Opción sugerida creada correctamente')
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

      <header className="rounded-2xl border border-accent/30 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Biblioteca de planes y opciones</h2>
            <p className="mt-2 text-sm text-gray-600">
              Gestiona plantillas de planes y opciones sugeridas que los suscriptores pueden elegir al modificar
              su plan semanal.
            </p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('plans')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'plans'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Planes
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
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
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition"
            >
              Crear nuevo plan
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          <section className="grid gap-4 md:grid-cols-3">
            {templates.map((template) => (
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
          </section>
        </>
      )}

      {/* Tab: Opciones sugeridas */}
      {activeTab === 'suggestions' && (
        <>
          <div className="flex justify-end">
            <button
              onClick={handleCreateMeal}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition"
            >
              Agregar opción sugerida
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {['breakfast', 'lunch', 'dinner', 'snack'].map((category) => {
              const categoryMeals = suggestedMeals.filter((m) => m.category === category)
              if (categoryMeals.length === 0) return null

              return (
                <section key={category}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                    {getCategoryLabel(category as SuggestedMeal['category'])}
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                  </div>
                </section>
              )
            })}
          </div>
        </>
      )}

      {/* Modal Crear/Editar Plan */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setIsEditModalOpen(false)
        }}
        title={isCreateModalOpen ? 'Crear nuevo plan' : 'Editar plan'}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Enfoque</label>
            <input
              type="text"
              required
              value={formData.focus}
              onChange={(e) => setFormData({ ...formData, focus: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ej: Balance mente-cuerpo"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duración</label>
              <input
                type="text"
                required
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ej: 4 semanas"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Calorías objetivo</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Audiencia objetivo</label>
            <input
              type="text"
              required
              value={formData.audience}
              onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ej: Suscriptores nuevos"
            />
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
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false)
                setIsEditModalOpen(false)
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
