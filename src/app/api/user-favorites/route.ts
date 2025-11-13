import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET: Obtener favoritos de un usuario
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
      .from('user_favorites')
      .select(`
        *,
        meals:meal_id (
          id,
          name,
          description,
          type,
          calories,
          protein,
          carbs,
          fats,
          image_url,
          available
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching favorites:', error)
      return NextResponse.json(
        { error: 'Error al obtener favoritos' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener favoritos' },
      { status: 500 }
    )
  }
}

// POST: Agregar favorito
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, meal_id } = body

    if (!user_id || !meal_id) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: user_id, meal_id' },
        { status: 400 }
      )
    }

    // Verificar si ya existe
    const { data: existing } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', user_id)
      .eq('meal_id', meal_id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Esta comida ya está en tus favoritos' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('user_favorites')
      .insert({
        user_id,
        meal_id,
      })
      .select(`
        *,
        meals:meal_id (
          id,
          name,
          description,
          type,
          calories,
          protein,
          carbs,
          fats,
          image_url,
          available
        )
      `)
      .single()

    if (error) {
      console.error('Error creating favorite:', error)
      return NextResponse.json(
        { error: 'Error al agregar favorito' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al agregar favorito' },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar favorito
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const mealId = searchParams.get('meal_id')

    if (!userId || !mealId) {
      return NextResponse.json(
        { error: 'Faltan parámetros: user_id, meal_id' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('meal_id', mealId)

    if (error) {
      console.error('Error deleting favorite:', error)
      return NextResponse.json(
        { error: 'Error al eliminar favorito' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Favorito eliminado correctamente' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al eliminar favorito' },
      { status: 500 }
    )
  }
}


