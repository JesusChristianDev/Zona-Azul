import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkMealStock, findAutomaticSubstitution, createAutomaticSubstitution, notifyNutritionistAboutSubstitution } from '@/lib/mealStockHelpers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface GenerationOptions {
  weekStartParam: string | null
  weekEndParam: string | null
  forceRegenerate: boolean
}

const MEAL_TYPE_CYCLE: Array<'lunch' | 'dinner'> = ['lunch', 'dinner']

function computeWeekRange(weekStartParam: string | null, weekEndParam: string | null) {
  const today = new Date()
  const dayOfWeek = today.getDay()

  let saturday = new Date(today)
  if (dayOfWeek !== 6) {
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7
    saturday.setDate(today.getDate() + daysUntilSaturday)
  }

  const defaultMonday = new Date(saturday)
  defaultMonday.setDate(saturday.getDate() - 5)

  const defaultSunday = new Date(defaultMonday)
  defaultSunday.setDate(defaultMonday.getDate() + 6)

  const monday = weekStartParam ? new Date(`${weekStartParam}T00:00:00`) : defaultMonday
  const sunday = weekEndParam ? new Date(`${weekEndParam}T00:00:00`) : defaultSunday

  return {
    monday,
    sunday,
    weekStart: monday.toISOString().split('T')[0],
    weekEnd: sunday.toISOString().split('T')[0],
  }
}

async function removeExistingWeeklyMenu(menuId: string) {
  const { error } = await supabase.from('weekly_menus').delete().eq('id', menuId)
  if (error) {
    console.error(`Error deleting weekly menu ${menuId}:`, error)
    throw new Error('No se pudo regenerar el menú existente')
  }
}

function resolveFallbackMealType(
  mealsPerDay: number,
  mealIndex: number
): 'lunch' | 'dinner' {
  if (mealsPerDay <= 1) {
    return 'lunch'
  }
  if (mealsPerDay === 2) {
    return mealIndex % 2 === 0 ? 'lunch' : 'dinner'
  }
  return MEAL_TYPE_CYCLE[mealIndex % MEAL_TYPE_CYCLE.length] || 'lunch'
}

// POST: Generar menús semanales para todos los usuarios activos
// Esta función debe ser llamada cada sábado a las 00:00 mediante un cron job
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl?.searchParams ?? new URL(request.url).searchParams
    const generationOptions: GenerationOptions = {
      weekStartParam: searchParams.get('week_start'),
      weekEndParam: searchParams.get('week_end'),
      forceRegenerate: searchParams.get('force_regenerate') === 'true',
    }

    // Verificar que es una llamada autorizada (puedes usar un secret token)
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN || 'default-secret-token'
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { monday, sunday, weekStart, weekEnd } = computeWeekRange(
      generationOptions.weekStartParam,
      generationOptions.weekEndParam
    )

    // Obtener todas las suscripciones activas
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        subscription_groups:group_id (
          id,
          subscription_group_members (
            user_id,
            meals_per_week,
            is_primary
          )
        )
      `)
      .eq('status', 'active')

    if (subError) {
      console.error('Error fetching subscriptions:', subError)
      return NextResponse.json(
        { error: 'Error al obtener suscripciones' },
        { status: 500 }
      )
    }

    const results = []
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

    for (const subscription of subscriptions || []) {
      try {
        // Determinar usuarios para los que generar menú
        let usersToGenerate: Array<{ user_id: string; meals_per_week: number }> = []

        const subscriptionMealsPerDay =
          typeof subscription.meals_per_day === 'number' && subscription.meals_per_day > 0
            ? subscription.meals_per_day
            : 1

        if (subscription.group_id && subscription.subscription_groups) {
          // Es un grupo, generar menú para cada miembro
          const members = subscription.subscription_groups.subscription_group_members || []
          usersToGenerate = members
            .filter((m: any) => !m.removed_at)
            .map((m: any) => ({
              user_id: m.user_id,
              meals_per_week: m.meals_per_week || subscriptionMealsPerDay * 7,
            }))
        } else {
          // Es individual
          usersToGenerate = [{
            user_id: subscription.user_id,
            meals_per_week: subscriptionMealsPerDay * 7,
          }]
        }

        // Generar menú para cada usuario
        for (const userInfo of usersToGenerate) {
          // Verificar si ya existe un menú para esta semana
          const { data: existingMenu } = await supabase
            .from('weekly_menus')
            .select('id')
            .eq('user_id', userInfo.user_id)
            .eq('week_start_date', weekStart)
            .single()

          if (existingMenu) {
            if (generationOptions.forceRegenerate) {
              await removeExistingWeeklyMenu(existingMenu.id)
              console.log(
                `Menú existente eliminado para usuario ${userInfo.user_id} en semana ${weekStart} (regenerando)`
              )
            } else {
              console.log(`Menú ya existe para usuario ${userInfo.user_id} en semana ${weekStart}`)
              continue
            }
          }

          // Obtener plan nutricional del usuario (si existe)
          const { data: mealPlan } = await supabase
            .from('meal_plans')
            .select(`
              *,
              meal_plan_days (
                *,
                meal_plan_day_meals (
                  *,
                  meals:meal_id (
                    id,
                    name,
                    type,
                    calories
                  )
                )
              )
            `)
            .eq('user_id', userInfo.user_id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          // Crear menú semanal
          const { data: weeklyMenu, error: menuError } = await supabase
            .from('weekly_menus')
            .insert({
              user_id: userInfo.user_id,
              group_id: subscription.group_id || null,
              week_start_date: weekStart,
              week_end_date: weekEnd,
              status: 'generated',
              generated_by: 'system',
              notification_sent: false,
            })
            .select()
            .single()

          if (menuError) {
            console.error(`Error creating weekly menu for user ${userInfo.user_id}:`, menuError)
            continue
          }

          // Generar días del menú
          const mealsPerDay = Math.ceil(userInfo.meals_per_week / 7)
          
          for (let dayNum = 1; dayNum <= 7; dayNum++) {
            const currentDate = new Date(monday)
            currentDate.setDate(monday.getDate() + dayNum - 1)
            const dateStr = currentDate.toISOString().split('T')[0]

            // Crear día del menú
            const { data: menuDay, error: dayError } = await supabase
              .from('weekly_menu_days')
              .insert({
                weekly_menu_id: weeklyMenu.id,
                day_name: dayNames[dayNum - 1],
                day_number: dayNum,
                date: dateStr,
              })
              .select()
              .single()

            if (dayError) {
              console.error(`Error creating menu day ${dayNum}:`, dayError)
              continue
            }

            // Si hay un plan nutricional, usar sus comidas
            if (mealPlan && mealPlan.meal_plan_days) {
              const planDay = mealPlan.meal_plan_days.find((d: any) => d.day_number === dayNum)
              
              if (planDay && planDay.meal_plan_day_meals) {
                // Usar comidas del plan con verificación de stock y sustitución automática
                for (let mealIndex = 0; mealIndex < Math.min(mealsPerDay, planDay.meal_plan_day_meals.length); mealIndex++) {
                  const planMeal = planDay.meal_plan_day_meals[mealIndex]
                  const meal = planMeal.meals

                  if (meal) {
                    let finalMealId = meal.id
                    let isOriginal = true
                    let originalMealId: string | undefined = undefined

                    // Verificar stock de la comida del plan
                    const hasStock = await checkMealStock(meal.id)

                    if (!hasStock) {
                      // Buscar sustitución automática
                      const substituteId = await findAutomaticSubstitution(
                        meal.id,
                        meal.type as 'lunch' | 'dinner',
                        meal.calories
                      )

                      if (substituteId) {
                        // Crear registro de sustitución
                        await createAutomaticSubstitution(meal.id, substituteId, weeklyMenu.id)

                        // Obtener nombres para notificación
                        const { data: originalMeal } = await supabase
                          .from('meals')
                          .select('name')
                          .eq('id', meal.id)
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
                            weeklyMenu.id
                          )
                        }

                        finalMealId = substituteId
                        isOriginal = false
                        originalMealId = meal.id
                      }
                      // Si no se encuentra sustitución, usar la comida original (se notificará al nutricionista)
                    }

                    await supabase
                      .from('weekly_menu_day_meals')
                      .insert({
                        weekly_menu_day_id: menuDay.id,
                        meal_id: finalMealId,
                        meal_type: meal.type,
                        order_index: mealIndex,
                        is_original: isOriginal,
                        original_meal_id: originalMealId || null,
                      })
                  }
                }
              }
            } else {
              // Si no hay plan, obtener comidas disponibles aleatoriamente
              for (let mealIndex = 0; mealIndex < mealsPerDay; mealIndex++) {
                const mealType = resolveFallbackMealType(mealsPerDay, mealIndex)

                // Obtener comidas para planes nutricionales (is_menu_item = false)
                const { data: allMeals } = await supabase
                  .from('meals')
                  .select('id, type, calories')
                  .eq('type', mealType)
                  .eq('available', true)
                  .eq('is_menu_item', false)
                  .limit(20)

                if (!allMeals || allMeals.length === 0) {
                  continue
                }

                const mealsWithStock = []
                for (const meal of allMeals) {
                  const hasStock = await checkMealStock(meal.id)
                  if (hasStock) {
                    mealsWithStock.push(meal)
                  }
                }

                const selectedMeal =
                  mealsWithStock.length > 0
                    ? mealsWithStock[Math.floor(Math.random() * mealsWithStock.length)]
                    : allMeals[0]

                await supabase.from('weekly_menu_day_meals').insert({
                  weekly_menu_day_id: menuDay.id,
                  meal_id: selectedMeal.id,
                  meal_type: mealType,
                  order_index: mealIndex,
                  is_original: true,
                })
              }
            }
          }

          // Marcar notificación como enviada (se enviará después)
          await supabase
            .from('weekly_menus')
            .update({
              notification_sent: false, // Se enviará después
            })
            .eq('id', weeklyMenu.id)

          // Registrar notificación en el log (no obligatoria, respeta preferencias)
          await supabase
            .from('notifications_log')
            .insert({
              user_id: userInfo.user_id,
              notification_type: 'weekly_menu',
              title: '¡Nuevo menú semanal disponible!',
              message: `Tu menú para la semana del ${weekStart} está listo. Revisa tu plan de comidas.`,
              is_mandatory: false, // Respeta las preferencias del usuario
            })

          results.push({
            user_id: userInfo.user_id,
            weekly_menu_id: weeklyMenu.id,
            week_start_date: weekStart,
            status: 'generated',
            is_group_member: subscription.group_id ? true : false, // Marcar si es miembro de grupo
          })
        }
      } catch (error: any) {
        console.error(`Error processing subscription ${subscription.id}:`, error)
        results.push({
          subscription_id: subscription.id,
          error: error.message,
        })
      }
    }

    // Enviar notificaciones individualmente a cada usuario (incluyendo miembros de grupos)
    // Cada miembro recibe su propia notificación según sus preferencias
    const notificationResults = []
    for (const result of results) {
      if (result.status === 'generated' && result.weekly_menu_id && result.user_id) {
        try {
          // Enviar notificación individual a este usuario específico
          // Esto asegura que cada miembro de un grupo recibe su propia notificación
          const notifyResponse = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/weekly-menus/${result.weekly_menu_id}/notify`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          )
          
          if (notifyResponse.ok) {
            notificationResults.push({
              user_id: result.user_id,
              notified: true,
              is_group_member: result.is_group_member || false,
            })
          } else {
            const errorData = await notifyResponse.json().catch(() => ({}))
            notificationResults.push({
              user_id: result.user_id,
              notified: false,
              error: errorData.error || 'Error desconocido',
            })
          }
        } catch (error: any) {
          console.error(`Error notifying user ${result.user_id}:`, error)
          notificationResults.push({
            user_id: result.user_id,
            notified: false,
            error: error.message || 'Error al enviar notificación',
          })
        }
      }
    }

    return NextResponse.json({
      message: 'Menús semanales generados correctamente',
      week_start: weekStart,
      week_end: weekEnd,
      results,
      total_generated: results.filter(r => r.status === 'generated').length,
      notifications_sent: notificationResults.filter(r => r.notified).length,
      notification_results: notificationResults,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al generar menús' },
      { status: 500 }
    )
  }
}

// GET: Generar menús manualmente (para testing o administración)
export async function GET(request: NextRequest) {
  // Permitir generación manual solo en desarrollo o con autenticación admin
  const searchParams = request.nextUrl?.searchParams ?? new URL(request.url).searchParams
  const options: Record<string, string> = {}

  searchParams.forEach((value, key) => {
    options[key] = value
  })

  if (process.env.NODE_ENV === 'production' && options.force !== 'true') {
    return NextResponse.json(
      { error: 'Generación manual no permitida en producción' },
      { status: 403 }
    )
  }

  const fakeRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
  })
  return POST(fakeRequest)
}
