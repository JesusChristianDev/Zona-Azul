import type { OrderMealSettingInput, OrderMealSettingWithMeal } from '@/lib/db'

export interface MealSettingResponse {
  meal_id?: string
  meal_type: 'lunch' | 'dinner'
  delivery_mode: 'delivery' | 'pickup'
  delivery_address_id?: string | null
  pickup_location?: string | null
  delivery_time: string
  estimated_delivery_time?: string | null
}

const TIME_WINDOWS: Record<'lunch' | 'dinner', { min: number; max: number }> = {
  lunch: { min: 12, max: 16 },
  dinner: { min: 19, max: 23 },
}

function normalizeTimeString(value: string): string {
  if (!value) {
    throw new Error('La hora de entrega es requerida')
  }
  const [hourPart, minutePart] = value.split(':')
  const hour = parseInt(hourPart, 10)
  const minute = parseInt(minutePart ?? '0', 10)

  if (Number.isNaN(hour) || hour < 0 || hour > 23) {
    throw new Error('La hora debe estar en formato HH:MM')
  }
  if (Number.isNaN(minute) || minute < 0 || minute > 59) {
    throw new Error('Los minutos deben estar en formato HH:MM')
  }

  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

function validateTimeWindow(mealType: 'lunch' | 'dinner', time: string) {
  const window = TIME_WINDOWS[mealType]
  const hour = parseInt(time.split(':')[0], 10)
  if (hour < window.min || hour > window.max) {
    const rangeLabel = mealType === 'lunch' ? '12:00 y 16:00' : '19:00 y 23:00'
    throw new Error(`La hora para ${mealType === 'lunch' ? 'almuerzo' : 'cena'} debe estar entre ${rangeLabel}`)
  }
}

export function normalizeMealSettingsPayload(rawMeals: any[]): OrderMealSettingInput[] {
  if (!Array.isArray(rawMeals) || rawMeals.length === 0) {
    return []
  }

  return rawMeals.map((meal, index) => {
    if (!meal?.meal_id) {
      throw new Error(`La comida #${index + 1} no tiene identificador`)
    }

    const mealType: 'lunch' | 'dinner' = meal.meal_type === 'dinner' ? 'dinner' : 'lunch'
    const deliveryMode: 'delivery' | 'pickup' = meal.delivery_mode === 'pickup' ? 'pickup' : 'delivery'
    const normalizedTime = normalizeTimeString(meal.delivery_time)

    validateTimeWindow(mealType, normalizedTime)

    if (deliveryMode === 'delivery' && !meal.delivery_address_id) {
      throw new Error(`Debes seleccionar una dirección para la comida ${mealType === 'lunch' ? 'de almuerzo' : 'de cena'}`)
    }

    if (deliveryMode === 'pickup' && !meal.pickup_location?.trim()) {
      throw new Error(`Debes ingresar una ubicación de retiro para la comida ${mealType === 'lunch' ? 'de almuerzo' : 'de cena'}`)
    }

    return {
      meal_id: String(meal.meal_id),
      meal_type: mealType,
      delivery_mode: deliveryMode,
      delivery_address_id: deliveryMode === 'delivery' ? meal.delivery_address_id || null : null,
      pickup_location: deliveryMode === 'pickup' ? meal.pickup_location?.trim() || null : null,
      delivery_time: normalizedTime,
      scheduled_date: meal.scheduled_date,
    }
  })
}

export function mapMealSettingsToResponse(setting: OrderMealSettingWithMeal): MealSettingResponse {
  return {
    meal_id: setting.meal_id,
    meal_type: setting.meal_type,
    delivery_mode: setting.delivery_mode,
    delivery_address_id: setting.delivery_address_id ?? null,
    pickup_location: setting.pickup_location ?? null,
    delivery_time: setting.delivery_time,
    estimated_delivery_time: setting.estimated_delivery_time ?? null,
  }
}

export function groupMealSettingsByOrder(
  settings: OrderMealSettingWithMeal[]
): Record<string, MealSettingResponse[]> {
  return settings.reduce<Record<string, MealSettingResponse[]>>((acc, setting) => {
    if (!acc[setting.order_id]) {
      acc[setting.order_id] = []
    }
    acc[setting.order_id].push(mapMealSettingsToResponse(setting))
    return acc
  }, {})
}

