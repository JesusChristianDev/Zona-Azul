'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import type { MealPlanDay, WeeklyMenu, MenuModification, Meal } from '@/lib/types'
import { getPlan, getMeals, replaceMealInPlanDay } from '@/lib/api'

interface SuggestedMeal {
  id: string
  name: string
  calories: number
  description: string
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack'
}

// Verificar si se puede modificar el plan directamente
// El sábado se actualiza el menú de la semana siguiente
// Se puede modificar SOLO sábado y domingo de la misma semana
const canModifyPlan = (): boolean => {
  const day = new Date().getDay() // 0 = Domingo, 1 = Lunes, ..., 5 = Viernes, 6 = Sábado
  return day === 6 || day === 0
}

export default function PlanComidasPage() {
  const { userId } = useAuth()
  const [planDays, setPlanDays] = useState<MealPlanDay[]>([])
  const [planId, setPlanId] = useState<string | null>(null)
  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenu | null>(null)
  const [modifications, setModifications] = useState<MenuModification[]>([])
  const [availableMeals, setAvailableMeals] = useState<Meal[]>([])
  const [suggestedMeals, setSuggestedMeals] = useState<SuggestedMeal[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isModifyModalOpen, setIsModifyModalOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<any>(null)
  const [selectedMealIndex, setSelectedMealIndex] = useState<number>(-1)
  const [selectedMeal, setSelectedMeal] = useState<any>(null)
  const [selectedReplacement, setSelectedReplacement] = useState<string>('')
  const [modificationType, setModificationType] = useState<'plan' | 'menu'>('plan')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [canModify, setCanModify] = useState(false)

  useEffect(() => {
    if (userId) {
      loadData()
      const interval = setInterval(loadData, 30000) // Polling cada 30 segundos
      return () => clearInterval(interval)
    }
  }, [userId])

  const loadData = async () => {
    if (!userId) return

    setCanModify(canModifyPlan())

    try {
      // Cargar plan nutricional
      const apiPlan = await getPlan(userId)
      if (apiPlan && apiPlan.days && apiPlan.days.length > 0) {
        setPlanDays(apiPlan.days)
        setPlanId(apiPlan.id)
      } else {
        setPlanDays([])
        setPlanId(null)
      }

      // Cargar menú semanal
      const today = new Date()
      const monday = new Date(today)
      monday.setDate(today.getDate() - today.getDay() + 1)
      const weekStart = monday.toISOString().split('T')[0]

      const menuResponse = await fetch(`/api/weekly-menus?user_id=${userId}`)
      if (menuResponse.ok) {
        const menuData = await menuResponse.json()
        // Buscar el menú de la semana actual o más reciente
        const currentMenu = menuData.find((m: WeeklyMenu) => {
          const menuStart = new Date(m.week_start_date)
          const menuEnd = new Date(m.week_end_date)
          return today >= menuStart && today <= menuEnd
        }) || menuData[0] // Si no hay de esta semana, tomar el más reciente

        if (currentMenu) {
          const menuDetailResponse = await fetch(`/api/weekly-menus/${currentMenu.id}`)
          if (menuDetailResponse.ok) {
            const menuDetail = await menuDetailResponse.json()
            setWeeklyMenu(menuDetail)
            
            // Cargar modificaciones pendientes después de obtener el menú
            const modResponse = await fetch(`/api/menu-modifications?weekly_menu_id=${menuDetail.id}&user_id=${userId}`)
            if (modResponse.ok) {
              setModifications(await modResponse.json())
            }
          }
        }
      }

      // Cargar comidas disponibles
      const meals = await getMeals()
      if (meals && meals.length > 0) {
        setAvailableMeals(meals.filter((m: any) => m.available))
        const suggested: SuggestedMeal[] = meals
          .filter((m: any) => m.available)
          .map((m: any) => ({
            id: m.id || `meal-${m.name}`,
            name: m.name,
            calories: m.calories,
            description: m.description || '',
            category: (m.type || 'lunch') as SuggestedMeal['category'],
          }))
        setSuggestedMeals(suggested)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
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

  // Reemplazar comida en plan (directo, sin aprobación)
  const handleReplaceMeal = (day: MealPlanDay, mealIndex: number) => {
    if (!canModify) {
      showToast('Solo puedes modificar tu plan sábado y domingo. Lunes a viernes no se puede modificar.', true)
      return
    }
    setModificationType('plan')
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
      const success = await replaceMealInPlanDay(
        planId,
        selectedDay.id,
        oldMeal.id,
        newMeal.id,
        selectedMealIndex + 1
      )

      if (!success) {
        showToast('Error al reemplazar la comida en el plan', true)
        return
      }

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

  // Solicitar modificación de menú semanal (requiere aprobación)
  const handleRequestMenuModification = (day: any, meal: any) => {
    setModificationType('menu')
    setSelectedDay(day)
    setSelectedMeal(meal)
    setIsModifyModalOpen(true)
  }

  const handleConfirmMenuModification = async () => {
    if (!weeklyMenu || !selectedDay || !selectedMeal || !selectedReplacement) {
      setError('Debes seleccionar un día, una comida y un reemplazo')
      return
    }

    try {
      const response = await fetch('/api/menu-modifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekly_menu_id: weeklyMenu.id,
          user_id: userId,
          day_number: selectedDay.day_number,
          meal_type: selectedMeal.meal_type,
          original_meal_id: selectedMeal.meal_id,
          requested_meal_id: selectedReplacement,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al solicitar modificación')
      }

      showToast('Solicitud de modificación enviada. Espera la aprobación del nutricionista.')
      loadData()
      setIsModifyModalOpen(false)
      setSelectedDay(null)
      setSelectedMeal(null)
      setSelectedReplacement('')
    } catch (error: any) {
      console.error('Error requesting modification:', error)
      showToast(error.message || 'Error al solicitar modificación', true)
    }
  }

  const getMealTypeText = (type: string) => {
    const types: Record<string, string> = {
      breakfast: 'Desayuno',
      lunch: 'Almuerzo',
      dinner: 'Cena',
      snack: 'Snack',
    }
    return types[type] || type
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada',
    }
    return texts[status] || status
  }

  const detectMealCategory = (mealName: string): SuggestedMeal['category'] | null => {
    const name = mealName.toLowerCase()
    if (name.includes('snack')) return 'snack'
    if (name.includes('smoothie') || name.includes('avena') || name.includes('tostadas') || name.includes('overnight') || name.includes('panqueques')) return 'breakfast'
    if (name.includes('pollo') || name.includes('wrap') || name.includes('poke') || name.includes('ensalada') || name.includes('bowl mediterráneo')) return 'lunch'
    if (name.includes('salmón') || name.includes('pescado') || name.includes('crema') || name.includes('tacos') || name.includes('bowl vitalidad')) return 'dinner'
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando plan de comidas...</p>
        </div>
      </div>
    )
  }

  const currentMeal = selectedDay && selectedMealIndex !== -1 ? selectedDay.meals[selectedMealIndex] : null
  const currentMealCategory = currentMeal ? detectMealCategory(currentMeal.name) : null
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

      <header className="rounded-2xl border border-primary/20 bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-primary/10 px-3 py-1 rounded-full">
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">📅 Plan de Comidas</span>
          </div>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Plan y Menú Semanal</h2>
        <p className="mt-2 text-sm text-gray-600">
          {planDays.length > 0 
            ? 'Plan semanal personalizado de lunes a viernes. Puedes modificar platos directamente solo sábado y domingo.'
            : weeklyMenu
            ? 'Menú semanal generado. Puedes solicitar modificaciones que requieren aprobación del nutricionista.'
            : 'No tienes un plan o menú asignado aún. Contacta con tu nutricionista.'}
        </p>
        {canModify && planDays.length > 0 && (
          <p className="mt-3 text-xs text-primary font-medium">
            ✓ Puedes modificar tu plan ahora (sábado o domingo)
          </p>
        )}
      </header>

      {/* Modificaciones pendientes del menú semanal */}
      {modifications.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Solicitudes de Modificación</h3>
          <div className="space-y-3">
            {modifications.map((mod) => (
              <div
                key={mod.id}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="font-medium text-gray-900">
                        Día {mod.day_number} - {getMealTypeText(mod.meal_type)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(mod.status)}`}>
                        {getStatusText(mod.status)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">Original:</span> {mod.original_meal?.name || 'N/A'}
                      </p>
                      <p>
                        <span className="font-medium">Solicitado:</span> {mod.requested_meal?.name || 'N/A'}
                      </p>
                      {mod.nutritionist_recommendation && (
                        <p className="text-blue-700 bg-blue-50 p-2 rounded mt-2">
                          <span className="font-medium">Recomendación del nutricionista:</span> {mod.nutritionist_recommendation}
                        </p>
                      )}
                      {mod.rejection_reason && (
                        <p className="text-red-700 bg-red-50 p-2 rounded mt-2">
                          <span className="font-medium">Motivo del rechazo:</span> {mod.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan de comidas (lunes a viernes) */}
      {planDays.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Semanal Personalizado</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {planDays.map((day) => {
              const meals = day.meals || []
              return (
                <article key={day.day} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <h4 className="text-base font-semibold text-gray-900">{day.day}</h4>
                  <p className="mt-1 text-xs text-primary font-medium">
                    Objetivo calórico: {(day.totalCalories || 0).toLocaleString()} kcal
                  </p>
                  {meals.length === 0 ? (
                    <p className="mt-4 text-sm text-gray-500 italic">
                      No hay comidas asignadas para este día aún.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-3 text-sm text-gray-600">
                      {meals.map((meal, index) => (
                        <li key={`${meal.name}-${index}`} className="rounded-lg bg-white p-3 border border-gray-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-gray-800 text-sm">{meal.name}</span>
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
            })}
          </div>
        </div>
      )}

      {/* Menú semanal (si existe) */}
      {weeklyMenu && weeklyMenu.days && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Menú Semanal ({new Date(weeklyMenu.week_start_date).toLocaleDateString('es-ES')} - {new Date(weeklyMenu.week_end_date).toLocaleDateString('es-ES')})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {weeklyMenu.days.map((day: any) => (
              <div key={day.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h4 className="font-semibold text-gray-900 mb-3 text-sm">{day.day_name}</h4>
                <div className="space-y-2">
                  {day.meals?.map((meal: any, index: number) => {
                    const hasPendingModification = modifications.some(
                      (m) => m.day_number === day.day_number && 
                             m.meal_type === meal.meal_type && 
                             m.status === 'pending'
                    )

                    return (
                      <div
                        key={meal.id || index}
                        className={`p-3 rounded-lg border ${
                          hasPendingModification
                            ? 'border-yellow-300 bg-yellow-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-xs">
                              {getMealTypeText(meal.meal_type || meal.type)}
                            </p>
                            <p className="text-sm text-gray-700 mt-1">
                              {meal.name || meal.meals?.name || 'Comida no disponible'}
                            </p>
                            {meal.calories && (
                              <p className="text-xs text-gray-500 mt-1">
                                {meal.calories} kcal
                              </p>
                            )}
                            {hasPendingModification && (
                              <p className="text-xs text-yellow-700 mt-1 font-medium">
                                Modificación pendiente
                              </p>
                            )}
                          </div>
                          {!hasPendingModification && (
                            <button
                              onClick={() => handleRequestMenuModification(day, meal)}
                              className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90 transition ml-2"
                            >
                              Modificar
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {planDays.length === 0 && !weeklyMenu && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No hay plan o menú disponible
          </h3>
          <p className="text-gray-600">
            Tu plan de comidas o menú semanal se asignará próximamente.
          </p>
        </div>
      )}

      {/* Modal Reemplazar Plato (Plan) */}
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
                        <p className="font-medium text-gray-900 text-sm">{suggestion.name}</p>
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

      {/* Modal Solicitar Modificación (Menú Semanal) */}
      <Modal
        isOpen={isModifyModalOpen}
        onClose={() => {
          setIsModifyModalOpen(false)
          setSelectedDay(null)
          setSelectedMeal(null)
          setSelectedReplacement('')
        }}
        title="Solicitar Modificación de Comida"
        size="md"
      >
        {selectedDay && selectedMeal && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Día: {selectedDay.day_name}</p>
              <p className="text-sm text-gray-600 mb-2">Tipo: {getMealTypeText(selectedMeal.meal_type || selectedMeal.type)}</p>
              <p className="text-sm font-medium text-gray-900">
                Comida actual: {selectedMeal.name || selectedMeal.meals?.name || 'N/A'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar comida de reemplazo <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedReplacement}
                onChange={(e) => setSelectedReplacement(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">Seleccionar comida...</option>
                {availableMeals
                  .filter((m) => 
                    m.type === (selectedMeal.meal_type || selectedMeal.type) && 
                    m.id !== (selectedMeal.meal_id || selectedMeal.id) &&
                    m.available
                  )
                  .map((meal) => (
                    <option key={meal.id} value={meal.id}>
                      {meal.name} ({meal.calories} kcal)
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Solo se muestran comidas del mismo tipo disponibles
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                ⚠️ Esta modificación requiere aprobación del nutricionista antes de aplicarse.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsModifyModalOpen(false)
                  setSelectedDay(null)
                  setSelectedMeal(null)
                  setSelectedReplacement('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmMenuModification}
                disabled={!selectedReplacement}
                className={`flex-1 px-4 py-2 rounded-lg text-white transition ${
                  selectedReplacement
                    ? 'bg-primary hover:bg-primary/90'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                Solicitar Modificación
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
