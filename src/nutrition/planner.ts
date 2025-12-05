import { buildMealMacroDistribution, getMealDistribution } from './mealsDistribution'
import { MealDistribution, MealMacroDistribution, MacroBreakdown } from './profile.model'

type FichaNutritionShape = {
  distribucion_calorias?: MealDistribution | Record<string, number> | null
  distribucion_macros?: MealMacroDistribution | Record<string, any> | null
  comidas_por_dia?: number | null
  calorias_objetivo?: number | null
  proteinas_objetivo?: number | null
  grasas_objetivo?: number | null
  carbohidratos_objetivo?: number | null
}

function parseDistribution(value: any, fallback: MealDistribution): MealDistribution {
  if (!value) return fallback
  try {
    const data = typeof value === 'string' ? JSON.parse(value) : value
    if (typeof data !== 'object') return fallback
    const lunch = Number(data.lunch ?? data.comida ?? 0)
    const dinner = Number(data.dinner ?? data.cena ?? 0)
    const total = lunch + dinner
    if (!Number.isFinite(total) || total <= 0) return fallback
    return {
      lunch: Number((lunch / total).toFixed(4)),
      dinner: Number((dinner / total).toFixed(4)),
    }
  } catch (error) {
    console.warn('Could not parse caloric distribution', error)
    return fallback
  }
}

function parseMacroDistribution(
  value: any,
  fallbackDistribution: MealDistribution,
  totals: MacroBreakdown
): MealMacroDistribution {
  if (!value) return buildMealMacroDistribution(totals, fallbackDistribution)
  try {
    const data = typeof value === 'string' ? JSON.parse(value) : value
    if (data?.lunch && data?.dinner) {
      return {
        lunch: {
          calorias: Number(data.lunch.calorias ?? totals.calorias * fallbackDistribution.lunch),
          proteinas: Number(data.lunch.proteinas ?? totals.proteinas * fallbackDistribution.lunch),
          grasas: Number(data.lunch.grasas ?? totals.grasas * fallbackDistribution.lunch),
          carbohidratos: Number(data.lunch.carbohidratos ?? totals.carbohidratos * fallbackDistribution.lunch),
        },
        dinner: {
          calorias: Number(data.dinner.calorias ?? totals.calorias * fallbackDistribution.dinner),
          proteinas: Number(data.dinner.proteinas ?? totals.proteinas * fallbackDistribution.dinner),
          grasas: Number(data.dinner.grasas ?? totals.grasas * fallbackDistribution.dinner),
          carbohidratos: Number(
            data.dinner.carbohidratos ?? totals.carbohidratos * fallbackDistribution.dinner
          ),
        },
      }
    }
  } catch (error) {
    console.warn('Could not parse macro distribution', error)
  }
  return buildMealMacroDistribution(totals, fallbackDistribution)
}

export function getCalorieDistributionFromFicha(ficha: FichaNutritionShape): MealDistribution {
  const fallback = getMealDistribution(ficha.comidas_por_dia)
  return parseDistribution(ficha.distribucion_calorias, fallback)
}

export function getMacroDistributionFromFicha(ficha: FichaNutritionShape): MealMacroDistribution {
  const distribution = getCalorieDistributionFromFicha(ficha)
  const totals: MacroBreakdown = {
    calorias: ficha.calorias_objetivo ?? 0,
    proteinas: ficha.proteinas_objetivo ?? 0,
    grasas: ficha.grasas_objetivo ?? 0,
    carbohidratos: ficha.carbohidratos_objetivo ?? 0,
  }
  return parseMacroDistribution(ficha.distribucion_macros, distribution, totals)
}





