"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
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

const mealTypeLabels: Record<'lunch' | 'dinner', string> = {
  lunch: 'Almuerzo',
  dinner: 'Cena',
}

interface PlanBase {
  id: string
  nombre: string
  descripcion?: string | null
  objetivo?: 'perder_grasa' | 'mantener' | 'ganar_masa' | 'antiinflamatorio' | 'deportivo' | null
  dias_plan: number
  calorias_base: number
  proteinas_base?: number | null
  carbohidratos_base?: number | null
  grasas_base?: number | null
  updated_at?: string
}

interface PlanBaseRecipe {
  id: string
  nombre: string
  descripcion?: string | null
  meal_type: 'lunch' | 'dinner'
  calorias_totales?: number | null
  proteinas_totales?: number | null
  carbohidratos_totales?: number | null
  grasas_totales?: number | null
  porciones?: number | null
}

interface LibraryRecipeItem {
  id: string
  nombre: string
  descripcion?: string | null
  meal_type: 'lunch' | 'dinner'
  calorias_totales?: number | null
  proteinas_totales?: number | null
  carbohidratos_totales?: number | null
  grasas_totales?: number | null
  porciones?: number | null
  tiempo_preparacion_min?: number | null
  recetas_ingredientes?: Array<{
    id: string
    ingrediente_id: string
    cantidad_base: number
    unidad: string
    ingredientes?: { nombre: string }
  }>
}

const WEEKDAY_DURATION_OPTIONS = [
  { value: 5, label: '1 semana · 5 días hábiles' },
  { value: 10, label: '2 semanas · 10 días hábiles' },
  { value: 15, label: '3 semanas · 15 días hábiles' },
  { value: 20, label: '4 semanas · 20 días hábiles' },
]

const DEFAULT_PLAN_CALORIES = 2000

type MacroTotals = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

type MealBucket = MacroTotals & { count: number }

type PlanBaseRecipeSummary = {
  lunch: MealBucket
  dinner: MealBucket
  daily: MacroTotals
}

function formatPlanDurationLabel(days: number) {
  const weeks = Math.round(days / 5)
  if (!Number.isFinite(weeks) || weeks <= 1) {
    return `1 semana · ${Math.max(days, 5)} días hábiles`
  }
  return `${weeks} semanas · ${days} días hábiles`
}

function summarizePlanBaseRecipes(recipes: PlanBaseRecipe[]): PlanBaseRecipeSummary {
  const createBucket = (): MealBucket => ({
    count: 0,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  })

  const summary = {
    lunch: createBucket(),
    dinner: createBucket(),
  }

  recipes.forEach((receta) => {
    const bucket = receta.meal_type === 'dinner' ? summary.dinner : summary.lunch
    bucket.count += 1
    bucket.calories += receta.calorias_totales ?? 0
    bucket.protein += receta.proteinas_totales ?? 0
    bucket.carbs += receta.carbohidratos_totales ?? 0
    bucket.fat += receta.grasas_totales ?? 0
  })

  const avg = (bucket: MealBucket): MacroTotals => ({
    calories: bucket.count ? bucket.calories / bucket.count : 0,
    protein: bucket.count ? bucket.protein / bucket.count : 0,
    carbs: bucket.count ? bucket.carbs / bucket.count : 0,
    fat: bucket.count ? bucket.fat / bucket.count : 0,
  })

  const lunchAvg = avg(summary.lunch)
  const dinnerAvg = avg(summary.dinner)

  return {
    lunch: summary.lunch,
    dinner: summary.dinner,
    daily: {
      calories: lunchAvg.calories + dinnerAvg.calories,
      protein: lunchAvg.protein + dinnerAvg.protein,
      carbs: lunchAvg.carbs + dinnerAvg.carbs,
      fat: lunchAvg.fat + dinnerAvg.fat,
    },
  }
}

interface SuggestedMeal {
  id: string
  name: string
  calories: number
  description: string
  category: 'lunch' | 'dinner'
}

const initialSuggestedMeals: SuggestedMeal[] = [
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
]

const PLAN_OBJECTIVE_LABELS: Record<string, string> = {
  perder_grasa: 'Pérdida de grasa',
  mantener: 'Mantenimiento',
  ganar_masa: 'Ganancia muscular',
  antiinflamatorio: 'Antiinflamatorio',
  deportivo: 'Deportivo',
  recomp_corporal: 'Recomposición corporal',
}

function getNextMonday(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 1 ? 0 : (8 - day) % 7
  today.setDate(today.getDate() + diff)
  return today.toISOString().split('T')[0]
}

export default function NutricionistaPlanesPage() {
  const { userId } = useAuth()
  const [activeTab, setActiveTab] = useState<'plans' | 'suggestions'>('plans')

  const [planBases, setPlanBases] = useState<PlanBase[]>([])
  const [filteredPlanBases, setFilteredPlanBases] = useState<PlanBase[]>([])
  const [planBaseSearch, setPlanBaseSearch] = useState('')
  const [planBaseObjective, setPlanBaseObjective] = useState<'todos' | PlanBase['objetivo']>('todos')
  const [planBasesLoading, setPlanBasesLoading] = useState(true)
  const [isPlanBaseModalOpen, setIsPlanBaseModalOpen] = useState(false)
  const [selectedPlanBase, setSelectedPlanBase] = useState<PlanBase | null>(null)
  const [planBaseSaving, setPlanBaseSaving] = useState(false)
  const [planBaseForm, setPlanBaseForm] = useState({
    nombre: '',
    descripcion: '',
    objetivo: 'mantener',
    dias_plan: 5,
    calorias_base: DEFAULT_PLAN_CALORIES.toString(),
    proteinas_base: '',
    carbohidratos_base: '',
    grasas_base: '',
  })
  const [isRecipesModalOpen, setIsRecipesModalOpen] = useState(false)
  const [recipesLoading, setRecipesLoading] = useState(false)
  const [selectedPlanBaseForRecipes, setSelectedPlanBaseForRecipes] = useState<PlanBase | null>(null)
  const [planBaseRecipes, setPlanBaseRecipes] = useState<PlanBaseRecipe[]>([])
  const [planBaseRecipeSummary, setPlanBaseRecipeSummary] = useState<PlanBaseRecipeSummary | null>(null)
  const [isSyncingPlanTotals, setIsSyncingPlanTotals] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<PlanBaseRecipe | null>(null)
  const [recipeForm, setRecipeForm] = useState({
    nombre: '',
    descripcion: '',
    meal_type: 'lunch' as 'lunch' | 'dinner',
    calorias_totales: '',
    proteinas_totales: '',
    carbohidratos_totales: '',
    grasas_totales: '',
    porciones: '1',
  })
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false)
  const [libraryRecipes, setLibraryRecipes] = useState<LibraryRecipeItem[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [librarySearch, setLibrarySearch] = useState('')
  const [libraryMealFilter, setLibraryMealFilter] = useState<'all' | 'lunch' | 'dinner'>('all')
  const [assigningLibraryRecipe, setAssigningLibraryRecipe] = useState<string | null>(null)

  const [availableClients, setAvailableClients] = useState<Array<{ id: string; name: string }>>([])
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)
  const [generateForm, setGenerateForm] = useState({
    clientId: '',
    planBaseId: '',
    weekStartDate: getNextMonday(),
  })

  const [suggestedMeals, setSuggestedMeals] = useState<SuggestedMeal[]>(initialSuggestedMeals)
  const [filteredMeals, setFilteredMeals] = useState<SuggestedMeal[]>(initialSuggestedMeals)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('todas')
  const [isMealModalOpen, setIsMealModalOpen] = useState(false)
  const [selectedMeal, setSelectedMeal] = useState<SuggestedMeal | null>(null)
  const [mealFormData, setMealFormData] = useState({
    name: '',
    calories: '',
    description: '',
    category: 'lunch' as SuggestedMeal['category'],
  })

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const showToast = useCallback(
    (message: string, isError = false) => {
      if (isError) {
        setError(message)
        setTimeout(() => setError(null), 5000)
      } else {
        setSuccess(message)
        setTimeout(() => setSuccess(null), 3000)
      }
    },
    [setError, setSuccess]
  )

  const loadPlanBases = useCallback(async () => {
    try {
      setPlanBasesLoading(true)
      const bases = await api.getPlanBases({ includeRecipes: false })
      setPlanBases(bases)
    } catch (err) {
      console.error('Error loading plan bases:', err)
      setPlanBases([])
      showToast('No se pudieron cargar los planes base', true)
    } finally {
      setPlanBasesLoading(false)
    }
  }, [showToast])

  const syncPlanBaseMetrics = useCallback(
    async (planBaseId: string, recipes: PlanBaseRecipe[], summaryOverride?: PlanBaseRecipeSummary) => {
      if (!planBaseId || !recipes.length) return
      const summary = summaryOverride ?? summarizePlanBaseRecipes(recipes)
      if (!summary.daily.calories) return

      const normalized = {
        calorias_base: Math.max(1, Math.round(summary.daily.calories)),
        proteinas_base: summary.daily.protein ? Number(summary.daily.protein.toFixed(1)) : null,
        carbohidratos_base: summary.daily.carbs ? Number(summary.daily.carbs.toFixed(1)) : null,
        grasas_base: summary.daily.fat ? Number(summary.daily.fat.toFixed(1)) : null,
      }

      const currentPlan = planBases.find((plan) => plan.id === planBaseId)
      const hasDifferences =
        !currentPlan ||
        currentPlan.calorias_base !== normalized.calorias_base ||
        (currentPlan.proteinas_base ?? null) !== normalized.proteinas_base ||
        (currentPlan.carbohidratos_base ?? null) !== normalized.carbohidratos_base ||
        (currentPlan.grasas_base ?? null) !== normalized.grasas_base

      if (!hasDifferences) return

      try {
        setIsSyncingPlanTotals(true)
        await api.updatePlanBase(planBaseId, normalized)
        await loadPlanBases()
        setSelectedPlanBaseForRecipes((prev) =>
          prev && prev.id === planBaseId ? { ...prev, ...normalized } : prev
        )
      } catch (error) {
        console.error('Error sincronizando totales del plan base:', error)
        showToast('No se pudieron recalcular los totales del plan base', true)
      } finally {
        setIsSyncingPlanTotals(false)
      }
    },
    [planBases, loadPlanBases, showToast]
  )

  const loadClients = useCallback(async () => {
    if (!userId) return
    try {
      const assignments = await api.getNutricionistaClients(userId)
      const subscribers = await api.getSubscribers()
      const subscribersMap = new Map(subscribers.map((s: any) => [s.id, s]))
      const formatted = assignments
        .map((assignment: any) => {
          const subscriber = subscribersMap.get(assignment.client_id)
          return {
            id: assignment.client_id,
            name: subscriber?.name || subscriber?.email || 'Cliente sin nombre',
          }
        })
        .filter((client) => client.id)
      setAvailableClients(formatted)
    } catch (err) {
      console.error('Error loading clients:', err)
      setAvailableClients([])
    }
  }, [userId])

  const loadSuggestedMeals = useCallback(async () => {
    if (!userId) return
    try {
      const meals = await getMeals()
      if (!meals || meals.length === 0) {
        setSuggestedMeals(initialSuggestedMeals)
        return
      }
      const filtered = meals
        .filter((meal: any) => meal.available && meal.is_menu_item === false)
        .map((meal: any) => ({
          id: meal.id,
          name: meal.name,
          description: meal.description || '',
          calories: meal.calories || 0,
          category: (meal.type || 'lunch') as SuggestedMeal['category'],
        }))
      setSuggestedMeals(filtered.length ? filtered : initialSuggestedMeals)
    } catch (err) {
      console.error('Error loading meals:', err)
      setSuggestedMeals(initialSuggestedMeals)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    loadPlanBases()
    loadClients()
    loadSuggestedMeals()
    const interval = setInterval(() => {
      loadPlanBases()
      loadSuggestedMeals()
    }, 30000)
    return () => clearInterval(interval)
  }, [userId, loadPlanBases, loadClients, loadSuggestedMeals])

  useEffect(() => {
    let filtered = [...planBases]
    if (planBaseSearch) {
      const term = planBaseSearch.toLowerCase()
      filtered = filtered.filter(
        (plan) =>
          plan.nombre.toLowerCase().includes(term) ||
          (plan.descripcion && plan.descripcion.toLowerCase().includes(term)) ||
          (plan.objetivo && PLAN_OBJECTIVE_LABELS[plan.objetivo]?.toLowerCase().includes(term))
      )
    }
    if (planBaseObjective !== 'todos') {
      filtered = filtered.filter((plan) => plan.objetivo === planBaseObjective)
    }
    setFilteredPlanBases(filtered)
  }, [planBases, planBaseSearch, planBaseObjective])

  useEffect(() => {
    if (!selectedPlanBaseForRecipes) return
    const refreshed = planBases.find((plan) => plan.id === selectedPlanBaseForRecipes.id)
    if (
      refreshed &&
      (refreshed.calorias_base !== selectedPlanBaseForRecipes.calorias_base ||
        (refreshed.proteinas_base ?? null) !== (selectedPlanBaseForRecipes.proteinas_base ?? null) ||
        (refreshed.carbohidratos_base ?? null) !== (selectedPlanBaseForRecipes.carbohidratos_base ?? null) ||
        (refreshed.grasas_base ?? null) !== (selectedPlanBaseForRecipes.grasas_base ?? null) ||
        refreshed.dias_plan !== selectedPlanBaseForRecipes.dias_plan)
    ) {
      setSelectedPlanBaseForRecipes(refreshed)
    }
  }, [planBases, selectedPlanBaseForRecipes])

  useEffect(() => {
    let meals = [...suggestedMeals]
    if (filterCategory !== 'todas') {
      meals = meals.filter((meal) => meal.category === filterCategory)
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      meals = meals.filter(
        (meal) =>
          meal.name.toLowerCase().includes(term) ||
          meal.description.toLowerCase().includes(term) ||
          meal.calories.toString().includes(term)
      )
    }
    setFilteredMeals(meals)
  }, [suggestedMeals, filterCategory, searchTerm])

  const resetPlanBaseForm = () => {
    setPlanBaseForm({
      nombre: '',
      descripcion: '',
      objetivo: 'mantener',
      dias_plan: 5,
      calorias_base: DEFAULT_PLAN_CALORIES.toString(),
      proteinas_base: '',
      carbohidratos_base: '',
      grasas_base: '',
    })
  }

  const handleOpenPlanBaseModal = () => {
    setSelectedPlanBase(null)
    resetPlanBaseForm()
    setIsPlanBaseModalOpen(true)
  }

  const handleEditPlanBase = (plan: PlanBase) => {
    setSelectedPlanBase(plan)
    setPlanBaseForm({
      nombre: plan.nombre,
      descripcion: plan.descripcion || '',
      objetivo: plan.objetivo || 'mantener',
      dias_plan: plan.dias_plan || 5,
      calorias_base: plan.calorias_base?.toString() || '',
      proteinas_base: plan.proteinas_base?.toString() || '',
      carbohidratos_base: plan.carbohidratos_base?.toString() || '',
      grasas_base: plan.grasas_base?.toString() || '',
    })
    setIsPlanBaseModalOpen(true)
  }

  const handleDeletePlanBase = async (planId: string) => {
    if (!confirm('¿Eliminar este plan base?')) return
    try {
      await api.deletePlanBase(planId)
      showToast('Plan base eliminado correctamente')
      if (selectedPlanBaseForRecipes?.id === planId) {
        setIsRecipesModalOpen(false)
        setSelectedPlanBaseForRecipes(null)
        resetRecipeForm()
      }
      await loadPlanBases()
    } catch (err: any) {
      console.error('Error deleting plan base:', err)
      showToast(err?.message || 'Error al eliminar el plan base', true)
    }
  }

  const handleSubmitPlanBase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!planBaseForm.nombre.trim()) {
      showToast('El plan base necesita un nombre', true)
      return
    }
    setPlanBaseSaving(true)
    const normalizedDiasPlan =
      WEEKDAY_DURATION_OPTIONS.find((option) => option.value === planBaseForm.dias_plan)?.value || 5
    const payload = {
      nombre: planBaseForm.nombre.trim(),
      descripcion: planBaseForm.descripcion.trim() || null,
      objetivo: planBaseForm.objetivo as PlanBase['objetivo'],
      dias_plan: normalizedDiasPlan,
      calorias_base: planBaseForm.calorias_base ? Number(planBaseForm.calorias_base) : DEFAULT_PLAN_CALORIES,
      proteinas_base: planBaseForm.proteinas_base ? Number(planBaseForm.proteinas_base) : null,
      carbohidratos_base: planBaseForm.carbohidratos_base ? Number(planBaseForm.carbohidratos_base) : null,
      grasas_base: planBaseForm.grasas_base ? Number(planBaseForm.grasas_base) : null,
    }
    try {
      if (selectedPlanBase) {
        await api.updatePlanBase(selectedPlanBase.id, payload)
        showToast('Plan base actualizado correctamente')
      } else {
        await api.createPlanBase(payload)
        showToast('Plan base creado correctamente')
      }
      setIsPlanBaseModalOpen(false)
      setSelectedPlanBase(null)
      await loadPlanBases()
    } catch (err: any) {
      console.error('Error saving plan base:', err)
      showToast(err?.message || 'Error al guardar el plan base', true)
    } finally {
      setPlanBaseSaving(false)
    }
  }

  const resetRecipeForm = () => {
    setRecipeForm({
      nombre: '',
      descripcion: '',
      meal_type: 'lunch',
      calorias_totales: '',
      proteinas_totales: '',
      carbohidratos_totales: '',
      grasas_totales: '',
      porciones: '1',
    })
    setSelectedRecipe(null)
  }

  const loadLibraryRecipes = async () => {
    try {
      setLibraryLoading(true)
      const recetas = await api.getRecipeLibrary()
      setLibraryRecipes(recetas as LibraryRecipeItem[])
    } catch (err) {
      console.error('Error loading recipe library:', err)
      showToast('No se pudo cargar la biblioteca de recetas', true)
      setLibraryRecipes([])
    } finally {
      setLibraryLoading(false)
    }
  }

  const handleOpenLibraryModal = async () => {
    if (!selectedPlanBaseForRecipes) {
      showToast('Selecciona un plan base para asignar recetas', true)
      return
    }
    setIsLibraryModalOpen(true)
    setAssigningLibraryRecipe(null)
    setLibrarySearch('')
    await loadLibraryRecipes()
  }

  const handleAssignLibraryRecipe = async (libraryRecipeId: string) => {
    if (!selectedPlanBaseForRecipes) {
      showToast('Selecciona un plan base para continuar', true)
      return
    }
    try {
      setAssigningLibraryRecipe(libraryRecipeId)
      await api.assignLibraryRecipeToPlan(selectedPlanBaseForRecipes.id, libraryRecipeId)
      showToast('Receta añadida desde la biblioteca')
      await loadPlanBaseRecipes(selectedPlanBaseForRecipes.id)
      setIsLibraryModalOpen(false)
    } catch (err: any) {
      console.error('Error assigning library recipe:', err)
      showToast(err?.message || 'No se pudo añadir la receta', true)
    } finally {
      setAssigningLibraryRecipe(null)
    }
  }

  const loadPlanBaseRecipes = useCallback(
    async (planBaseId: string) => {
      try {
        setRecipesLoading(true)
        const recetas = await api.getPlanBaseRecipes(planBaseId)
        const summary = recetas.length ? summarizePlanBaseRecipes(recetas) : null
        setPlanBaseRecipes(recetas)
        setPlanBaseRecipeSummary(summary)
        if (summary) {
          await syncPlanBaseMetrics(planBaseId, recetas, summary)
        }
      } catch (err) {
        console.error('Error loading recipes:', err)
        showToast('No se pudieron cargar las recetas', true)
        setPlanBaseRecipes([])
        setPlanBaseRecipeSummary(null)
      } finally {
        setRecipesLoading(false)
      }
    },
    [showToast, syncPlanBaseMetrics]
  )

  const handleOpenRecipesModal = async (plan: PlanBase) => {
    setSelectedPlanBaseForRecipes(plan)
    setIsRecipesModalOpen(true)
    resetRecipeForm()
    setPlanBaseRecipeSummary(null)
    await loadPlanBaseRecipes(plan.id)
  }

  const handleEditRecipe = (receta: PlanBaseRecipe) => {
    setSelectedRecipe(receta)
    setRecipeForm({
      nombre: receta.nombre,
      descripcion: receta.descripcion || '',
      meal_type: receta.meal_type,
      calorias_totales: receta.calorias_totales?.toString() || '',
      proteinas_totales: receta.proteinas_totales?.toString() || '',
      carbohidratos_totales: receta.carbohidratos_totales?.toString() || '',
      grasas_totales: receta.grasas_totales?.toString() || '',
      porciones: receta.porciones?.toString() || '1',
    })
  }

  const handleDeleteRecipe = async (recetaId: string) => {
    if (!selectedPlanBaseForRecipes) return
    if (!confirm('¿Eliminar esta receta del plan base?')) return
    try {
      await api.deletePlanBaseRecipe(recetaId)
      showToast('Receta eliminada')
      await loadPlanBaseRecipes(selectedPlanBaseForRecipes.id)
    } catch (err: any) {
      console.error('Error deleting recipe:', err)
      showToast(err?.message || 'Error al eliminar la receta', true)
    }
  }

  const handleSubmitRecipe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlanBaseForRecipes) return
    if (!recipeForm.nombre) {
      showToast('La receta necesita un nombre', true)
      return
    }

    const payload = {
      plan_base_id: selectedPlanBaseForRecipes.id,
      nombre: recipeForm.nombre.trim(),
      descripcion: recipeForm.descripcion.trim() || null,
      meal_type: recipeForm.meal_type,
      calorias_totales: recipeForm.calorias_totales ? Number(recipeForm.calorias_totales) : null,
      proteinas_totales: recipeForm.proteinas_totales ? Number(recipeForm.proteinas_totales) : null,
      carbohidratos_totales: recipeForm.carbohidratos_totales ? Number(recipeForm.carbohidratos_totales) : null,
      grasas_totales: recipeForm.grasas_totales ? Number(recipeForm.grasas_totales) : null,
      porciones: recipeForm.porciones ? Number(recipeForm.porciones) : 1,
    }

    try {
      if (selectedRecipe) {
        await api.updatePlanBaseRecipe(selectedRecipe.id, payload)
        showToast('Receta actualizada')
      } else {
        await api.createPlanBaseRecipe(payload)
        showToast('Receta creada')
      }
      resetRecipeForm()
      await loadPlanBaseRecipes(selectedPlanBaseForRecipes.id)
    } catch (err: any) {
      console.error('Error saving recipe:', err)
      showToast(err?.message || 'Error al guardar la receta', true)
    }
  }

  const handleOpenGenerateModal = () => {
    if (!planBases.length) {
      showToast('Primero crea un plan base', true)
      return
    }
    if (!availableClients.length) {
      showToast('No hay clientes asignados todavía', true)
      return
    }
    setGenerateForm({
      clientId: availableClients[0]?.id || '',
      planBaseId: planBases[0]?.id || '',
      weekStartDate: getNextMonday(),
    })
    setIsGenerateModalOpen(true)
  }

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!generateForm.clientId || !generateForm.planBaseId || !generateForm.weekStartDate) {
      showToast('Selecciona cliente, plan base y fecha de inicio', true)
      return
    }
    try {
      setIsGeneratingPlan(true)
      await api.generateWeeklyPlanForUser({
        user_id: generateForm.clientId,
        plan_base_id: generateForm.planBaseId,
        week_start_date: generateForm.weekStartDate,
      })
      showToast('Plan semanal generado correctamente')
      setIsGenerateModalOpen(false)
    } catch (err: any) {
      console.error('Error generating weekly plan:', err)
      showToast(err?.message || 'Error al generar el plan semanal', true)
    } finally {
      setIsGeneratingPlan(false)
    }
  }

  const handleCreateMeal = () => {
    setSelectedMeal(null)
    setMealFormData({
      name: '',
      calories: '',
      description: '',
      category: 'lunch',
    })
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
    setIsMealModalOpen(true)
  }

  const handleDeleteMeal = async (mealId: string) => {
    if (!confirm('¿Eliminar esta opción sugerida?')) return
    try {
      await api.deleteMeal(mealId)
      showToast('Opción sugerida eliminada')
      await loadSuggestedMeals()
    } catch (err: any) {
      console.error('Error deleting meal:', err)
      showToast(err?.message || 'Error al eliminar la opción sugerida', true)
    }
  }

  const handleSubmitMeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mealFormData.name || !mealFormData.calories || !mealFormData.description) {
      showToast('Completa todos los campos de la comida', true)
      return
    }
    try {
      if (selectedMeal) {
        await api.updateMeal(selectedMeal.id, {
          name: mealFormData.name,
          description: mealFormData.description,
          calories: Number(mealFormData.calories),
          type: mealFormData.category,
          available: true,
          is_menu_item: false,
        })
        showToast('Opción sugerida actualizada')
      } else {
        await api.createMeal({
          name: mealFormData.name,
          description: mealFormData.description,
          calories: Number(mealFormData.calories),
          type: mealFormData.category,
          available: true,
          is_menu_item: false,
        })
        showToast('Opción sugerida creada')
      }
      setIsMealModalOpen(false)
      setSelectedMeal(null)
      await loadSuggestedMeals()
    } catch (err: any) {
      console.error('Error saving meal:', err)
      showToast(err?.message || 'Error al guardar la opción sugerida', true)
    }
  }

  const getCategoryLabel = (category: SuggestedMeal['category']) =>
    category === 'lunch' ? 'Almuerzo' : 'Cena'

  const plusIcon = (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
        clipRule="evenodd"
      />
    </svg>
  )

  const filteredLibraryRecipes = useMemo(() => {
    let data = [...libraryRecipes]
    if (libraryMealFilter !== 'all') {
      data = data.filter((recipe) => recipe.meal_type === libraryMealFilter)
    }
    if (librarySearch) {
      const term = librarySearch.toLowerCase()
      data = data.filter(
        (recipe) =>
          recipe.nombre.toLowerCase().includes(term) ||
          (recipe.descripcion && recipe.descripcion.toLowerCase().includes(term))
      )
    }
    return data
  }, [libraryMealFilter, libraryRecipes, librarySearch])

  const planBaseResultsCount = useMemo(() => {
    if (planBaseSearch || planBaseObjective !== 'todos') {
      return { showing: filteredPlanBases.length, total: planBases.length }
    }
    return undefined
  }, [filteredPlanBases.length, planBases.length, planBaseObjective, planBaseSearch])

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Planes nutricionales"
        description="Construye planes base y opciones sugeridas para automatizar la planificación semanal."
      />

      {error && <ToastMessage type="error" message={error} />}
      {success && <ToastMessage type="success" message={success} />}

      <div className="border border-gray-200 rounded-full inline-flex p-1 bg-white w-fit">
        {(['plans', 'suggestions'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition ${
              activeTab === tab ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:text-primary'
            }`}
          >
            {tab === 'plans' ? 'Planes base' : 'Opciones sugeridas'}
          </button>
        ))}
      </div>

      {activeTab === 'plans' && (
        <>
          <div className="flex flex-wrap justify-end gap-2">
            <ActionButton onClick={handleOpenGenerateModal} icon={plusIcon}>
              Generar plan semanal
            </ActionButton>
            <ActionButton onClick={handleOpenPlanBaseModal} icon={plusIcon}>
              Nuevo plan base
            </ActionButton>
          </div>

          {planBasesLoading ? (
            <LoadingState message="Cargando planes base..." />
          ) : planBases.length === 0 ? (
            <EmptyState
              title="Aún no tienes planes base"
              message="Crea un plan base para poder asignarlo y generar planes automáticos."
              action={
                <ActionButton onClick={handleOpenPlanBaseModal} icon={plusIcon}>
                  Crear plan base
                </ActionButton>
              }
            />
          ) : (
            <>
              <SearchFilters
                searchTerm={planBaseSearch}
                onSearchChange={setPlanBaseSearch}
                searchPlaceholder="Buscar por nombre, objetivo o descripción..."
                filters={
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Objetivo</label>
                    <select
                      value={planBaseObjective ?? 'todos'}
                      onChange={(e) =>
                        setPlanBaseObjective(
                          e.target.value === 'todos' ? 'todos' : (e.target.value as PlanBase['objetivo'])
                        )
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    >
                      <option value="todos">Todos</option>
                      {Object.entries(PLAN_OBJECTIVE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                }
                resultsCount={planBaseResultsCount}
              />

              {filteredPlanBases.length === 0 ? (
                <EmptyState
                  title="No se encontraron planes base"
                  message="Prueba con otro término o limpia los filtros aplicados."
                />
              ) : (
                <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }} gap="md">
                  {filteredPlanBases.map((plan) => (
                    <article
                      key={plan.id}
                      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{plan.nombre}</h3>
                          <p className="text-sm text-primary mt-1">
                            {plan.objetivo ? PLAN_OBJECTIVE_LABELS[plan.objetivo] : 'Objetivo personalizado'}
                          </p>
                          {plan.descripcion && (
                            <p className="mt-2 text-xs text-gray-600 line-clamp-3">{plan.descripcion}</p>
                          )}
                        </div>
                      </div>
                      <ul className="mt-4 space-y-1 text-xs text-gray-500">
                        <li>Duración: {formatPlanDurationLabel(plan.dias_plan || 5)}</li>
                        <li>Calorías base estimadas: {plan.calorias_base} kcal</li>
                        <li>
                          Macronutrientes:{' '}
                          {[plan.proteinas_base && `${plan.proteinas_base}g P`, plan.carbohidratos_base && `${plan.carbohidratos_base}g C`, plan.grasas_base && `${plan.grasas_base}g G`]
                            .filter(Boolean)
                            .join(' · ') || 'Pendiente'}
                        </li>
                        {plan.updated_at && (
                          <li>
                            Última edición:{' '}
                            {new Date(plan.updated_at).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </li>
                        )}
                      </ul>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <button
                          onClick={() => handleOpenRecipesModal(plan)}
                          className="flex-1 rounded-full border border-primary/60 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition"
                        >
                          Gestionar recetas
                        </button>
                        <button
                          onClick={() => handleEditPlanBase(plan)}
                          className="flex-1 rounded-full border border-primary px-4 py-2 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeletePlanBase(plan.id)}
                          className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:border-red-400 hover:text-red-500 transition"
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
        </>
      )}

      {activeTab === 'suggestions' && (
        <>
          <div className="flex justify-end">
            <ActionButton onClick={handleCreateMeal} icon={plusIcon}>
              Agregar opción sugerida
            </ActionButton>
          </div>

          {suggestedMeals.length === 0 ? (
            <EmptyState
              title="No hay opciones sugeridas"
              message="Agrega comidas específicas para planes nutricionales."
              action={
                <ActionButton onClick={handleCreateMeal} icon={plusIcon}>
                  Agregar primera opción
                </ActionButton>
              }
            />
          ) : (
            <>
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
                      <option value="lunch">Almuerzo</option>
                      <option value="dinner">Cena</option>
                    </select>
                  </div>
                }
                resultsCount={
                  searchTerm || filterCategory !== 'todas'
                    ? { showing: filteredMeals.length, total: suggestedMeals.length }
                    : undefined
                }
              />

              {filteredMeals.length === 0 ? (
                <EmptyState title="No se encontraron comidas" message="Ajusta los filtros o la búsqueda." />
              ) : (
                <div className="space-y-6">
                  {(['lunch', 'dinner'] as const).map((category) => {
                    const categoryMeals = filteredMeals.filter((meal) => meal.category === category)
                    if (!categoryMeals.length) return null
                    return (
                      <section key={category}>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                          {getCategoryLabel(category)}
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
                                  className="flex-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-red-400 hover:text-red-500 transition"
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
        </>
      )}

      <Modal
        isOpen={isPlanBaseModalOpen}
        onClose={() => {
          setIsPlanBaseModalOpen(false)
          setSelectedPlanBase(null)
        }}
        title={selectedPlanBase ? 'Editar plan base' : 'Crear plan base'}
        size="lg"
      >
        <form onSubmit={handleSubmitPlanBase} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Nombre</label>
              <input
                type="text"
                value={planBaseForm.nombre}
                onChange={(e) => setPlanBaseForm((prev) => ({ ...prev, nombre: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Objetivo</label>
              <select
                value={planBaseForm.objetivo}
                onChange={(e) => setPlanBaseForm((prev) => ({ ...prev, objetivo: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                {Object.entries(PLAN_OBJECTIVE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Duración (lunes a viernes)</label>
              <select
                value={planBaseForm.dias_plan}
                onChange={(e) =>
                  setPlanBaseForm((prev) => ({ ...prev, dias_plan: Number(e.target.value) || 5 }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                {WEEKDAY_DURATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Se excluyen automáticamente los fines de semana.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Calorías base</label>
              <input
                type="number"
                min={800}
                value={planBaseForm.calorias_base}
                readOnly
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Este valor se recalcula automáticamente según las recetas asignadas al plan.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Proteínas (g)</label>
              <input
                type="number"
                min={0}
                value={planBaseForm.proteinas_base}
                readOnly
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-600 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Carbohidratos (g)</label>
              <input
                type="number"
                min={0}
                value={planBaseForm.carbohidratos_base}
                readOnly
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-600 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Grasas (g)</label>
              <input
                type="number"
                min={0}
                value={planBaseForm.grasas_base}
                readOnly
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-600 cursor-not-allowed"
              />
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Los macronutrientes se actualizan automáticamente cuando agregas, editas o eliminas recetas del plan base.
          </p>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Descripción</label>
            <textarea
              rows={4}
              value={planBaseForm.descripcion}
              onChange={(e) => setPlanBaseForm((prev) => ({ ...prev, descripcion: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Notas sobre este plan base, foco nutricional, restricciones, etc."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsPlanBaseModalOpen(false)
                setSelectedPlanBase(null)
              }}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={planBaseSaving}
              className="flex-1 bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary/90 transition disabled:opacity-50"
            >
              {planBaseSaving ? 'Guardando...' : 'Guardar plan base'}
            </button>
          </div>
        </form>
      </Modal>

  <Modal
    isOpen={isRecipesModalOpen}
    onClose={() => {
      setIsRecipesModalOpen(false)
      setSelectedPlanBaseForRecipes(null)
      setPlanBaseRecipeSummary(null)
      resetRecipeForm()
    }}
    title={
      selectedPlanBaseForRecipes
        ? `Recetas de ${selectedPlanBaseForRecipes.nombre}`
        : 'Recetas del plan base'
    }
    size="xl"
  >
    {!selectedPlanBaseForRecipes ? (
      <p className="text-sm text-gray-500">Selecciona un plan base para ver sus recetas.</p>
    ) : (
      <div className="space-y-6">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleOpenLibraryModal}
            className="rounded-full border border-primary px-4 py-2 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition"
          >
            Agregar desde biblioteca
          </button>
        </div>
        {recipesLoading ? (
          <LoadingState message="Cargando recetas..." />
        ) : planBaseRecipes.length === 0 ? (
          <EmptyState
            title="Aún no hay recetas asociadas"
            message="Agrega al menos una receta de almuerzo o cena para este plan base."
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={resetRecipeForm}
                  className="flex-1 rounded-full border border-primary px-4 py-2 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition"
                >
                  Crear la primera receta
                </button>
                <button
                  type="button"
                  onClick={handleOpenLibraryModal}
                  className="flex-1 rounded-full border border-primary/60 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition"
                >
                  Elegir de la biblioteca
                </button>
              </div>
            }
          />
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-700">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="font-semibold text-gray-900">Promedio diario estimado</p>
                {isSyncingPlanTotals && <span className="text-xs text-primary">Sincronizando totales…</span>}
              </div>
              {planBaseRecipeSummary ? (
                <>
                  <p className="mt-2 text-sm text-gray-800">
                    {Math.round(planBaseRecipeSummary.daily.calories || 0)} kcal ·{' '}
                    {planBaseRecipeSummary.daily.protein.toFixed(1)} g P ·{' '}
                    {planBaseRecipeSummary.daily.carbs.toFixed(1)} g C ·{' '}
                    {planBaseRecipeSummary.daily.fat.toFixed(1)} g G
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {planBaseRecipeSummary.lunch.count} recetas de almuerzo · {planBaseRecipeSummary.dinner.count} recetas de cena
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs text-gray-500">
                  Agrega al menos una receta de almuerzo y una de cena para calcular automáticamente las calorías y macros del plan.
                </p>
              )}
            </div>
            {(['lunch', 'dinner'] as const).map((type) => {
              const recipesByType = planBaseRecipes.filter((receta) => receta.meal_type === type)
              if (!recipesByType.length) return null
              return (
                <section key={type} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-1 h-5 rounded ${type === 'lunch' ? 'bg-orange-500' : 'bg-indigo-500'}`} />
                    <h4 className="text-sm font-semibold text-gray-900">
                      {getCategoryLabel(type)}
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {recipesByType.map((receta) => (
                      <div
                        key={receta.id}
                        className="rounded-xl border border-gray-200 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{receta.nombre}</p>
                          {receta.descripcion && (
                            <p className="text-xs text-gray-500 mt-1">{receta.descripcion}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {receta.calorias_totales ?? '—'} kcal ·{' '}
                            {receta.proteinas_totales ?? '—'}g P ·{' '}
                            {receta.carbohidratos_totales ?? '—'}g C ·{' '}
                            {receta.grasas_totales ?? '—'}g G ·{' '}
                            {receta.porciones ?? 1} porciones
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditRecipe(receta)}
                            className="rounded-full border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecipe(receta.id)}
                            className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-red-400 hover:text-red-500 transition"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}

        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900">
              {selectedRecipe ? 'Editar receta' : 'Nueva receta'}
            </h4>
            {selectedRecipe && (
              <button
                type="button"
                onClick={resetRecipeForm}
                className="text-xs text-primary hover:underline"
              >
                + Crear nueva
              </button>
            )}
          </div>
          <form onSubmit={handleSubmitRecipe} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Nombre</label>
                <input
                  type="text"
                  value={recipeForm.nombre}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo de comida</label>
                <select
                  value={recipeForm.meal_type}
                  onChange={(e) =>
                    setRecipeForm((prev) => ({ ...prev, meal_type: e.target.value as 'lunch' | 'dinner' }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="lunch">Almuerzo</option>
                  <option value="dinner">Cena</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Descripción</label>
              <textarea
                rows={3}
                value={recipeForm.descripcion}
                onChange={(e) => setRecipeForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Notas o instrucciones internas para cocina"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {[
                { field: 'calorias_totales', label: 'Calorías (kcal)' },
                { field: 'proteinas_totales', label: 'Proteínas (g)' },
                { field: 'carbohidratos_totales', label: 'Carbohidratos (g)' },
                { field: 'grasas_totales', label: 'Grasas (g)' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
                  <input
                    type="number"
                    min={0}
                    value={(recipeForm as any)[field]}
                    onChange={(e) =>
                      setRecipeForm((prev) => ({
                        ...prev,
                        [field]: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Porciones</label>
                <input
                  type="number"
                  min={1}
                  value={recipeForm.porciones}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, porciones: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRecipesModalOpen(false)
                  setSelectedPlanBaseForRecipes(null)
                  resetRecipeForm()
                }}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-50 transition"
              >
                Cerrar
              </button>
              <button
                type="submit"
                className="flex-1 bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary/90 transition"
              >
                {selectedRecipe ? 'Actualizar receta' : 'Guardar receta'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </Modal>

  <Modal
    isOpen={isLibraryModalOpen}
    onClose={() => {
      setIsLibraryModalOpen(false)
      setAssigningLibraryRecipe(null)
      setLibrarySearch('')
    }}
    title="Agregar receta desde la biblioteca"
    size="lg"
  >
    {libraryLoading ? (
      <LoadingState message="Cargando biblioteca..." />
    ) : (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Buscar</label>
            <input
              type="text"
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Nombre o descripción"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo</label>
            <select
              value={libraryMealFilter}
              onChange={(e) => setLibraryMealFilter(e.target.value as 'all' | 'lunch' | 'dinner')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="all">Todos</option>
              <option value="lunch">Almuerzo</option>
              <option value="dinner">Cena</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={loadLibraryRecipes}
            className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            Actualizar lista
          </button>
        </div>
        {libraryRecipes.length === 0 ? (
          <EmptyState
            title="La biblioteca está vacía"
            message="Crea comidas base desde la sección Administración → Comidas para planes."
          />
        ) : filteredLibraryRecipes.length === 0 ? (
          <EmptyState title="Sin coincidencias" message="Prueba con otro término o tipo de comida." />
        ) : (
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {filteredLibraryRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className="rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition"
              >
                <div className="flex justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{recipe.nombre}</h4>
                    <p className="text-xs text-gray-500">{mealTypeLabels[recipe.meal_type]}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500 space-y-0.5">
                    {recipe.calorias_totales != null && <p>🔥 {recipe.calorias_totales} kcal</p>}
                    {recipe.proteinas_totales != null && <p>💪 {recipe.proteinas_totales} g P</p>}
                  </div>
                </div>
                {recipe.descripcion && (
                  <p className="text-xs text-gray-600 mt-2 line-clamp-2">{recipe.descripcion}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Ingredientes registrados: {recipe.recetas_ingredientes?.length || 0}
                </p>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleAssignLibraryRecipe(recipe.id)}
                    disabled={assigningLibraryRecipe === recipe.id}
                    className="rounded-full border border-primary px-4 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition disabled:opacity-50"
                  >
                    {assigningLibraryRecipe === recipe.id ? 'Añadiendo...' : 'Añadir al plan'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </Modal>

      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        title="Generar plan semanal automático"
        size="md"
      >
        {availableClients.length === 0 || planBases.length === 0 ? (
          <div className="space-y-4 text-sm text-gray-600">
            <p>Necesitas al menos un cliente y un plan base activo para generar un plan.</p>
            <ul className="list-disc pl-5 text-xs text-gray-500 space-y-1">
              <li>Asigna clientes desde la sección “Clientes”.</li>
              <li>Crea planes base desde la pestaña actual.</li>
            </ul>
          </div>
        ) : (
          <form onSubmit={handleGeneratePlan} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <select
                value={generateForm.clientId}
                onChange={(e) => setGenerateForm((prev) => ({ ...prev, clientId: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              >
                {availableClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan base</label>
              <select
                value={generateForm.planBaseId}
                onChange={(e) => setGenerateForm((prev) => ({ ...prev, planBaseId: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              >
                {planBases.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                  {plan.nombre} · {plan.calorias_base} kcal · {formatPlanDurationLabel(plan.dias_plan || 5)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semana (fecha inicio)</label>
              <input
                type="date"
                value={generateForm.weekStartDate}
                onChange={(e) => setGenerateForm((prev) => ({ ...prev, weekStartDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              />
              <p className="mt-1 text-xs text-gray-500">Se generará un bloque de 5 días (lunes a viernes).</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(false)}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isGeneratingPlan}
                className="flex-1 bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary/90 transition disabled:opacity-50"
              >
                {isGeneratingPlan ? 'Generando...' : 'Generar plan'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={isMealModalOpen}
        onClose={() => {
          setIsMealModalOpen(false)
          setSelectedMeal(null)
        }}
        title={selectedMeal ? 'Editar opción sugerida' : 'Agregar opción sugerida'}
        size="md"
      >
        <form onSubmit={handleSubmitMeal} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Nombre</label>
            <input
              type="text"
              value={mealFormData.name}
              onChange={(e) => setMealFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Calorías</label>
            <input
              type="number"
              min={0}
              value={mealFormData.calories}
              onChange={(e) => setMealFormData((prev) => ({ ...prev, calories: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Descripción</label>
            <textarea
              rows={3}
              value={mealFormData.description}
              onChange={(e) => setMealFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Categoría</label>
            <select
              value={mealFormData.category}
              onChange={(e) =>
                setMealFormData((prev) => ({ ...prev, category: e.target.value as SuggestedMeal['category'] }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="lunch">Almuerzo</option>
              <option value="dinner">Cena</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsMealModalOpen(false)
                setSelectedMeal(null)
              }}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary/90 transition"
            >
              Guardar opción
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

