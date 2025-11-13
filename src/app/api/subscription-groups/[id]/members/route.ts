import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// POST: Agregar miembro a un grupo
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id
    const body = await request.json()
    const { user_id, meals_per_week, added_by } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'Falta campo requerido: user_id' },
        { status: 400 }
      )
    }

    // Verificar que el usuario no esté ya en el grupo
    const { data: existing } = await supabase
      .from('subscription_group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user_id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'El usuario ya es miembro de este grupo' },
        { status: 400 }
      )
    }

    // Agregar miembro
    const { data, error } = await supabase
      .from('subscription_group_members')
      .insert({
        group_id: groupId,
        user_id,
        is_primary: false,
        meals_per_week: meals_per_week || 7,
        added_by: added_by || null,
      })
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
      console.error('Error adding member:', error)
      return NextResponse.json(
        { error: 'Error al agregar miembro' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al agregar miembro' },
      { status: 500 }
    )
  }
}

// DELETE: Remover miembro de un grupo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('member_id')
    const userId = searchParams.get('user_id')
    const removedBy = searchParams.get('removed_by')

    if (!memberId && !userId) {
      return NextResponse.json(
        { error: 'Falta campo requerido: member_id o user_id' },
        { status: 400 }
      )
    }

    // No permitir remover al usuario principal
    const { data: member } = await supabase
      .from('subscription_group_members')
      .select('is_primary')
      .eq('id', memberId || userId)
      .single()

    if (member?.is_primary) {
      return NextResponse.json(
        { error: 'No se puede remover al usuario principal del grupo' },
        { status: 400 }
      )
    }

    // Remover miembro (soft delete)
    const { data, error } = await supabase
      .from('subscription_group_members')
      .update({
        removed_at: new Date().toISOString(),
        removed_by: removedBy || null,
      })
      .eq('group_id', groupId)
      .eq(memberId ? 'id' : 'user_id', memberId || userId)
      .select()
      .single()

    if (error) {
      console.error('Error removing member:', error)
      return NextResponse.json(
        { error: 'Error al remover miembro' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al remover miembro' },
      { status: 500 }
    )
  }
}

// PATCH: Actualizar miembro (designar principal, cambiar número de comidas)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id
    const body = await request.json()
    const { member_id, is_primary, meals_per_week } = body

    if (!member_id) {
      return NextResponse.json(
        { error: 'Falta campo requerido: member_id' },
        { status: 400 }
      )
    }

    // Si se designa como principal, quitar el principal anterior
    if (is_primary === true) {
      await supabase
        .from('subscription_group_members')
        .update({ is_primary: false })
        .eq('group_id', groupId)
        .eq('is_primary', true)
    }

    const updateData: any = {}
    if (is_primary !== undefined) {
      updateData.is_primary = is_primary
    }
    if (meals_per_week !== undefined) {
      updateData.meals_per_week = parseInt(meals_per_week)
    }

    const { data, error } = await supabase
      .from('subscription_group_members')
      .update(updateData)
      .eq('id', member_id)
      .eq('group_id', groupId)
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
      console.error('Error updating member:', error)
      return NextResponse.json(
        { error: 'Error al actualizar miembro' },
        { status: 500 }
      )
    }

    // Si se designó como principal, actualizar el grupo
    if (is_primary === true && data) {
      await supabase
        .from('subscription_groups')
        .update({ primary_user_id: data.user_id })
        .eq('id', groupId)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al actualizar miembro' },
      { status: 500 }
    )
  }
}


