import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  getLatestPlanSemanalDetailed,
  getPlanSemanalDetailedByWeek,
  PlanSemanalWithDetalles,
} from '@/lib/db'

export const dynamic = 'force-dynamic'

function canAccessPlan(requestedUserId: string, currentUserId: string, role?: string | null) {
  if (requestedUserId === currentUserId) return true
  return role === 'admin' || role === 'nutricionista'
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const currentUserId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('user_role')?.value

    if (!currentUserId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const targetUserId = searchParams.get('user_id') || currentUserId

    if (!canAccessPlan(targetUserId, currentUserId, role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const weekStart = searchParams.get('week_start')
    const includeMeals = searchParams.get('include_meals') !== 'false'

    let plan: PlanSemanalWithDetalles | null = null

    if (weekStart) {
      plan = await getPlanSemanalDetailedByWeek(targetUserId, weekStart, includeMeals)
    } else {
      plan = await getLatestPlanSemanalDetailed(targetUserId, includeMeals)
    }

    return NextResponse.json({ plan })
  } catch (error) {
    console.error('Error obteniendo plan semanal:', error)
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}





