import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// PATCH: Compartir reporte con repartidores (solo admin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('user_role')?.value

    if (!userId || role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo los administradores pueden compartir reportes' },
        { status: 403 }
      )
    }

    const reportId = params.id
    const body = await request.json()
    const { is_shared_with_repartidores } = body

    if (typeof is_shared_with_repartidores !== 'boolean') {
      return NextResponse.json(
        { error: 'is_shared_with_repartidores debe ser un booleano' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('reports')
      .update({ is_shared_with_repartidores })
      .eq('id', reportId)
      .select()
      .single()

    if (error) {
      console.error('Error updating report visibility:', error)
      return NextResponse.json(
        { error: 'Error al actualizar visibilidad del reporte' },
        { status: 500 }
      )
    }

    return NextResponse.json({ report: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al actualizar visibilidad' },
      { status: 500 }
    )
  }
}


