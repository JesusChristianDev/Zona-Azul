"use client"

import { useState, useEffect } from 'react'
import Modal from '../../../components/ui/Modal'
import { mockMealPlan, MealPlanDay } from '../../../lib/mockPlan'
import { useAuth } from '../../../hooks/useAuth'
import { getUserData, setUserData } from '../../../lib/storage'

interface SuggestedMeal {
  id: string
  name: string
  calories: number
  description: string
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack'
}

// Opciones por defecto (fallback)
const defaultSuggestedMeals: SuggestedMeal[] = [
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

// Verificar si es Viernes, Sábado o Domingo
const canModifyPlan = (): boolean => {
  const day = new Date().getDay() // 0 = Domingo, 5 = Viernes, 6 = Sábado
  return day === 0 || day === 5 || day === 6
}

export default function SuscriptorPlanPage() {
  const { userId } = useAuth()
  const [planDays, setPlanDays] = useState<MealPlanDay[]>([])
  const [suggestedMeals, setSuggestedMeals] = useState<SuggestedMeal[]>(defaultSuggestedMeals)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<MealPlanDay | null>(null)
  const [selectedMealIndex, setSelectedMealIndex] = useState<number>(-1)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [canModify, setCanModify] = useState(false)

  useEffect(() => {
    setCanModify(canModifyPlan())

    // Cargar plan desde localStorage personalizado por usuario
    const loadPlan = () => {
      if (!userId) return
      
      const plan = getUserData('zona_azul_suscriptor_plan', userId, null)
      if (plan && plan.days && plan.days.length > 0) {
        setPlanDays(plan.days)
      } else {
        // Si no hay plan, no asignar uno por defecto
        // El usuario debe esperar a que el nutricionista le asigne un plan
        setPlanDays([])
      }
    }

    // Cargar opciones sugeridas
    const loadSuggestedMeals = () => {
      const storedMeals = localStorage.getItem('zona_azul_suggested_meals')
      if (storedMeals) {
        try {
          const meals = JSON.parse(storedMeals)
          setSuggestedMeals(meals)
        } catch (error) {
          console.error('Error loading suggested meals:', error)
          setSuggestedMeals(defaultSuggestedMeals)
        }
      } else {
        setSuggestedMeals(defaultSuggestedMeals)
      }
    }

    // Cargar datos iniciales solo si hay userId
    if (userId) {
      loadPlan()
    }
    loadSuggestedMeals()

    // Escuchar actualizaciones del plan desde el nutricionista
    const handlePlanUpdate = () => {
      if (userId) {
        loadPlan()
      }
    }

    // Escuchar actualizaciones de opciones sugeridas
    const handleMealsUpdate = () => {
      loadSuggestedMeals()
    }

    window.addEventListener('zona_azul_plan_updated', handlePlanUpdate)
    window.addEventListener('zona_azul_suggested_meals_updated', handleMealsUpdate)

    // Polling menos frecuente solo como fallback (cada 10 segundos)
    const interval = setInterval(() => {
      if (userId) {
        loadPlan()
      }
      loadSuggestedMeals()
    }, 10000)

    return () => {
      window.removeEventListener('zona_azul_plan_updated', handlePlanUpdate)
      window.removeEventListener('zona_azul_suggested_meals_updated', handleMealsUpdate)
      clearInterval(interval)
    }
  }, [userId]) // Depende de userId para recargar cuando cambie

  const showToast = (message: string, isError = false) => {
    if (isError) {
      setError(message)
      setTimeout(() => setError(null), 5000)
    } else {
      setSuccess(message)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const handleReplaceMeal = (day: MealPlanDay, mealIndex: number) => {
    if (!canModify) {
      showToast('Solo puedes modificar tu plan de Viernes a Domingo', true)
      return
    }
    setSelectedDay(day)
    setSelectedMealIndex(mealIndex)
    setIsEditModalOpen(true)
  }

  const handleConfirmReplacement = (newMeal: SuggestedMeal) => {
    if (!selectedDay || selectedMealIndex === -1) return

    const updatedDays = planDays.map((day) => {
      if (day.day === selectedDay.day) {
        const updatedMeals = [...day.meals]
        updatedMeals[selectedMealIndex] = {
          name: newMeal.name,
          calories: newMeal.calories,
          description: newMeal.description,
        }
        const newTotalCalories = updatedMeals.reduce((sum, meal) => sum + meal.calories, 0)
        return {
          ...day,
          meals: updatedMeals,
          totalCalories: newTotalCalories,
        }
      }
      return day
    })

    setPlanDays(updatedDays)

    // Guardar en localStorage personalizado por usuario
    if (userId) {
      const storedPlan = getUserData('zona_azul_suscriptor_plan', userId, null)
      if (storedPlan) {
        storedPlan.days = updatedDays
        setUserData('zona_azul_suscriptor_plan', storedPlan, userId)
        window.dispatchEvent(new Event('zona_azul_plan_updated'))
      }
    }

    setIsEditModalOpen(false)
    setSelectedDay(null)
    setSelectedMealIndex(-1)
    showToast('Plato reemplazado correctamente')
  }

  if (planDays.length === 0) {
    return (
      <div className="space-y-6">
        <header className="rounded-2xl border border-primary/20 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">Plan semanal personalizado</h2>
          <p className="mt-2 text-sm text-gray-600">
            No tienes un plan asignado aún. Contacta con tu nutricionista para que te asigne un plan
            personalizado.
          </p>
        </header>
      </div>
    )
  }

  const currentMeal = selectedDay && selectedMealIndex !== -1 ? selectedDay.meals[selectedMealIndex] : null
  
  // Detectar categoría del plato actual basándose en el nombre (heurística simple)
  const detectMealCategory = (mealName: string): SuggestedMeal['category'] | null => {
    const name = mealName.toLowerCase()
    if (name.includes('snack')) return 'snack'
    if (name.includes('smoothie') || name.includes('avena') || name.includes('tostadas') || name.includes('overnight') || name.includes('panqueques')) return 'breakfast'
    if (name.includes('pollo') || name.includes('wrap') || name.includes('poke') || name.includes('ensalada') || name.includes('bowl mediterráneo')) return 'lunch'
    if (name.includes('salmón') || name.includes('pescado') || name.includes('crema') || name.includes('tacos') || name.includes('bowl vitalidad')) return 'dinner'
    return null
  }

  const currentMealCategory = currentMeal ? detectMealCategory(currentMeal.name) : null

  // Filtrar opciones: misma categoría y calorías similares (±100 kcal)
  const availableSuggestions = currentMeal
    ? suggestedMeals.filter((meal) => {
        const caloriesMatch = meal.calories <= (currentMeal.calories + 100) && meal.calories >= (currentMeal.calories - 100)
        const categoryMatch = currentMealCategory ? meal.category === currentMealCategory : true
        return caloriesMatch && categoryMatch
      })
    : suggestedMeals

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
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-primary/10 px-3 py-1 rounded-full">
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">📅 Plan de Suscripción</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Plan semanal personalizado</h2>
        <p className="mt-2 text-sm text-gray-600">
          Plan semanal con el que trabajaremos esta semana. Puedes modificar platos de Viernes a Domingo para ajustar la semana siguiente.
        </p>
        {canModify ? (
          <p className="mt-3 text-xs text-primary font-medium">
            ✓ Puedes modificar tu plan ahora (Viernes a Domingo)
          </p>
        ) : (
          <p className="mt-3 text-xs text-gray-500">
            Modificación disponible de Viernes a Domingo para ajustar la semana siguiente.
          </p>
        )}
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {planDays.map((day) => (
          <article key={day.day} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">{day.day}</h3>
            <p className="mt-1 text-sm text-primary font-medium">
              Objetivo calórico: {day.totalCalories.toLocaleString()} kcal
            </p>
            <ul className="mt-4 space-y-3 text-sm text-gray-600">
              {day.meals.map((meal, index) => (
                <li key={`${meal.name}-${index}`} className="rounded-xl bg-slate-50 p-3 border border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-800">{meal.name}</span>
                    <span className="text-xs text-primary font-medium">{meal.calories} kcal</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{meal.description}</p>
                  {canModify && (
                    <button
                      onClick={() => handleReplaceMeal(day, index)}
                      className="mt-2 text-xs text-primary hover:underline font-medium"
                      type="button"
                    >
                      Cambiar por otra opción →
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      {/* Modal Reemplazar Plato */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedDay(null)
          setSelectedMealIndex(-1)
        }}
        title={`Reemplazar: ${currentMeal?.name}`}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Opciones sugeridas (calorías similares):
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availableSuggestions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No hay opciones disponibles en este momento.
                </p>
              ) : (
                availableSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id || suggestion.name}
                    onClick={() => handleConfirmReplacement(suggestion)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{suggestion.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{suggestion.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-primary">{suggestion.calories} kcal</p>
                        <p className="text-xs text-gray-400 capitalize">{suggestion.category}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
