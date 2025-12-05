import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const dynamic = 'force-dynamic'

// GET: Obtener reportes
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
    const reportType = searchParams.get('report_type')

    let query = supabase.from('reports').select('*')

    if (reportType) {
      const types = reportType.split(',')
      query = query.in('report_type', types)
    }

    // Filtrar según rol
    if (role === 'repartidor') {
      // Repartidor solo ve reportes de satisfacción compartidos
      query = query
        .in('report_type', ['delivery_satisfaction_weekly', 'delivery_satisfaction_monthly'])
        .eq('is_shared_with_repartidores', true)
    } else if (role === 'nutricionista') {
      // Nutricionista solo ve sus reportes
      query = query.in('report_type', ['nutritionist_weekly', 'nutritionist_monthly', 'nutritionist_manual'])
    }
    // Admin ve todos

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


