/**
 * Funciones helper para gestión automática de stock y sustituciones
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface MealWithStock {
  id: string
  name: string
  type: 'lunch' | 'dinner'
  calories: number
  available: boolean
  stock?: {
    stock_quantity: number
    is_out_of_stock: boolean
  }
}

/**
 * Verifica si una comida tiene stock disponible
 */
export async function checkMealStock(mealId: string): Promise<boolean> {
  try {
    const { data: stock } = await supabase
      .from('meal_stock')
      .select('stock_quantity, is_out_of_stock')
      .eq('meal_id', mealId)
      .single()

    // Si no hay registro de stock, asumir que está disponible
    if (!stock) return true

    // Si está marcado como sin stock, no está disponible
    if (stock.is_out_of_stock) return false

    // Si la cantidad es mayor a 0, está disponible
    return stock.stock_quantity > 0
  } catch (error) {
    console.error('Error checking meal stock:', error)
    // En caso de error, asumir que está disponible para no bloquear la generación
    return true
  }
}

/**
 * Encuentra una sustitución automática para una comida sin stock
 * Busca comidas del mismo tipo con stock disponible y calorías similares
 */
export async function findAutomaticSubstitution(
  originalMealId: string,
  mealType: 'lunch' | 'dinner',
  originalCalories?: number
): Promise<string | null> {
  try {
    // Obtener la comida original para comparar calorías
    const { data: originalMeal } = await supabase
      .from('meals')
      .select('calories, is_menu_item')
      .eq('id', originalMealId)
      .single()

    if (!originalMeal) return null

    // Buscar comidas del mismo tipo que:
    // 1. Tengan stock disponible
    // 2. Sean para planes nutricionales (is_menu_item = false)
    // 3. Estén disponibles (available = true)
    // 4. Tengan calorías similares (±100 calorías)
    const calorieRange = originalCalories || originalMeal.calories || 500
    const minCalories = calorieRange - 100
    const maxCalories = calorieRange + 100

    // Primero obtener todas las comidas del tipo correcto
    const { data: availableMeals } = await supabase
      .from('meals')
      .select('id, calories, name')
      .eq('type', mealType)
      .eq('available', true)
      .eq('is_menu_item', false)
      .neq('id', originalMealId) // Excluir la comida original
      .gte('calories', minCalories)
      .lte('calories', maxCalories)
      .limit(20)

    if (!availableMeals || availableMeals.length === 0) {
      // Si no hay comidas con calorías similares, buscar cualquier comida del tipo
      const { data: fallbackMeals } = await supabase
        .from('meals')
        .select('id, calories, name')
        .eq('type', mealType)
        .eq('available', true)
        .eq('is_menu_item', false)
        .neq('id', originalMealId)
        .limit(10)

      if (!fallbackMeals || fallbackMeals.length === 0) {
        return null
      }

      // Verificar stock de las comidas de respaldo
      for (const meal of fallbackMeals) {
        const hasStock = await checkMealStock(meal.id)
        if (hasStock) {
          return meal.id
        }
      }

      return null
    }

    // Verificar stock de las comidas disponibles
    for (const meal of availableMeals) {
      const hasStock = await checkMealStock(meal.id)
      if (hasStock) {
        return meal.id
      }
    }

    return null
  } catch (error) {
    console.error('Error finding automatic substitution:', error)
    return null
  }
}

/**
 * Crea un registro de sustitución automática
 */
export async function createAutomaticSubstitution(
  originalMealId: string,
  substituteMealId: string,
  weeklyMenuId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('meal_substitutions')
      .insert({
        original_meal_id: originalMealId,
        substitute_meal_id: substituteMealId,
        weekly_menu_id: weeklyMenuId,
        status: 'approved', // Las sustituciones automáticas se aprueban automáticamente
        approved_by: null, // Aprobado por el sistema
        approved_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating substitution:', error)
      return null
    }

    return data.id
  } catch (error) {
    console.error('Error creating automatic substitution:', error)
    return null
  }
}

/**
 * Notifica al nutricionista sobre sustituciones automáticas
 */
export async function notifyNutritionistAboutSubstitution(
  originalMealName: string,
  substituteMealName: string,
  weeklyMenuId: string
): Promise<void> {
  try {
    // Obtener información del menú para identificar al usuario
    const { data: weeklyMenu } = await supabase
      .from('weekly_menus')
      .select('user_id')
      .eq('id', weeklyMenuId)
      .single()

    if (!weeklyMenu) return

    // Obtener el nutricionista asignado al usuario (si existe)
    const { data: nutritionist } = await supabase
      .from('nutricionista_clients')
      .select('nutricionista_id')
      .eq('client_id', weeklyMenu.user_id)
      .limit(1)
      .single()

    if (!nutritionist) {
      // Si no hay nutricionista asignado, notificar a todos los nutricionistas
      const { data: allNutritionists } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'nutricionista')

      if (allNutritionists && allNutritionists.length > 0) {
        for (const nutri of allNutritionists) {
          await supabase
            .from('notifications_log')
            .insert({
              user_id: nutri.id,
              notification_type: 'stock_substitution',
              title: '🔄 Sustitución automática de plato',
              message: `El plato "${originalMealName}" fue sustituido automáticamente por "${substituteMealName}" debido a falta de stock.`,
              is_mandatory: false,
            })
        }
      }
      return
    }

    // Notificar al nutricionista asignado
    await supabase
      .from('notifications_log')
      .insert({
        user_id: nutritionist.nutricionista_id,
        notification_type: 'stock_substitution',
        title: '🔄 Sustitución automática de plato',
        message: `El plato "${originalMealName}" fue sustituido automáticamente por "${substituteMealName}" debido a falta de stock en el menú del usuario.`,
        is_mandatory: false,
      })
  } catch (error) {
    console.error('Error notifying nutritionist about substitution:', error)
  }
}

/**
 * Verifica y aplica sustituciones automáticas a una lista de comidas
 * Retorna un array con las comidas (sustituidas si es necesario)
 */
export async function applyAutomaticSubstitutions(
  meals: Array<{ meal_id: string; meal_type: 'lunch' | 'dinner'; calories?: number }>,
  weeklyMenuId: string
): Promise<Array<{ meal_id: string; meal_type: string; was_substituted: boolean; original_meal_id?: string }>> {
  const results = []

  for (const meal of meals) {
    const hasStock = await checkMealStock(meal.meal_id)

    if (hasStock) {
      // La comida tiene stock, usarla directamente
      results.push({
        meal_id: meal.meal_id,
        meal_type: meal.meal_type,
        was_substituted: false,
      })
    } else {
      // La comida no tiene stock, buscar sustitución
      const substituteId = await findAutomaticSubstitution(
        meal.meal_id,
        meal.meal_type,
        meal.calories
      )

      if (substituteId) {
        // Crear registro de sustitución
        await createAutomaticSubstitution(meal.meal_id, substituteId, weeklyMenuId)

        // Obtener nombres de las comidas para la notificación
        const { data: originalMeal } = await supabase
          .from('meals')
          .select('name')
          .eq('id', meal.meal_id)
          .single()

        const { data: substituteMeal } = await supabase
          .from('meals')
          .select('name')
          .eq('id', substituteId)
          .single()

        if (originalMeal && substituteMeal) {
          await notifyNutritionistAboutSubstitution(
            originalMeal.name,
            substituteMeal.name,
            weeklyMenuId
          )
        }

        results.push({
          meal_id: substituteId,
          meal_type: meal.meal_type,
          was_substituted: true,
          original_meal_id: meal.meal_id,
        })
      } else {
        // No se encontró sustitución, usar la comida original pero notificar
        console.warn(`No se encontró sustitución para comida ${meal.meal_id} sin stock`)
        results.push({
          meal_id: meal.meal_id,
          meal_type: meal.meal_type,
          was_substituted: false,
        })
      }
    }
  }

  return results
}

