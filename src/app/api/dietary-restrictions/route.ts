import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET: Obtener restricciones alimentarias
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Falta parámetro: user_id' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('dietary_restrictions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching restrictions:', error)
      return NextResponse.json(
        { error: 'Error al obtener restricciones' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener restricciones' },
      { status: 500 }
    )
  }
}

// POST: Crear restricción alimentaria
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      user_id,
      restriction_type,
      restriction_name,
      severity,
      description,
    } = body

    if (!user_id || !restriction_type || !restriction_name) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: user_id, restriction_type, restriction_name' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('dietary_restrictions')
      .insert({
        user_id,
        restriction_type,
        restriction_name,
        severity: severity || 'moderate',
        description: description || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating restriction:', error)
      return NextResponse.json(
        { error: 'Error al crear restricción' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al crear restricción' },
      { status: 500 }
    )
  }
}

// PATCH: Actualizar restricción
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { restriction_id, restriction_name, severity, description } = body

    if (!restriction_id) {
      return NextResponse.json(
        { error: 'Falta campo requerido: restriction_id' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (restriction_name !== undefined) {
      updateData.restriction_name = restriction_name
    }
    if (severity !== undefined) {
      updateData.severity = severity
    }
    if (description !== undefined) {
      updateData.description = description
    }

    const { data, error } = await supabase
      .from('dietary_restrictions')
      .update(updateData)
      .eq('id', restriction_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating restriction:', error)
      return NextResponse.json(
        { error: 'Error al actualizar restricción' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al actualizar restricción' },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar restricción
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const restrictionId = searchParams.get('restriction_id')

    if (!restrictionId) {
      return NextResponse.json(
        { error: 'Falta parámetro: restriction_id' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('dietary_restrictions')
      .delete()
      .eq('id', restrictionId)

    if (error) {
      console.error('Error deleting restriction:', error)
      return NextResponse.json(
        { error: 'Error al eliminar restricción' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Restricción eliminada correctamente' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al eliminar restricción' },
      { status: 500 }
    )
  }
}


