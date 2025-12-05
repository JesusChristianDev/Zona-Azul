export type BiologicalSex = 'hombre' | 'mujer'

export type ActivityLevel = 'sedentario' | 'ligero' | 'moderado' | 'intenso' | 'atleta'

export type TrabajoIntensity = 'baja' | 'moderada' | 'alta'

export type NutritionObjective = 'perder_grasa' | 'mantener' | 'ganar_masa' | 'recomp_corporal'

export type MealType = 'lunch' | 'dinner'

export interface NutritionProfileInput {
  sexo?: BiologicalSex | null
  edad?: number | null
  peso_kg?: number | null
  altura_cm?: number | null
  objetivo?: NutritionObjective | null
  nivel_actividad?: ActivityLevel | null
  comidas_por_dia?: number | null
}

export interface MacroBreakdown {
  calorias: number
  proteinas: number
  grasas: number
  carbohidratos: number
}

export type MealDistribution = Record<MealType, number>

export type MealMacroDistribution = Record<MealType, MacroBreakdown>

export interface NutritionCalculationResult {
  imc: number | null
  tmb: number | null
  get_total: number | null
  calorias_objetivo: number | null
  factor_actividad: number | null
  proteinas_objetivo: number | null
  grasas_objetivo: number | null
  carbohidratos_objetivo: number | null
  fibra_objetivo: number | null
  distribucion_calorias: MealDistribution
  distribucion_macros: MealMacroDistribution
}





