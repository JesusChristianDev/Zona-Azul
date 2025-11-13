import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { SubscriptionGroup, SubscriptionGroupMember } from '@/lib/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET: Obtener grupos de suscripción
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('id')
    const userId = searchParams.get('user_id')

    // Si se proporciona userId, primero obtener los grupos donde es miembro
    let groupIds: string[] | null = null
    
    if (userId) {
      const { data: members, error: membersError } = await supabase
        .from('subscription_group_members')
        .select('group_id')
        .eq('user_id', userId)
        .is('removed_at', null) // Solo miembros activos

      if (membersError) {
        console.error('Error fetching group members:', membersError)
        return NextResponse.json(
          { error: 'Error al obtener miembros del grupo' },
          { status: 500 }
        )
      }

      if (members && members.length > 0) {
        groupIds = members.map((m: any) => m.group_id)
      } else {
        // Si no hay miembros, retornar array vacío
        return NextResponse.json([])
      }
    }

    // Construir la consulta
    let query = supabase
      .from('subscription_groups')
      .select(`
        *,
        subscription_group_members (
          id,
          user_id,
          is_primary,
          meals_per_week,
          added_at,
          removed_at,
          users:user_id (
            id,
            name,
            email
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (groupId) {
      query = query.eq('id', groupId)
    } else if (groupIds && groupIds.length > 0) {
      query = query.in('id', groupIds)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching subscription groups:', error)
      return NextResponse.json(
        { error: 'Error al obtener grupos de suscripción' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener grupos' },
      { status: 500 }
    )
  }
}

// POST: Crear un nuevo grupo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, group_type, primary_user_id, discount_percentage } = body

    if (!group_type || !primary_user_id) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: group_type, primary_user_id' },
        { status: 400 }
      )
    }

    // Crear grupo
    const { data: group, error: groupError } = await supabase
      .from('subscription_groups')
      .insert({
        name: name || null,
        group_type,
        primary_user_id,
        discount_percentage: discount_percentage || 0,
        is_active: true,
      })
      .select()
      .single()

    if (groupError) {
      console.error('Error creating group:', groupError)
      return NextResponse.json(
        { error: 'Error al crear grupo' },
        { status: 500 }
      )
    }

    // Agregar usuario principal como miembro
    await supabase
      .from('subscription_group_members')
      .insert({
        group_id: group.id,
        user_id: primary_user_id,
        is_primary: true,
        meals_per_week: 7,
      })

    // Obtener grupo completo con miembros
    const { data: fullGroup } = await supabase
      .from('subscription_groups')
      .select(`
        *,
        subscription_group_members (
          id,
          user_id,
          is_primary,
          meals_per_week,
          added_at,
          users:user_id (
            id,
            name,
            email
          )
        )
      `)
      .eq('id', group.id)
      .single()

    return NextResponse.json(fullGroup, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al crear grupo' },
      { status: 500 }
    )
  }
}

// PATCH: Actualizar grupo (descuentos, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { group_id, discount_percentage, name, is_active } = body

    if (!group_id) {
      return NextResponse.json(
        { error: 'Falta campo requerido: group_id' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (discount_percentage !== undefined) {
      updateData.discount_percentage = parseFloat(discount_percentage)
    }
    if (name !== undefined) {
      updateData.name = name
    }
    if (is_active !== undefined) {
      updateData.is_active = is_active
    }

    const { data, error } = await supabase
      .from('subscription_groups')
      .update(updateData)
      .eq('id', group_id)
      .select(`
        *,
        subscription_group_members (
          id,
          user_id,
          is_primary,
          meals_per_week,
          added_at,
          users:user_id (
            id,
            name,
            email
          )
        )
      `)
      .single()

    if (error) {
      console.error('Error updating group:', error)
      return NextResponse.json(
        { error: 'Error al actualizar grupo' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al actualizar grupo' },
      { status: 500 }
    )
  }
}


