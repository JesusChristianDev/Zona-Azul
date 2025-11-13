import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET: Obtener direcciones de un usuario
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    const { searchParams } = new URL(request.url)
    const requestedUserId = searchParams.get('user_id')

    // Si se especifica user_id en query, usar ese (solo admin puede hacer esto)
    const targetUserId = requestedUserId || userId

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verificar permisos: solo puede ver sus propias direcciones o ser admin
    if (requestedUserId && requestedUserId !== userId) {
      // Verificar si es admin
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (!user || user.role !== 'admin') {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 403 }
        )
      }
    }

    const { data, error } = await supabase
      .from('delivery_addresses')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching addresses:', error)
      return NextResponse.json(
        { error: 'Error al obtener direcciones' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener direcciones' },
      { status: 500 }
    )
  }
}

// POST: Crear nueva dirección
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      address_line1,
      address_line2,
      city,
      postal_code,
      country,
      is_primary,
      delivery_instructions,
    } = body

    if (!address_line1 || !city || !postal_code) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: address_line1, city, postal_code' },
        { status: 400 }
      )
    }

    // Si se marca como principal, desmarcar las demás (el trigger lo hace automáticamente, pero por seguridad)
    if (is_primary) {
      await supabase
        .from('delivery_addresses')
        .update({ is_primary: false })
        .eq('user_id', userId)
        .eq('is_primary', true)
    }

    const { data, error } = await supabase
      .from('delivery_addresses')
      .insert({
        user_id: userId,
        address_line1,
        address_line2: address_line2 || null,
        city,
        postal_code,
        country: country || 'España',
        is_primary: is_primary || false,
        is_active: true,
        delivery_instructions: delivery_instructions || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating address:', error)
      return NextResponse.json(
        { error: 'Error al crear dirección' },
        { status: 500 }
      )
    }

    // El trigger archiva automáticamente en delivery_address_history con change_type='created'

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al crear dirección' },
      { status: 500 }
    )
  }
}

// PATCH: Actualizar dirección
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      address_id,
      address_line1,
      address_line2,
      city,
      postal_code,
      country,
      is_primary,
      delivery_instructions,
    } = body

    if (!address_id) {
      return NextResponse.json(
        { error: 'Falta campo requerido: address_id' },
        { status: 400 }
      )
    }

    // Verificar que la dirección pertenece al usuario
    const { data: existingAddress } = await supabase
      .from('delivery_addresses')
      .select('user_id')
      .eq('id', address_id)
      .single()

    if (!existingAddress || existingAddress.user_id !== userId) {
      return NextResponse.json(
        { error: 'Dirección no encontrada o no autorizada' },
        { status: 404 }
      )
    }

    // Si se marca como principal, desmarcar las demás
    if (is_primary) {
      await supabase
        .from('delivery_addresses')
        .update({ is_primary: false })
        .eq('user_id', userId)
        .eq('is_primary', true)
        .neq('id', address_id)
    }

    const updateData: any = {}
    if (address_line1 !== undefined) updateData.address_line1 = address_line1
    if (address_line2 !== undefined) updateData.address_line2 = address_line2
    if (city !== undefined) updateData.city = city
    if (postal_code !== undefined) updateData.postal_code = postal_code
    if (country !== undefined) updateData.country = country
    if (is_primary !== undefined) updateData.is_primary = is_primary
    if (delivery_instructions !== undefined) updateData.delivery_instructions = delivery_instructions

    const { data, error } = await supabase
      .from('delivery_addresses')
      .update(updateData)
      .eq('id', address_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating address:', error)
      return NextResponse.json(
        { error: 'Error al actualizar dirección' },
        { status: 500 }
      )
    }

    // El trigger archiva automáticamente en delivery_address_history con change_type='updated'

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al actualizar dirección' },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar dirección (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const addressId = searchParams.get('address_id')

    if (!addressId) {
      return NextResponse.json(
        { error: 'Falta parámetro: address_id' },
        { status: 400 }
      )
    }

    // Verificar que la dirección pertenece al usuario
    const { data: existingAddress } = await supabase
      .from('delivery_addresses')
      .select('user_id')
      .eq('id', addressId)
      .single()

    if (!existingAddress || existingAddress.user_id !== userId) {
      return NextResponse.json(
        { error: 'Dirección no encontrada o no autorizada' },
        { status: 404 }
      )
    }

    // Soft delete: marcar como inactiva
    const { data, error } = await supabase
      .from('delivery_addresses')
      .update({ is_active: false })
      .eq('id', addressId)
      .select()
      .single()

    if (error) {
      console.error('Error deleting address:', error)
      return NextResponse.json(
        { error: 'Error al eliminar dirección' },
        { status: 500 }
      )
    }

    // El trigger archiva automáticamente en delivery_address_history con change_type='deleted'

    return NextResponse.json({ message: 'Dirección eliminada correctamente', address: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al eliminar dirección' },
      { status: 500 }
    )
  }
}


