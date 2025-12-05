import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { generateWeeklyPlan } from '@/lib/planGenerator'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const role = cookieStore.get('user_role')?.value

    if (role !== 'admin' && role !== 'nutricionista') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const userId = body?.user_id
    const planBaseId = body?.plan_base_id
    const weekStartDate = body?.week_start_date

    if (!userId || !planBaseId || !weekStartDate) {
      return NextResponse.json(
        { error: 'user_id, plan_base_id y week_start_date son obligatorios' },
        { status: 400 }
      )
    }

    const result = await generateWeeklyPlan({
      userId,
      planBaseId,
      weekStartDate,
    })

    return NextResponse.json({
      plan: result.plan,
      meals: result.meals,
    })
  } catch (error: any) {
    console.error('Error generating weekly plan:', error)
    return NextResponse.json(
      { error: error?.message || 'Error al generar el plan semanal' },
      { status: 500 }
    )
  }
}


