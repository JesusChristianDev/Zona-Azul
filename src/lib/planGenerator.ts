import {
  createPlanSemanal,
  deletePlanSemanal,
  getFichaTecnicaByUserId,
  getPlanBaseById,
  getPlanSemanalByUserAndWeek,
  getRecetasByPlanBase,
  getRecetaIngredientesByRecetaId,
  insertPlanSemanalComidas,
  insertPlanSemanalIngredientes,
  PlanSemanalComidaInput,
  PlanSemanalIngredienteInput,
  DatabaseRecetaIngrediente,
} from './db'
import { getCalorieDistributionFromFicha, getMacroDistributionFromFicha } from '@/nutrition/planner'

type MealType = 'lunch' | 'dinner'

type GenerateWeeklyPlanInput = {
  userId: string
  planBaseId: string
  weekStartDate: string
}

function formatDate(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildBusinessDays(start: string, totalDays: number) {
  const result: Array<{ date: string; dayNumber: number }> = []
  const cursor = new Date(start)

  while (result.length < totalDays) {
    const dayOfWeek = cursor.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      result.push({ date: formatDate(cursor), dayNumber: result.length + 1 })
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return result
}

function round(value: number | null | undefined, decimals = 2): number | null {
  if (value === null || value === undefined) return null
  const pow = 10 ** decimals
  return Math.round(value * pow) / pow
}

export async function generateWeeklyPlan({
  userId,
  planBaseId,
  weekStartDate,
}: GenerateWeeklyPlanInput) {
  const ficha = await getFichaTecnicaByUserId(userId)
  if (!ficha) {
    throw new Error('El usuario no tiene ficha técnica. Debe completarse antes de generar el plan.')
  }

  if (!ficha.calorias_objetivo || ficha.calorias_objetivo <= 0) {
    throw new Error('La ficha técnica no tiene calorías objetivo calculadas.')
  }

  const planBase = await getPlanBaseById(planBaseId)
  if (!planBase) {
    throw new Error('Plan base no encontrado')
  }

  const recetas = await getRecetasByPlanBase(planBaseId)
  if (!recetas.length) {
    throw new Error('El plan base no tiene recetas asociadas')
  }

  const existingPlan = await getPlanSemanalByUserAndWeek(userId, weekStartDate)
  if (existingPlan) {
    await deletePlanSemanal(existingPlan.id)
  }

  const days = planBase.dias_plan || 5
  const workingDays = buildBusinessDays(weekStartDate, days)
  const weekEndDate = workingDays[workingDays.length - 1]?.date ?? weekStartDate
  const targetCalories = ficha.calorias_objetivo || planBase.calorias_base
  const baseCalories = planBase.calorias_base || targetCalories
  const scalingFactor = targetCalories / baseCalories

  const comidasPorDia = ficha.comidas_por_dia ?? 2

  const calorieDistribution = getCalorieDistributionFromFicha({
    distribucion_calorias: ficha.distribucion_calorias,
    comidas_por_dia: comidasPorDia,
  })
  const macroDistribution = getMacroDistributionFromFicha({
    distribucion_calorias: ficha.distribucion_calorias,
    distribucion_macros: ficha.distribucion_macros,
    comidas_por_dia: comidasPorDia,
    calorias_objetivo: ficha.calorias_objetivo ?? planBase.calorias_base,
    proteinas_objetivo: ficha.proteinas_objetivo ?? planBase.proteinas_base,
    grasas_objetivo: ficha.grasas_objetivo ?? planBase.grasas_base,
    carbohidratos_objetivo: ficha.carbohidratos_objetivo ?? null,
  })

  const plan = await createPlanSemanal({
    user_id: userId,
    ficha_tecnica_id: ficha.id,
    plan_base_id: planBaseId,
    week_start_date: weekStartDate,
    week_end_date: weekEndDate,
    status: 'generado',
    total_calorias: round(targetCalories * days, 2),
    comentarios: `Generado automáticamente el ${new Date().toLocaleDateString('es-ES')}`,
  })

  if (!plan) {
    throw new Error('No se pudo crear el plan semanal')
  }

  const lunches = recetas.filter((receta) => receta.meal_type === 'lunch')
  const dinners = recetas.filter((receta) => receta.meal_type === 'dinner')
  const recetasMap = new Map(recetas.map((receta) => [receta.id, receta]))

  const ensureList = (list: typeof recetas) => (list.length ? list : recetas)

  const selectedLunches = ensureList(lunches)
  const selectedDinners = ensureList(dinners)

  const items: PlanSemanalComidaInput[] = []
  const dayDateMap = new Map<number, string>()
  const recipesCount = {
    lunch: selectedLunches.length,
    dinner: selectedDinners.length,
  }

  for (let i = 0; i < days; i++) {
    const workingDay = workingDays[i]
    const dayNumber = workingDay.dayNumber
    dayDateMap.set(dayNumber, workingDay.date)

    const lunch = selectedLunches[i % recipesCount.lunch]
    const dinner = selectedDinners[i % recipesCount.dinner]

  const pushMeal = (meal: typeof recetas[number] | null, type: MealType) => {
    if (!meal) return
    const ratio = calorieDistribution[type] ?? 0.5
    const macroTarget = macroDistribution[type]
    const mealTargetCalories = targetCalories ? targetCalories * ratio : null
    const baseMealCalories =
      meal.calorias_totales ?? (planBase.calorias_base && ratio ? planBase.calorias_base * ratio : null)
    const mealScaling =
      baseMealCalories && mealTargetCalories && baseMealCalories > 0
        ? mealTargetCalories / baseMealCalories
        : scalingFactor

    const caloriasAdaptadas =
      macroTarget?.calorias ?? mealTargetCalories ?? (meal.calorias_totales ?? 0) * mealScaling
    const proteinasAdaptadas =
      macroTarget?.proteinas ?? (meal.proteinas_totales ?? 0) * mealScaling
    const grasasAdaptadas =
      macroTarget?.grasas ?? (meal.grasas_totales ?? 0) * mealScaling
    const carboAdaptadas =
      macroTarget?.carbohidratos ?? (meal.carbohidratos_totales ?? 0) * mealScaling

    items.push({
      plan_semanal_id: plan.id,
      day_number: dayNumber,
      meal_type: type,
      receta_id: meal.id,
      calorias_adaptadas: round(caloriasAdaptadas),
      proteinas_adaptadas: round(proteinasAdaptadas),
      carbohidratos_adaptados: round(carboAdaptadas),
      grasas_adaptadas: round(grasasAdaptadas),
      notas: type === 'lunch' ? 'Ajustado automáticamente para almuerzo' : 'Ajustado automáticamente para cena',
    })
  }

    pushMeal(lunch, 'lunch')
    pushMeal(dinner, 'dinner')
  }

  const storedMeals = await insertPlanSemanalComidas(items)

  const recetaIngredientesCache = new Map<string, DatabaseRecetaIngrediente[]>()
  const ingredienteRows: PlanSemanalIngredienteInput[] = []

  for (const meal of storedMeals) {
    if (!meal.receta_id) continue

    let ingredientes = recetaIngredientesCache.get(meal.receta_id)
    if (!ingredientes) {
      ingredientes = await getRecetaIngredientesByRecetaId(meal.receta_id)
      recetaIngredientesCache.set(meal.receta_id, ingredientes)
    }

    if (!ingredientes.length) continue
    const consumoFecha = dayDateMap.get(meal.day_number) ?? weekStartDate

    const recetaInfo = meal.receta_id ? recetasMap.get(meal.receta_id) : null
    const ratio = calorieDistribution[meal.meal_type as MealType] ?? 0.5
    const mealTargetCalories = targetCalories ? targetCalories * ratio : null
    const baseMealCalories =
      recetaInfo?.calorias_totales ?? (planBase.calorias_base && ratio ? planBase.calorias_base * ratio : null)
    const ingredientScaling =
      baseMealCalories && mealTargetCalories && baseMealCalories > 0
        ? mealTargetCalories / baseMealCalories
        : scalingFactor

    for (const ingrediente of ingredientes) {
      const cantidadAdaptada = round(ingrediente.cantidad_base * ingredientScaling, 4) ?? 0
      ingredienteRows.push({
        plan_semanal_id: plan.id,
        plan_semanal_comida_id: meal.id,
        user_id: userId,
        plan_base_id: planBaseId,
        receta_id: meal.receta_id,
        ingrediente_id: ingrediente.ingrediente_id,
        cantidad_base: ingrediente.cantidad_base,
        unidad: ingrediente.unidad,
        porcentaje_merma: ingrediente.porcentaje_merma ?? null,
        cantidad_adaptada: cantidadAdaptada,
        consumo_fecha: consumoFecha,
      })
    }
  }

  if (ingredienteRows.length) {
    await insertPlanSemanalIngredientes(ingredienteRows)
  }

  return {
    plan,
    meals: items,
  }
}

