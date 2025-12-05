import {
  ActivityLevel,
  MacroBreakdown,
  MealMacroDistribution,
  NutritionCalculationResult,
  NutritionObjective,
  NutritionProfileInput,
} from './profile.model'
import { buildMealMacroDistribution, getMealDistribution } from './mealsDistribution'

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  intenso: 1.725,
  atleta: 1.9,
}

const MACRO_RULES: Record<NutritionObjective, { prote: number; grasaMin: number }> = {
  perder_grasa: { prote: 2.2, grasaMin: 0.8 },
  mantener: { prote: 1.8, grasaMin: 1 },
  ganar_masa: { prote: 2, grasaMin: 0.8 },
  recomp_corporal: { prote: 2, grasaMin: 0.9 },
}

const DEFAULT_ACTIVITY: ActivityLevel = 'moderado'
const DEFAULT_OBJECTIVE: NutritionObjective = 'mantener'

const MIN_KCAL = 1200
const MAX_KCAL = 4500

function clampCalories(value: number | null): number | null {
  if (value === null) return null
  if (value < MIN_KCAL) return MIN_KCAL
  if (value > MAX_KCAL) return MAX_KCAL
  return Math.round(value)
}

function round(value: number | null): number | null {
  if (value === null) return null
  return Number(value.toFixed(2))
}

export function calculateNutritionProfile(input: NutritionProfileInput): NutritionCalculationResult {
  const peso = input.peso_kg ?? null
  const altura = input.altura_cm ?? null
  const edad = input.edad ?? null
  const sexo = input.sexo ?? null
  const objetivo = (input.objetivo as NutritionObjective) || DEFAULT_OBJECTIVE

  let imc: number | null = null
  if (peso && altura) {
    const alturaMetros = altura / 100
    imc = round(peso / (alturaMetros * alturaMetros))
  }

  let tmb: number | null = null
  let factorActividad: number | null = null
  let getTotal: number | null = null
  let caloriasObjetivo: number | null = null

  if (peso && altura && edad && sexo) {
    const baseTmb = 10 * peso + 6.25 * altura - 5 * edad + (sexo === 'hombre' ? 5 : -161)
    tmb = round(baseTmb)

    const actividad = (input.nivel_actividad as ActivityLevel) || DEFAULT_ACTIVITY
    factorActividad = ACTIVITY_FACTORS[actividad] || ACTIVITY_FACTORS[DEFAULT_ACTIVITY]

    getTotal = round(baseTmb * factorActividad)

    if (getTotal) {
      const deficit = Math.round(getTotal * 0.15)
      const superavit = Math.round(getTotal * 0.12)
      switch (objetivo) {
        case 'perder_grasa':
          caloriasObjetivo = getTotal - deficit
          break
        case 'ganar_masa':
          caloriasObjetivo = getTotal + superavit
          break
        default:
          caloriasObjetivo = getTotal
          break
      }
      caloriasObjetivo = clampCalories(caloriasObjetivo)
    }
  }

  let proteinasObjetivo: number | null = null
  let grasasObjetivo: number | null = null
  let carbohidratosObjetivo: number | null = null

  if (peso && caloriasObjetivo) {
    const macros = MACRO_RULES[objetivo] || MACRO_RULES[DEFAULT_OBJECTIVE]
    proteinasObjetivo = round(macros.prote * peso)
    grasasObjetivo = round(macros.grasaMin * peso)

    const kcalProte = proteinasObjetivo ? proteinasObjetivo * 4 : 0
    const kcalGrasa = grasasObjetivo ? grasasObjetivo * 9 : 0
    let restoKcal = caloriasObjetivo - (kcalProte + kcalGrasa)
    if (restoKcal < 0) {
      restoKcal = caloriasObjetivo * 0.05
    }
    carbohidratosObjetivo = round(restoKcal / 4)
  }

  const fibraObjetivo = peso ? round(peso * 0.35) : null

  const distribucionCalorias = getMealDistribution(input.comidas_por_dia)
  const macroTotals: MacroBreakdown = {
    calorias: caloriasObjetivo ?? 0,
    proteinas: proteinasObjetivo ?? 0,
    grasas: grasasObjetivo ?? 0,
    carbohidratos: carbohidratosObjetivo ?? 0,
  }
  const distribucionMacros: MealMacroDistribution = buildMealMacroDistribution(macroTotals, distribucionCalorias)

  return {
    imc,
    tmb,
    get_total: getTotal,
    calorias_objetivo: caloriasObjetivo,
    factor_actividad: factorActividad,
    proteinas_objetivo: proteinasObjetivo,
    grasas_objetivo: grasasObjetivo,
    carbohidratos_objetivo: carbohidratosObjetivo,
    fibra_objetivo: fibraObjetivo,
    distribucion_calorias: distribucionCalorias,
    distribucion_macros: distribucionMacros,
  }
}





