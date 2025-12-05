import { MealDistribution, MealMacroDistribution, MacroBreakdown } from './profile.model'

const DEFAULT_DISTRIBUTION: Record<number, MealDistribution> = {
  1: { lunch: 1, dinner: 0 },
  2: { lunch: 0.55, dinner: 0.45 },
}

function normalizeDistribution(dist: MealDistribution): MealDistribution {
  const total = dist.lunch + dist.dinner
  if (total <= 0) {
    return { lunch: 0.55, dinner: 0.45 }
  }
  return {
    lunch: Number((dist.lunch / total).toFixed(4)),
    dinner: Number((dist.dinner / total).toFixed(4)),
  }
}

export function getMealDistribution(comidasPorDia?: number | null): MealDistribution {
  const fallback = DEFAULT_DISTRIBUTION[2]
  if (!comidasPorDia) return fallback
  return normalizeDistribution(DEFAULT_DISTRIBUTION[comidasPorDia] || fallback)
}

export function buildMealMacroDistribution(
  totals: MacroBreakdown,
  distribution: MealDistribution
): MealMacroDistribution {
  const build = (ratio: number): MacroBreakdown => ({
    calorias: Number((totals.calorias * ratio).toFixed(2)),
    proteinas: Number((totals.proteinas * ratio).toFixed(2)),
    grasas: Number((totals.grasas * ratio).toFixed(2)),
    carbohidratos: Number((totals.carbohidratos * ratio).toFixed(2)),
  })

  return {
    lunch: build(distribution.lunch),
    dinner: build(distribution.dinner),
  }
}





