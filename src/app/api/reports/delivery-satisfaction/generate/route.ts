import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// POST: Generar reporte de satisfacción de entrega (llamado por cron)
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
    const { report_type } = body // 'delivery_satisfaction_weekly' o 'delivery_satisfaction_monthly'

    if (!report_type || !['delivery_satisfaction_weekly', 'delivery_satisfaction_monthly'].includes(report_type)) {
      return NextResponse.json(
        { error: 'Tipo de reporte inválido' },
        { status: 400 }
      )
    }

    // Calcular período
    const today = new Date()
    let periodStart: string
    let periodEnd: string

    if (report_type === 'delivery_satisfaction_weekly') {
      const lastMonday = new Date(today)
      lastMonday.setDate(today.getDate() - today.getDay() - 6)
      periodStart = lastMonday.toISOString().split('T')[0]

      const lastSunday = new Date(lastMonday)
      lastSunday.setDate(lastMonday.getDate() + 6)
      periodEnd = lastSunday.toISOString().split('T')[0]
    } else {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      periodStart = lastMonth.toISOString().split('T')[0]

      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 0)
      periodEnd = lastDayOfMonth.toISOString().split('T')[0]
    }

    // Obtener valoraciones del período
    const { data: ratings } = await supabase
      .from('delivery_ratings')
      .select('*, orders!inner(created_at)')
      .gte('orders.created_at', periodStart)
      .lte('orders.created_at', periodEnd)
      .is('deleted_at', null)

    // Calcular métricas
    const totalRatings = ratings?.length || 0
    const averageRating = totalRatings > 0
      ? ratings!.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0

    const ratingDistribution = {
      5: ratings?.filter((r) => r.rating === 5).length || 0,
      4: ratings?.filter((r) => r.rating === 4).length || 0,
      3: ratings?.filter((r) => r.rating === 3).length || 0,
      2: ratings?.filter((r) => r.rating === 2).length || 0,
      1: ratings?.filter((r) => r.rating === 1).length || 0,
    }

    const reportData = {
      period: { start: periodStart, end: periodEnd },
      metrics: {
        total_ratings: totalRatings,
        average_rating: averageRating,
        rating_distribution: ratingDistribution,
      },
      ratings: ratings || [],
      generated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('reports')
      .insert({
        report_type,
        generated_by: null, // Automático
        target_user_id: null,
        period_start: periodStart,
        period_end: periodEnd,
        report_data: reportData,
        is_shared_with_repartidores: false, // Admin decide después
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating satisfaction report:', error)
      return NextResponse.json(
        { error: 'Error al generar reporte de satisfacción' },
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


