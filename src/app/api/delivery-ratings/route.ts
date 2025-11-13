import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET: Obtener valoraciones
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('user_role')?.value
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('order_id')
    const repartidorId = searchParams.get('repartidor_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    let query = supabase
      .from('delivery_ratings')
      .select(`
        *,
        orders:order_id (
          id,
          user_id,
          repartidor_id
        )
      `)
      .is('deleted_at', null)

    // Filtrar según rol
    if (role === 'suscriptor') {
      // Usuario solo ve sus propias valoraciones
      query = query.eq('user_id', userId)
    } else if (role === 'repartidor') {
      // Repartidor solo ve valoraciones de sus entregas (si están compartidas)
      query = query
        .eq('repartidor_id', userId)
        .eq('is_visible_to_repartidor', true)
    } else if (role === 'admin') {
      // Admin ve todas las valoraciones
      // No filtrar
    } else {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    if (orderId) {
      query = query.eq('order_id', orderId)
    }

    if (repartidorId) {
      query = query.eq('repartidor_id', repartidorId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching ratings:', error)
      return NextResponse.json(
        { error: 'Error al obtener valoraciones' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener valoraciones' },
      { status: 500 }
    )
  }
}

// POST: Crear valoración
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('user_role')?.value

    if (!userId || role !== 'suscriptor') {
      return NextResponse.json(
        { error: 'Solo los usuarios pueden crear valoraciones' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { order_id, rating, comment } = body

    if (!order_id || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: order_id, rating (1-5)' },
        { status: 400 }
      )
    }

    // Verificar que el pedido pertenece al usuario y está entregado
    const { data: order } = await supabase
      .from('orders')
      .select('user_id, repartidor_id, status')
      .eq('id', order_id)
      .single()

    if (!order || order.user_id !== userId) {
      return NextResponse.json(
        { error: 'Pedido no encontrado o no autorizado' },
        { status: 404 }
      )
    }

    if (order.status !== 'entregado') {
      return NextResponse.json(
        { error: 'Solo se pueden valorar pedidos entregados' },
        { status: 400 }
      )
    }

    // Verificar si ya existe una valoración para este pedido
    const { data: existingRating } = await supabase
      .from('delivery_ratings')
      .select('id')
      .eq('order_id', order_id)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single()

    if (existingRating) {
      return NextResponse.json(
        { error: 'Ya existe una valoración para este pedido. Usa PATCH para actualizarla.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('delivery_ratings')
      .insert({
        order_id,
        user_id: userId,
        repartidor_id: order.repartidor_id || null,
        rating: parseInt(rating),
        comment: comment || null,
        is_visible_to_admin: true,
        is_visible_to_repartidor: false, // Por defecto no visible, admin decide
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating rating:', error)
      return NextResponse.json(
        { error: 'Error al crear valoración' },
        { status: 500 }
      )
    }

    return NextResponse.json({ rating: data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al crear valoración' },
      { status: 500 }
    )
  }
}


