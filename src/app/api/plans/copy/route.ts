import { NextRequest, NextResponse } from 'next/server'
import { copyMealPlanToUser } from '../../../../lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// POST - Copiar un plan completo a un usuario
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
    const { source_plan_id, user_id, start_date, end_date } = body

    if (!source_plan_id || !user_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'source_plan_id, user_id, start_date y end_date son requeridos' },
        { status: 400 }
      )
    }

    const newPlan = await copyMealPlanToUser(source_plan_id, user_id, start_date, end_date)

    if (!newPlan) {
      return NextResponse.json(
        { error: 'Error al copiar plan. Verifica que el plan fuente exista y tenga días y comidas asignadas.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ plan: newPlan }, { status: 201 })
  } catch (error: any) {
    console.error('Error copying plan:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    })
    return NextResponse.json(
      { 
        error: 'Error al copiar plan', 
        details: error?.message,
        code: error?.code,
        hint: error?.hint,
      },
      { status: 500 }
    )
  }
}

