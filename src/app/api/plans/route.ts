import { NextRequest, NextResponse } from 'next/server'
import { 
  getMealPlanByUserId, 
  getMealPlanWithDays, 
  createMealPlan,
  createMealPlanDay,
  createMealPlanDayMeal,
  getMealById
} from '@/lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Nombres de días de la semana (day_number: 1=Lunes, 2=Martes, ..., 5=Viernes)
// Nota: Los planes son solo de lunes a viernes (5 días)
// El sábado se actualiza el menú de la semana siguiente
// Modificaciones disponibles de sábado a domingo
const DAY_NAMES: { [key: number]: string } = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
}

// Función para transformar el plan de la BD al formato del frontend
function transformPlanForFrontend(planData: any) {
  if (!planData || !planData.plan) {
    return null
  }

  const { plan, days = [] } = planData

  // Si no hay días, devolver el plan básico sin días
  if (!days || days.length === 0) {
    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      startDate: plan.start_date,
      endDate: plan.end_date,
      totalCalories: plan.total_calories || 0,
      days: [],
    }
  }

  // Transformar días (solo lunes a viernes)
  const transformedDays = days
    .filter((day: any) => day.day_number >= 1 && day.day_number <= 5) // Solo días 1-5 (lunes a viernes)
    .map((day: any) => {
      // Obtener nombre del día basado en day_number (1 = Lunes, 5 = Viernes)
      const dayName = DAY_NAMES[day.day_number] || `Día ${day.day_number}`

    // Transformar comidas - manejar tanto array como objeto anidado
    let mealArray = day.meal_plan_day_meals || []
    
    // Si es un objeto en lugar de array, convertirlo
    if (mealArray && !Array.isArray(mealArray)) {
      mealArray = [mealArray]
    }

    const meals = mealArray
      .filter((meal: any) => meal != null) // Filtrar valores nulos
      .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
      .map((meal: any) => ({
        id: meal.id, // ID de meal_plan_day_meals para poder eliminarlo
        name: meal.meal_name || meal.name || 'Comida',
        calories: meal.calories || 0,
        description: meal.meal_description || meal.description || '',
      }))

    // Calcular total de calorías del día
    const totalCalories = meals.length > 0 
      ? meals.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0)
      : (day.total_calories || 0)

    return {
      id: day.id, // ID del día del plan para poder agregar/eliminar comidas
      day: dayName,
      totalCalories,
      meals,
    }
  })

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    startDate: plan.start_date,
    endDate: plan.end_date,
    totalCalories: plan.total_calories || 0,
    days: transformedDays,
  }
}

// GET - Obtener plan del usuario o planes sin asignar
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('user_role')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('user_id')
    const nutricionistaId = searchParams.get('nutricionista_id')
    const unassigned = searchParams.get('unassigned') === 'true'

    // Si se solicita planes sin asignar de un nutricionista
    if (unassigned && nutricionistaId && (role === 'nutricionista' || role === 'admin')) {
      const { getMealPlansByNutricionistaId } = await import('../../../lib/db')
      const plans = await getMealPlansByNutricionistaId(nutricionistaId)
      
      // Transformar cada plan al formato del frontend
      const transformedPlans = await Promise.all(
        plans.map(async (plan) => {
          const planWithDays = await getMealPlanWithDays(plan.id)
          return planWithDays ? transformPlanForFrontend(planWithDays) : null
        })
      )
      
      return NextResponse.json({ plans: transformedPlans.filter(p => p !== null) })
    }

    // Permitir obtener plan de otro usuario si es admin o nutricionista
    let planUserId = userId
    if (targetUserId && (role === 'admin' || role === 'nutricionista')) {
      // Admin o nutricionista puede obtener plan de otro usuario
      planUserId = targetUserId
    } else if (targetUserId && targetUserId !== userId) {
      // Usuario normal no puede obtener plan de otro usuario
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    // Obtener plan básico primero
    const plan = await getMealPlanByUserId(planUserId)
    
    if (!plan) {
      return NextResponse.json({ plan: null })
    }

    // Obtener plan completo con días y comidas
    const planWithDays = await getMealPlanWithDays(plan.id)
    
    if (!planWithDays) {
      return NextResponse.json({ plan: null })
    }

    // Transformar al formato del frontend
    const transformedPlan = transformPlanForFrontend(planWithDays)
    
    if (!transformedPlan) {
      return NextResponse.json({ plan: null })
    }
    
    return NextResponse.json({ plan: transformedPlan })
  } catch (error: any) {
    console.error('Error fetching plan:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    return NextResponse.json(
      { error: 'Error al obtener plan', details: error?.message },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo plan (solo nutricionista o admin)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('user_role')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    if (role !== 'nutricionista' && role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { user_id, name, description, start_date, end_date, total_calories, days } = body

    if (!name || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Nombre, fecha inicio y fecha fin son requeridos' },
        { status: 400 }
      )
    }

    // user_id es opcional - si no se proporciona, se crea un plan template (sin asignar)
    const plan = await createMealPlan({
      user_id: user_id || null,
      name,
      description: description || null,
      nutricionista_id: role === 'nutricionista' ? userId : null,
      start_date,
      end_date,
      total_calories: total_calories ? parseInt(total_calories) : null,
      status: 'active',
    })

    if (!plan || !plan.id) {
      return NextResponse.json(
        { error: 'Error al crear plan' },
        { status: 500 }
      )
    }

    // Si se proporcionan días con comidas, crearlos
    if (days && Array.isArray(days)) {
      const caloriesPerDay = total_calories ? Math.round(parseInt(total_calories) / 5) : null
      
      for (const dayData of days) {
        const { day_number, day_name, meals } = dayData
        
        // Crear el día
        const day = await createMealPlanDay({
          meal_plan_id: plan.id,
          day_name: day_name || `Día ${day_number}`,
          day_number: parseInt(day_number),
          total_calories: caloriesPerDay,
        })
        
        if (day && day.id && meals && Array.isArray(meals)) {
          // Crear comidas del día
          for (let i = 0; i < meals.length; i++) {
            const mealId = meals[i]
            const meal = await getMealById(mealId)
            
            if (meal) {
              await createMealPlanDayMeal({
                meal_plan_day_id: day.id,
                meal_id: meal.id,
                meal_name: meal.name,
                meal_description: meal.description || null,
                calories: meal.calories || null,
                order_index: i + 1,
              })
            }
          }
        }
      }
    }

    // Obtener el plan completo con días y comidas
    const planWithDays = await getMealPlanWithDays(plan.id)
    const transformedPlan = planWithDays ? transformPlanForFrontend(planWithDays) : null

    return NextResponse.json({ plan: transformedPlan || plan }, { status: 201 })
  } catch (error) {
    console.error('Error creating plan:', error)
    return NextResponse.json(
      { error: 'Error al crear plan' },
      { status: 500 }
    )
  }
}

