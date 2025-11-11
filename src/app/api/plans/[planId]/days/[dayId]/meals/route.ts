import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createMealPlanDayMeal, deleteMealPlanDayMeal, getMealById, getMealPlanByUserId } from '../../../../../../../lib/db'

export const dynamic = 'force-dynamic'

// Verificar que el usuario tiene permiso para modificar el plan
async function canModifyPlan(planId: string, userId: string, role: string): Promise<boolean> {
  // Admin y nutricionista siempre pueden modificar
  if (role === 'admin' || role === 'nutricionista') {
    return true
  }
  
  // Suscriptor solo puede modificar su propio plan Y solo sábado o domingo
  if (role === 'suscriptor') {
    const plan = await getMealPlanByUserId(userId)
    if (plan === null || plan.id !== planId) {
      return false
    }
    
    // Verificar que sea sábado (6) o domingo (0)
    const day = new Date().getDay() // 0 = Domingo, 1 = Lunes, ..., 5 = Viernes, 6 = Sábado
    const canModify = day === 6 || day === 0
    
    return canModify
  }
  
  return false
}

// POST: Agregar una comida a un día del plan
export async function POST(
  request: NextRequest,
  { params }: { params: { planId: string; dayId: string } }
) {
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

    // Verificar permisos
    const hasPermission = await canModifyPlan(params.planId, userId, role || '')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'No autorizado para modificar este plan' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { meal_id, order_index } = body

    if (!meal_id || !order_index) {
      return NextResponse.json(
        { error: 'meal_id y order_index son requeridos' },
        { status: 400 }
      )
    }

    // Obtener información de la comida
    const meal = await getMealById(meal_id)
    if (!meal) {
      return NextResponse.json(
        { error: 'Comida no encontrada' },
        { status: 404 }
      )
    }

    // Crear la comida en el día del plan
    const mealPlanDayMeal = await createMealPlanDayMeal({
      meal_plan_day_id: params.dayId,
      meal_id: meal.id,
      meal_name: meal.name,
      meal_description: meal.description || '',
      calories: meal.calories,
      order_index: parseInt(order_index),
    })

    if (!mealPlanDayMeal) {
      return NextResponse.json(
        { error: 'Error al agregar comida al plan' },
        { status: 500 }
      )
    }

    return NextResponse.json({ meal: mealPlanDayMeal }, { status: 201 })
  } catch (error: any) {
    console.error('Error adding meal to plan day:', error)
    return NextResponse.json(
      { error: 'Error al agregar comida al plan', details: error?.message },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar una comida de un día del plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: { planId: string; dayId: string } }
) {
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

    // Verificar permisos
    const hasPermission = await canModifyPlan(params.planId, userId, role || '')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'No autorizado para modificar este plan' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const mealPlanDayMealId = searchParams.get('meal_plan_day_meal_id')

    if (!mealPlanDayMealId) {
      return NextResponse.json(
        { error: 'meal_plan_day_meal_id es requerido' },
        { status: 400 }
      )
    }

    const success = await deleteMealPlanDayMeal(mealPlanDayMealId)

    if (!success) {
      return NextResponse.json(
        { error: 'Error al eliminar comida del plan' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting meal from plan day:', error)
    return NextResponse.json(
      { error: 'Error al eliminar comida del plan', details: error?.message },
      { status: 500 }
    )
  }
}

