import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET: Obtener tracking de un pedido
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('user_role')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const orderId = params.id

    // Verificar que el pedido existe y el usuario tiene permiso
    const { data: order } = await supabase
      .from('orders')
      .select('user_id, repartidor_id, status')
      .eq('id', orderId)
      .single()

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    // Verificar permisos según rol
    if (role === 'suscriptor' && order.user_id !== userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    if (role === 'repartidor' && order.repartidor_id !== userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    // Obtener último tracking
    const { data: tracking, error: trackingError } = await supabase
      .from('order_tracking')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (trackingError && trackingError.code !== 'PGRST116') {
      console.error('Error fetching tracking:', trackingError)
      return NextResponse.json(
        { error: 'Error al obtener tracking' },
        { status: 500 }
      )
    }

    // Obtener historial completo de tracking
    const { data: trackingHistory } = await supabase
      .from('order_tracking')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    return NextResponse.json({
      current: tracking || null,
      history: trackingHistory || [],
      order_status: order.status,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener tracking' },
      { status: 500 }
    )
  }
}

// POST: Actualizar tracking de un pedido
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('user_role')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const orderId = params.id
    const body = await request.json()
    const {
      status,
      location_latitude,
      location_longitude,
      estimated_delivery_time,
    } = body

    // Verificar que el pedido existe
    const { data: order } = await supabase
      .from('orders')
      .select('user_id, repartidor_id, status')
      .eq('id', orderId)
      .single()

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    // Solo repartidor y admin pueden actualizar tracking
    if (role !== 'repartidor' && role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado. Solo repartidores y administradores pueden actualizar tracking' },
        { status: 403 }
      )
    }

    // Si es repartidor, verificar que el pedido está asignado a él
    if (role === 'repartidor' && order.repartidor_id !== userId) {
      return NextResponse.json(
        { error: 'No autorizado. Este pedido no está asignado a ti' },
        { status: 403 }
      )
    }

    // Validar estado
    if (status && !['preparando', 'en_camino', 'entregado', 'cancelado'].includes(status)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      )
    }

    // Crear registro de tracking
    const trackingData: any = {
      order_id: orderId,
      status: status || order.status,
      updated_by: userId,
    }

    if (location_latitude !== undefined) trackingData.location_latitude = location_latitude
    if (location_longitude !== undefined) trackingData.location_longitude = location_longitude
    if (estimated_delivery_time) trackingData.estimated_delivery_time = estimated_delivery_time

    const { data: tracking, error: trackingError } = await supabase
      .from('order_tracking')
      .insert(trackingData)
      .select()
      .single()

    if (trackingError) {
      console.error('Error creating tracking:', trackingError)
      return NextResponse.json(
        { error: 'Error al actualizar tracking' },
        { status: 500 }
      )
    }

    // Actualizar estado del pedido si cambió
    if (status && status !== order.status) {
      const updateData: any = { status }
      
      if (status === 'entregado') {
        updateData.actual_delivery_time = new Date().toISOString()
      }

      if (estimated_delivery_time) {
        updateData.estimated_delivery_time = estimated_delivery_time
      }

      await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
    }

    return NextResponse.json({ tracking }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al actualizar tracking' },
      { status: 500 }
    )
  }
}


