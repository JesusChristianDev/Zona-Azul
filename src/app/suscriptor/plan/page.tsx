"use client"

import { useState, useEffect } from 'react'
import Modal from '../../../components/ui/Modal'
import { MealPlanDay } from '../../../lib/types'
import { useAuth } from '../../../hooks/useAuth'
import { getPlan, getMeals, replaceMealInPlanDay } from '../../../lib/api'

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

// Verificar si se puede modificar el plan
// El sábado se actualiza el menú de la semana siguiente
// Se puede modificar SOLO sábado y domingo de la misma semana
// Lunes a viernes NO se puede modificar
// Una vez que es sábado de nuevo, se actualiza el plan y el ciclo se repite
const canModifyPlan = (): boolean => {
  const day = new Date().getDay() // 0 = Domingo, 1 = Lunes, ..., 5 = Viernes, 6 = Sábado
  // Solo se puede modificar sábado (6) y domingo (0)
  return day === 6 || day === 0
}

export default function SuscriptorPlanPage() {
  const { userId } = useAuth()
  const [planDays, setPlanDays] = useState<MealPlanDay[]>([])
  const [planId, setPlanId] = useState<string | null>(null)
  const [suggestedMeals, setSuggestedMeals] = useState<SuggestedMeal[]>(defaultSuggestedMeals)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<MealPlanDay | null>(null)
  const [selectedMealIndex, setSelectedMealIndex] = useState<number>(-1)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [canModify, setCanModify] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (!userId) return

      setCanModify(canModifyPlan())

      try {
        // Cargar plan desde API
        const apiPlan = await getPlan()
        
        if (apiPlan && apiPlan.days && apiPlan.days.length > 0) {
          setPlanDays(apiPlan.days)
          setPlanId(apiPlan.id)
        } else {
          setPlanDays([])
          setPlanId(null)
        }

        // Cargar comidas disponibles desde API para sugerencias
        const meals = await getMeals()
        if (meals && meals.length > 0) {
          // Convertir meals de API a formato SuggestedMeal
          const suggested: SuggestedMeal[] = meals
            .filter((m: any) => m.available)
            .map((m: any) => ({
              id: m.id || `meal-${m.name}`,
              name: m.name,
              calories: m.calories,
              description: m.description || '',
              category: m.type || 'lunch',
            }))
          setSuggestedMeals(suggested.length > 0 ? suggested : defaultSuggestedMeals)
        } else {
          setSuggestedMeals(defaultSuggestedMeals)
        }
      } catch (error) {
        console.error('Error loading plan data:', error)
        setPlanDays([])
        setSuggestedMeals(defaultSuggestedMeals)
      }
    }

    loadData()

    // Polling cada 30 segundos para actualizar
    const interval = setInterval(loadData, 30000)

    return () => {
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

  const handleReplaceMeal = (day: MealPlanDay, mealIndex: number) => {
    if (!canModify) {
      showToast('Solo puedes modificar tu plan sábado y domingo. Lunes a viernes no se puede modificar.', true)
      return
    }
    setSelectedDay(day)
    setSelectedMealIndex(mealIndex)
    setIsEditModalOpen(true)
  }

  const handleConfirmReplacement = async (newMeal: SuggestedMeal) => {
    if (!selectedDay || selectedMealIndex === -1 || !planId || !selectedDay.id) {
      showToast('Error: Faltan datos para reemplazar la comida', true)
      return
    }

    const oldMeal = selectedDay.meals[selectedMealIndex]
    if (!oldMeal || !oldMeal.id) {
      showToast('Error: No se pudo identificar la comida a reemplazar', true)
      return
    }

    try {
      // Reemplazar la comida en la base de datos
      const success = await replaceMealInPlanDay(
        planId,
        selectedDay.id,
        oldMeal.id,
        newMeal.id,
        selectedMealIndex + 1 // order_index es 1-based
      )

      if (!success) {
        showToast('Error al reemplazar la comida en el plan', true)
        return
      }

      // Actualizar estado local
      const updatedDays = planDays.map((day) => {
        if (day.day === selectedDay.day) {
          const updatedMeals = [...day.meals]
          updatedMeals[selectedMealIndex] = {
            ...updatedMeals[selectedMealIndex],
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
      setIsEditModalOpen(false)
      setSelectedDay(null)
      setSelectedMealIndex(-1)
      showToast('Plato reemplazado correctamente')
    } catch (error) {
      console.error('Error replacing meal:', error)
      showToast('Error al reemplazar la comida. Por favor, intenta de nuevo.', true)
    }
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
          Plan semanal de <strong>lunes a viernes</strong>. El sábado se actualiza el menú de la semana siguiente. Puedes revisar y modificar platos <strong>solo sábado y domingo</strong>. Lunes a viernes no se puede modificar. Una vez que sea sábado de nuevo, se actualiza el plan y el ciclo se repite.
        </p>
        {canModify ? (
          <p className="mt-3 text-xs text-primary font-medium">
            ✓ Puedes modificar tu plan ahora (sábado o domingo)
          </p>
        ) : (
          <p className="mt-3 text-xs text-gray-500">
            Modificación disponible solo sábado y domingo. Lunes a viernes no se puede modificar.
          </p>
        )}
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {planDays.length > 0 ? (
          planDays.map((day) => {
            const meals = day.meals || []
            return (
              <article key={day.day} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900">{day.day}</h3>
                <p className="mt-1 text-sm text-primary font-medium">
                  Objetivo calórico: {(day.totalCalories || 0).toLocaleString()} kcal
                </p>
                {meals.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-500 italic">
                    No hay comidas asignadas para este día aún.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3 text-sm text-gray-600">
                    {meals.map((meal, index) => (
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
                )}
              </article>
            )
          })
        ) : (
          <div className="col-span-2 p-8 text-center text-gray-500">
            <p>Cargando plan...</p>
          </div>
        )}
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
