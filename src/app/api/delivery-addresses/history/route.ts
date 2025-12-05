import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const dynamic = 'force-dynamic'

// GET: Obtener historial de cambios de direcciones
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    const { searchParams } = new URL(request.url)
    const addressId = searchParams.get('address_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    let query = supabase
      .from('delivery_address_history')
      .select(`
        *,
        delivery_addresses:address_id (
          id,
          address_line1,
          city
        )
      `)
      .eq('user_id', userId)
      .order('changed_at', { ascending: false })

    if (addressId) {
      query = query.eq('address_id', addressId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching address history:', error)
      return NextResponse.json(
        { error: 'Error al obtener historial de direcciones' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener historial' },
      { status: 500 }
    )
  }
}


