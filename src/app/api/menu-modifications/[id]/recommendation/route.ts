import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// POST: Agregar recomendación del nutricionista a una modificación
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const modificationId = params.id
    const body = await request.json()
    const { nutritionist_id, recommendation } = body

    if (!nutritionist_id || !recommendation) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: nutritionist_id, recommendation' },
        { status: 400 }
      )
    }

    // Verificar que el usuario es nutricionista
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', nutritionist_id)
      .single()

    if (!user || user.role !== 'nutricionista') {
      return NextResponse.json(
        { error: 'Solo los nutricionistas pueden agregar recomendaciones' },
        { status: 403 }
      )
    }

    // Actualizar recomendación
    const { data, error } = await supabase
      .from('menu_modifications')
      .update({
        nutritionist_recommendation: recommendation,
      })
      .eq('id', modificationId)
      .select(`
        *,
        original_meal:original_meal_id (
          id,
          name,
          description,
          type,
          calories
        ),
        requested_meal:requested_meal_id (
          id,
          name,
          description,
          type,
          calories
        )
      `)
      .single()

    if (error) {
      console.error('Error updating recommendation:', error)
      return NextResponse.json(
        { error: 'Error al agregar recomendación' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al agregar recomendación' },
      { status: 500 }
    )
  }
}


