import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET: Obtener información de un miembro específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const { memberId } = params

    const { data, error } = await supabase
      .from('subscription_group_members')
      .select(`
        *,
        users:user_id (
          id,
          name,
          email
        ),
        subscription_groups:group_id (
          id,
          name,
          group_type,
          primary_user_id
        )
      `)
      .eq('id', memberId)
      .single()

    if (error) {
      console.error('Error fetching member:', error)
      return NextResponse.json(
        { error: 'Error al obtener información del miembro' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener miembro' },
      { status: 500 }
    )
  }
}

// PATCH: Actualizar preferencias del miembro (número de comidas, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const { memberId } = params
    const body = await request.json()
    const { meals_per_week } = body

    if (meals_per_week === undefined) {
      return NextResponse.json(
        { error: 'Falta campo requerido: meals_per_week' },
        { status: 400 }
      )
    }

    const mealsPerWeek = parseInt(meals_per_week)
    if (mealsPerWeek < 1 || mealsPerWeek > 21) {
      return NextResponse.json(
        { error: 'El número de comidas debe estar entre 1 y 21 por semana' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('subscription_group_members')
      .update({
        meals_per_week: mealsPerWeek,
      })
      .eq('id', memberId)
      .select(`
        *,
        users:user_id (
          id,
          name,
          email
        )
      `)
      .single()

    if (error) {
      console.error('Error updating member preferences:', error)
      return NextResponse.json(
        { error: 'Error al actualizar preferencias del miembro' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al actualizar preferencias' },
      { status: 500 }
    )
  }
}


