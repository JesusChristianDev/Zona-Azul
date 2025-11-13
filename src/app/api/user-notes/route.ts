import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET: Obtener notas de usuarios (solo nutricionista y admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const nutricionistaId = searchParams.get('nutricionista_id')

    let query = supabase
      .from('user_notes')
      .select(`
        *,
        users:user_id (
          id,
          name,
          email
        ),
        nutricionistas:nutricionista_id (
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (nutricionistaId) {
      query = query.eq('nutricionista_id', nutricionistaId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching notes:', error)
      return NextResponse.json(
        { error: 'Error al obtener notas' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener notas' },
      { status: 500 }
    )
  }
}

// POST: Crear nota (solo nutricionista)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, nutricionista_id, note_text, is_private } = body

    if (!user_id || !nutricionista_id || !note_text) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: user_id, nutricionista_id, note_text' },
        { status: 400 }
      )
    }

    // Verificar que el usuario es nutricionista
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', nutricionista_id)
      .single()

    if (!user || user.role !== 'nutricionista') {
      return NextResponse.json(
        { error: 'Solo los nutricionistas pueden crear notas' },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from('user_notes')
      .insert({
        user_id,
        nutricionista_id,
        note_text,
        is_private: is_private !== undefined ? is_private : true,
      })
      .select(`
        *,
        users:user_id (
          id,
          name,
          email
        ),
        nutricionistas:nutricionista_id (
          id,
          name,
          email
        )
      `)
      .single()

    if (error) {
      console.error('Error creating note:', error)
      return NextResponse.json(
        { error: 'Error al crear nota' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al crear nota' },
      { status: 500 }
    )
  }
}

// PATCH: Actualizar nota
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { note_id, note_text, is_private } = body

    if (!note_id || !note_text) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: note_id, note_text' },
        { status: 400 }
      )
    }

    const updateData: any = {
      note_text,
    }

    if (is_private !== undefined) {
      updateData.is_private = is_private
    }

    const { data, error } = await supabase
      .from('user_notes')
      .update(updateData)
      .eq('id', note_id)
      .select(`
        *,
        users:user_id (
          id,
          name,
          email
        ),
        nutricionistas:nutricionista_id (
          id,
          name,
          email
        )
      `)
      .single()

    if (error) {
      console.error('Error updating note:', error)
      return NextResponse.json(
        { error: 'Error al actualizar nota' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al actualizar nota' },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar nota
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const noteId = searchParams.get('note_id')

    if (!noteId) {
      return NextResponse.json(
        { error: 'Falta parámetro: note_id' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('user_notes')
      .delete()
      .eq('id', noteId)

    if (error) {
      console.error('Error deleting note:', error)
      return NextResponse.json(
        { error: 'Error al eliminar nota' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Nota eliminada correctamente' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al eliminar nota' },
      { status: 500 }
    )
  }
}


