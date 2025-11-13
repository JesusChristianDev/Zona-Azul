import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// POST: Generar reportes automáticos (llamado por cron)
export async function POST(request: NextRequest) {
  try {
    // Verificar autorización
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN || 'default-secret-token'
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { report_type } = body // 'nutritionist_weekly' o 'nutritionist_monthly'

    if (!report_type || !['nutritionist_weekly', 'nutritionist_monthly'].includes(report_type)) {
      return NextResponse.json(
        { error: 'Tipo de reporte inválido. Debe ser nutritionist_weekly o nutritionist_monthly' },
        { status: 400 }
      )
    }

    // Calcular período
    const today = new Date()
    let periodStart: string
    let periodEnd: string

    if (report_type === 'nutritionist_weekly') {
      // Semana pasada (lunes a domingo)
      const lastMonday = new Date(today)
      lastMonday.setDate(today.getDate() - today.getDay() - 6)
      periodStart = lastMonday.toISOString().split('T')[0]

      const lastSunday = new Date(lastMonday)
      lastSunday.setDate(lastMonday.getDate() + 6)
      periodEnd = lastSunday.toISOString().split('T')[0]
    } else {
      // Mes pasado
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      periodStart = lastMonth.toISOString().split('T')[0]

      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 0)
      periodEnd = lastDayOfMonth.toISOString().split('T')[0]
    }

    // Generar reporte global (sin target_user_id)
    const reportData = await generateNutritionistReport(null, periodStart, periodEnd)

    const { data, error } = await supabase
      .from('reports')
      .insert({
        report_type,
        generated_by: null, // Automático
        target_user_id: null, // Global
        period_start: periodStart,
        period_end: periodEnd,
        report_data: reportData,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating automatic report:', error)
      return NextResponse.json(
        { error: 'Error al generar reporte automático' },
        { status: 500 }
      )
    }

    return NextResponse.json({ report: data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al generar reporte automático' },
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
    generated_at: new Date().toISOString(),
  }
}


