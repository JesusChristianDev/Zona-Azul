import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// POST: Generar menús semanales para todos los usuarios activos
// Esta función debe ser llamada cada sábado a las 00:00 mediante un cron job
export async function POST(request: NextRequest) {
  try {
    // Verificar que es una llamada autorizada (puedes usar un secret token)
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN || 'default-secret-token'
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Calcular fechas de la semana (lunes a domingo)
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = domingo, 6 = sábado
    
    // Si no es sábado, calcular el próximo sábado
    let saturday = new Date(today)
    if (dayOfWeek !== 6) {
      const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7
      saturday.setDate(today.getDate() + daysUntilSaturday)
    }
    
    // Calcular lunes (inicio de semana) y domingo (fin de semana)
    const monday = new Date(saturday)
    monday.setDate(saturday.getDate() - 5) // Retroceder 5 días desde sábado
    
    const sunday = new Date(saturday)
    sunday.setDate(saturday.getDate() + 1) // Avanzar 1 día desde sábado
    
    const weekStart = monday.toISOString().split('T')[0]
    const weekEnd = sunday.toISOString().split('T')[0]

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

        if (subscription.group_id && subscription.subscription_groups) {
          // Es un grupo, generar menú para cada miembro
          const members = subscription.subscription_groups.subscription_group_members || []
          usersToGenerate = members
            .filter((m: any) => !m.removed_at)
            .map((m: any) => ({
              user_id: m.user_id,
              meals_per_week: m.meals_per_week || 7,
            }))
        } else {
          // Es individual
          usersToGenerate = [{
            user_id: subscription.user_id,
            meals_per_week: 7, // Por defecto
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
            console.log(`Menú ya existe para usuario ${userInfo.user_id} en semana ${weekStart}`)
            continue
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
                // Usar comidas del plan
                for (let mealIndex = 0; mealIndex < Math.min(mealsPerDay, planDay.meal_plan_day_meals.length); mealIndex++) {
                  const planMeal = planDay.meal_plan_day_meals[mealIndex]
                  const meal = planMeal.meals

                  if (meal) {
                    await supabase
                      .from('weekly_menu_day_meals')
                      .insert({
                        weekly_menu_day_id: menuDay.id,
                        meal_id: meal.id,
                        meal_type: meal.type,
                        order_index: mealIndex,
                        is_original: true,
                      })
                  }
                }
              }
            } else {
              // Si no hay plan, obtener comidas disponibles aleatoriamente
              // IMPORTANTE: Solo usar comidas para planes nutricionales (NO del menú del local)
              const mealTypes = ['breakfast', 'lunch', 'dinner']
              
              for (let mealIndex = 0; mealIndex < mealsPerDay; mealIndex++) {
                const mealType = mealTypes[mealIndex % mealTypes.length] || 'lunch'
                
                // Obtener comidas para planes nutricionales (is_menu_item = false)
                // NO usar comidas del menú del local (is_menu_item = true)
                const { data: availableMeals } = await supabase
                  .from('meals')
                  .select('id, type')
                  .eq('type', mealType)
                  .eq('available', true)
                  .eq('is_menu_item', false) // Solo comidas para planes, NO del menú del local
                  .limit(10)

                if (availableMeals && availableMeals.length > 0) {
                  // Seleccionar una comida aleatoria
                  const randomMeal = availableMeals[Math.floor(Math.random() * availableMeals.length)]
                  
                  await supabase
                    .from('weekly_menu_day_meals')
                    .insert({
                      weekly_menu_day_id: menuDay.id,
                      meal_id: randomMeal.id,
                      meal_type: mealType,
                      order_index: mealIndex,
                      is_original: true,
                    })
                }
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
  const { searchParams } = new URL(request.url)
  const force = searchParams.get('force') === 'true'

  if (process.env.NODE_ENV === 'production' && !force) {
    return NextResponse.json(
      { error: 'Generación manual no permitida en producción' },
      { status: 403 }
    )
  }

  // Llamar a la misma lógica que POST pero sin verificación de token
  const response = await POST(request)
  return response
}

