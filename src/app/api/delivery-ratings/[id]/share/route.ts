import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// PATCH: Compartir valoración con repartidor (solo admin)
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
        { error: 'Solo los administradores pueden compartir valoraciones' },
        { status: 403 }
      )
    }

    const ratingId = params.id
    const body = await request.json()
    const { is_visible_to_repartidor } = body

    if (typeof is_visible_to_repartidor !== 'boolean') {
      return NextResponse.json(
        { error: 'is_visible_to_repartidor debe ser un booleano' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('delivery_ratings')
      .update({ is_visible_to_repartidor })
      .eq('id', ratingId)
      .select()
      .single()

    if (error) {
      console.error('Error updating rating visibility:', error)
      return NextResponse.json(
        { error: 'Error al actualizar visibilidad de valoración' },
        { status: 500 }
      )
    }

    return NextResponse.json({ rating: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al actualizar visibilidad' },
      { status: 500 }
    )
  }
}


