"use client"

import { useEffect, useMemo, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import ToastMessage from '@/components/ui/ToastMessage'
import LoadingState from '@/components/ui/LoadingState'
import EmptyState from '@/components/ui/EmptyState'
import ActionButton from '@/components/ui/ActionButton'
import { useAuth } from '@/hooks/useAuth'
import * as api from '@/lib/api'

type WeeklyPlanResponse = {
  id: string
  week_start_date: string
  week_end_date: string
  status: string
  total_calorias?: number | null
  plan_base?: {
    id: string
    nombre: string
    descripcion?: string | null
    objetivo?: string | null
    dias_plan?: number | null
    calorias_base?: number | null
    proteinas_base?: number | null
    carbohidratos_base?: number | null
    grasas_base?: number | null
  } | null
  comidas?: Array<{
    id: string
    day_number: number
    meal_type: 'lunch' | 'dinner'
    calorias_adaptadas?: number | null
    proteinas_adaptadas?: number | null
    carbohidratos_adaptados?: number | null
    grasas_adaptadas?: number | null
    receta?: {
      id: string
      nombre: string
      descripcion?: string | null
      calorias_totales?: number | null
      proteinas_totales?: number | null
      carbohidratos_totales?: number | null
      grasas_totales?: number | null
    } | null
  }>
} | null

type DailyMeal = {
  dayNumber: number
  date: string
  label: string
  lunch?: WeeklyPlanResponse['comidas'][number]
  dinner?: WeeklyPlanResponse['comidas'][number]
}

const DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
const MEAL_LABELS: Record<'lunch' | 'dinner', string> = { lunch: 'Almuerzo', dinner: 'Cena' }
const rangeFormatter = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' })

function formatRange(start: string, end: string) {
  return `${rangeFormatter.format(new Date(start))} · ${rangeFormatter.format(new Date(end))}`
}

function formatDayLabel(date: string, index: number) {
  const dateObj = new Date(date)
  const dayOfWeek = dateObj.getDay() // 0 = domingo, 1 = lunes, ..., 6 = sábado
  // Convertir a índice de lunes (0) a viernes (4)
  const weekdayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Lunes = 0, Viernes = 4
  const weekday = DAY_LABELS[weekdayIndex] ?? 'Día'
  return `${weekday} ${rangeFormatter.format(dateObj)}`
}

function buildBusinessDays(startDate: string, totalDays: number) {
  const result: Array<{ dayNumber: number; date: string }> = []
  const cursor = new Date(startDate)

  while (result.length < totalDays) {
    const dow = cursor.getDay()
    if (dow !== 0 && dow !== 6) {
      result.push({
        dayNumber: result.length + 1,
        date: cursor.toISOString().split('T')[0],
      })
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return result
}

function groupMealsByDay(plan: WeeklyPlanResponse): DailyMeal[] {
  if (!plan || !plan.comidas || plan.comidas.length === 0) return []
  
  // Obtener el máximo day_number de las comidas para saber cuántos días laborables hay
  const maxDayNumber = Math.max(...plan.comidas.map((meal) => meal.day_number))
  const totalDays = plan.plan_base?.dias_plan || maxDayNumber
  
  // Construir solo los días laborables (lunes a viernes)
  const calendar = buildBusinessDays(plan.week_start_date, totalDays)

  // Mapear solo los días que tienen comidas asignadas
  return calendar
    .filter((slot) => {
      // Solo incluir días que tienen al menos una comida
      return plan.comidas!.some((meal) => meal.day_number === slot.dayNumber)
    })
    .map((slot, index) => {
      const mealsForDay = plan.comidas!.filter((meal) => meal.day_number === slot.dayNumber)
      return {
        dayNumber: slot.dayNumber,
        date: slot.date,
        label: formatDayLabel(slot.date, index),
        lunch: mealsForDay.find((meal) => meal.meal_type === 'lunch'),
        dinner: mealsForDay.find((meal) => meal.meal_type === 'dinner'),
      }
    })
}

function extractMacros(meal?: WeeklyPlanResponse['comidas'][number]) {
  if (!meal) return null
  const calories = meal.calorias_adaptadas ?? meal.receta?.calorias_totales ?? null
  const protein = meal.proteinas_adaptadas ?? meal.receta?.proteinas_totales ?? null
  const carbs = meal.carbohidratos_adaptados ?? meal.receta?.carbohidratos_totales ?? null
  const fat = meal.grasas_adaptadas ?? meal.receta?.grasas_totales ?? null
  return { calories, protein, carbs, fat }
}

export default function PlanComidasPage() {
  const { userId } = useAuth()
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanResponse>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchWeeklyPlan = async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const plan = await api.getWeeklyPlan()
      setWeeklyPlan(plan)
    } catch (err: any) {
      console.error('Error fetching weekly plan:', err)
      setWeeklyPlan(null)
      setError(err?.message || 'No se pudo cargar tu plan. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!userId) return
    fetchWeeklyPlan()
  }, [userId])

  const groupedMeals = useMemo(() => groupMealsByDay(weeklyPlan), [weeklyPlan])

  const showToast = (message: string, isError = false) => {
    if (isError) {
      setError(message)
      setTimeout(() => setError(null), 5000)
    } else {
      setSuccess(message)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const handleRefresh = async () => {
    await fetchWeeklyPlan()
    showToast('Plan actualizado')
  }

  if (loading) {
    return <LoadingState message="Cargando tu plan nutricional..." />
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {error && <ToastMessage type="error" message={error} onClose={() => setError(null)} />}
      {success && <ToastMessage type="success" message={success} onClose={() => setSuccess(null)} />}

      <PageHeader
        title="Plan de comidas"
        description="Aquí encontrarás tus almuerzos y cenas personalizados. Cada semana se ajusta automáticamente a tus objetivos."
        action={
          <ActionButton onClick={handleRefresh}>
            Actualizar plan
          </ActionButton>
        }
      />

      {!weeklyPlan ? (
        <EmptyState
          title="Todavía no tienes un plan asignado"
          message="Tu nutricionista generará tu plan de almuerzos y cenas en cuanto completes tu ficha técnica."
        />
      ) : (
        <>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-primary">
                  {weeklyPlan.plan_base?.nombre || 'Plan personalizado'}
                </p>
                <h2 className="text-xl font-bold text-gray-900">
                  Semana {formatRange(weeklyPlan.week_start_date, weeklyPlan.week_end_date)}
                </h2>
                {weeklyPlan.plan_base?.descripcion && (
                  <p className="mt-1 text-sm text-gray-600">{weeklyPlan.plan_base.descripcion}</p>
                )}
              </div>
              <div className="text-sm text-gray-700">
                <div className="font-semibold">
                  {Math.round(weeklyPlan.plan_base?.calorias_base ?? weeklyPlan.total_calorias ?? 0)} kcal/día
                </div>
                <div className="text-xs text-gray-500">
                  {weeklyPlan.plan_base?.proteinas_base != null && `${weeklyPlan.plan_base.proteinas_base}g P · `}
                  {weeklyPlan.plan_base?.carbohidratos_base != null && `${weeklyPlan.plan_base.carbohidratos_base}g C · `}
                  {weeklyPlan.plan_base?.grasas_base != null && `${weeklyPlan.plan_base.grasas_base}g G`}
                </div>
              </div>
            </div>
          </div>

          {groupedMeals.length === 0 ? (
            <EmptyState
              title="Plan en proceso"
              message="Tu nutricionista está preparando tus comidas. Vuelve a revisar más tarde."
            />
          ) : (
            <div className="space-y-4">
              {groupedMeals.map((day) => (
                <section key={day.dayNumber} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">{day.label}</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <MealCard meal={day.lunch} mealType="lunch" />
                    <MealCard meal={day.dinner} mealType="dinner" />
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function MealCard({ meal, mealType }: { meal?: WeeklyPlanResponse['comidas'][number]; mealType: 'lunch' | 'dinner' }) {
  const macros = extractMacros(meal)
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 h-full">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-800">{MEAL_LABELS[mealType]}</p>
        {macros?.calories && <span className="text-xs text-gray-500">{Math.round(macros.calories)} kcal</span>}
      </div>
      {meal?.receta ? (
        <>
          <h4 className="mt-2 text-base font-semibold text-gray-900">{meal.receta.nombre}</h4>
          {meal.receta.descripcion && <p className="mt-1 text-sm text-gray-600">{meal.receta.descripcion}</p>}
          {macros && (
            <p className="mt-3 text-xs text-gray-500">
              {macros.protein != null && `${Math.round(macros.protein)}g P · `}
              {macros.carbs != null && `${Math.round(macros.carbs)}g C · `}
              {macros.fat != null && `${Math.round(macros.fat)}g G`}
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-gray-500">Tu nutricionista definirá este plato muy pronto.</p>
      )}
    </div>
  )
}

