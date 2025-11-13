import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET: Obtener reportes de nutricionista
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('user_role')?.value

    if (!userId || role !== 'nutricionista') {
      return NextResponse.json(
        { error: 'Solo los nutricionistas pueden ver estos reportes' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('report_type')
    const targetUserId = searchParams.get('target_user_id')

    let query = supabase
      .from('reports')
      .select('*')
      .in('report_type', ['nutritionist_weekly', 'nutritionist_monthly', 'nutritionist_manual'])

    if (reportType) {
      query = query.eq('report_type', reportType)
    }

    if (targetUserId) {
      query = query.eq('target_user_id', targetUserId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching reports:', error)
      return NextResponse.json(
        { error: 'Error al obtener reportes' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener reportes' },
      { status: 500 }
    )
  }
}

// POST: Generar reporte manual
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('user_role')?.value

    if (!userId || role !== 'nutricionista') {
      return NextResponse.json(
        { error: 'Solo los nutricionistas pueden generar reportes' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { target_user_id, period_start, period_end } = body

    if (!period_start || !period_end) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: period_start, period_end' },
        { status: 400 }
      )
    }

    // Generar datos del reporte
    const reportData = await generateNutritionistReport(target_user_id, period_start, period_end)

    const { data, error } = await supabase
      .from('reports')
      .insert({
        report_type: 'nutritionist_manual',
        generated_by: userId,
        target_user_id: target_user_id || null,
        period_start,
        period_end,
        report_data: reportData,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating report:', error)
      return NextResponse.json(
        { error: 'Error al generar reporte' },
        { status: 500 }
      )
    }

    return NextResponse.json({ report: data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al generar reporte' },
      { status: 500 }
    )
  }
}

async function generateNutritionistReport(
  targetUserId: string | null,
  periodStart: string,
  periodEnd: string
) {
  // Obtener datos de menús y modificaciones
  const { data: menus } = await supabase
    .from('weekly_menus')
    .select('*')
    .gte('week_start_date', periodStart)
    .lte('week_end_date', periodEnd)
    .order('week_start_date', { ascending: true })

  // Obtener modificaciones de menús
  const { data: modifications } = await supabase
    .from('menu_modifications')
    .select('*, weekly_menus!inner(week_start_date, week_end_date)')
    .gte('weekly_menus.week_start_date', periodStart)
    .lte('weekly_menus.week_end_date', periodEnd)

  // Obtener restricciones alimentarias
  const { data: restrictions } = targetUserId
    ? await supabase
        .from('dietary_restrictions')
        .select('*')
        .eq('user_id', targetUserId)
    : await supabase.from('dietary_restrictions').select('*')

  // Calcular métricas
  const totalMenus = menus?.length || 0
  const totalModifications = modifications?.length || 0
  const approvedModifications = modifications?.filter((m) => m.status === 'approved').length || 0
  const rejectedModifications = modifications?.filter((m) => m.status === 'rejected').length || 0
  const pendingModifications = modifications?.filter((m) => m.status === 'pending').length || 0

  return {
    period: { start: periodStart, end: periodEnd },
    metrics: {
      total_menus: totalMenus,
      total_modifications: totalModifications,
      approved_modifications: approvedModifications,
      rejected_modifications: rejectedModifications,
      pending_modifications: pendingModifications,
      approval_rate: totalModifications > 0 ? (approvedModifications / totalModifications) * 100 : 0,
    },
    menus: menus || [],
    modifications: modifications || [],
    restrictions: restrictions || [],
    generated_at: new Date().toISOString(),
  }
}


