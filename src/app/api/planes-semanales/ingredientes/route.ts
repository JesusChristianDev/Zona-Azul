import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration for planes-semanales ingredientes endpoint')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const weekStart = searchParams.get('week_start')
  const weekEnd = searchParams.get('week_end')
  const startDate = searchParams.get('start_date') || weekStart || undefined
  const endDate = searchParams.get('end_date') || weekEnd || startDate

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'Debes proporcionar start_date (o week_start) y end_date (o week_end).' },
      { status: 400 }
    )
  }

  const ingredienteId = searchParams.get('ingrediente_id')
  const planBaseId = searchParams.get('plan_base_id')
  const userId = searchParams.get('user_id')
  const includeDetails = searchParams.get('include_details') === 'true'

  try {
    let query = supabase
      .from('planes_semanales_ingredientes')
      .select(
        `
        id,
        ingrediente_id,
        unidad,
        cantidad_adaptada,
        consumo_fecha,
        plan_base_id,
        user_id,
        ingredientes:ingrediente_id (nombre)
      `
      )
      .gte('consumo_fecha', startDate)
      .lte('consumo_fecha', endDate)

    if (ingredienteId) {
      query = query.eq('ingrediente_id', ingredienteId)
    }
    if (planBaseId) {
      query = query.eq('plan_base_id', planBaseId)
    }
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error || !data) {
      console.error('Error fetching ingredient summary:', error)
      return NextResponse.json({ error: 'No se pudieron obtener los ingredientes' }, { status: 500 })
    }

    const summaryMap = new Map<
      string,
      {
        ingrediente_id: string
        nombre: string
        unidad: string
        total_cantidad: number
        detalles?: Array<{
          consumo_fecha: string
          cantidad: number
          plan_base_id: string
          user_id: string
        }>
      }
    >()

    for (const row of data) {
      const key = row.ingrediente_id
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          ingrediente_id: row.ingrediente_id,
          nombre: row.ingredientes?.nombre || 'Ingrediente',
          unidad: row.unidad,
          total_cantidad: 0,
          detalles: includeDetails ? [] : undefined,
        })
      }

      const summary = summaryMap.get(key)!
      summary.total_cantidad += Number(row.cantidad_adaptada ?? 0)

      if (includeDetails && summary.detalles) {
        summary.detalles.push({
          consumo_fecha: row.consumo_fecha,
          cantidad: Number(row.cantidad_adaptada ?? 0),
          plan_base_id: row.plan_base_id,
          user_id: row.user_id,
        })
      }
    }

    const ingredientes = Array.from(summaryMap.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es')
    )

    return NextResponse.json({
      range: {
        start_date: startDate,
        end_date: endDate,
      },
      filtros: {
        ingrediente_id: ingredienteId,
        plan_base_id: planBaseId,
        user_id: userId,
      },
      total_ingredientes: ingredientes.length,
      ingredientes,
    })
  } catch (error) {
    console.error('Unexpected error building ingredient summary:', error)
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}





