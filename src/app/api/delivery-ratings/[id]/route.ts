import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// PATCH: Actualizar valoración
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('user_role')?.value

    if (!userId || role !== 'suscriptor') {
      return NextResponse.json(
        { error: 'Solo los usuarios pueden editar sus valoraciones' },
        { status: 403 }
      )
    }

    const ratingId = params.id
    const body = await request.json()
    const { rating, comment } = body

    // Verificar que la valoración pertenece al usuario
    const { data: existingRating } = await supabase
      .from('delivery_ratings')
      .select('user_id')
      .eq('id', ratingId)
      .single()

    if (!existingRating || existingRating.user_id !== userId) {
      return NextResponse.json(
        { error: 'Valoración no encontrada o no autorizada' },
        { status: 404 }
      )
    }

    const updateData: any = {}
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: 'La valoración debe estar entre 1 y 5' },
          { status: 400 }
        )
      }
      updateData.rating = parseInt(rating)
    }
    if (comment !== undefined) updateData.comment = comment

    const { data, error } = await supabase
      .from('delivery_ratings')
      .update(updateData)
      .eq('id', ratingId)
      .select()
      .single()

    if (error) {
      console.error('Error updating rating:', error)
      return NextResponse.json(
        { error: 'Error al actualizar valoración' },
        { status: 500 }
      )
    }

    return NextResponse.json({ rating: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al actualizar valoración' },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar valoración (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('user_role')?.value

    if (!userId || role !== 'suscriptor') {
      return NextResponse.json(
        { error: 'Solo los usuarios pueden eliminar sus valoraciones' },
        { status: 403 }
      )
    }

    const ratingId = params.id

    // Verificar que la valoración pertenece al usuario
    const { data: existingRating } = await supabase
      .from('delivery_ratings')
      .select('user_id')
      .eq('id', ratingId)
      .single()

    if (!existingRating || existingRating.user_id !== userId) {
      return NextResponse.json(
        { error: 'Valoración no encontrada o no autorizada' },
        { status: 404 }
      )
    }

    // Soft delete
    const { data, error } = await supabase
      .from('delivery_ratings')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', ratingId)
      .select()
      .single()

    if (error) {
      console.error('Error deleting rating:', error)
      return NextResponse.json(
        { error: 'Error al eliminar valoración' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Valoración eliminada correctamente', rating: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al eliminar valoración' },
      { status: 500 }
    )
  }
}


