import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// POST: Agregar item a un pedido
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
    const { order_id, meal_id, quantity, price } = body

    if (!order_id || !meal_id || !quantity || !price) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: order_id, meal_id, quantity, price' },
        { status: 400 }
      )
    }

    // Verificar que el pedido pertenece al usuario
    const { data: order } = await supabase
      .from('orders')
      .select('user_id')
      .eq('id', order_id)
      .single()

    if (!order || order.user_id !== userId) {
      return NextResponse.json(
        { error: 'Pedido no encontrado o no autorizado' },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from('order_items')
      .insert({
        order_id,
        meal_id,
        quantity: parseInt(quantity),
        price: parseFloat(price),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating order item:', error)
      return NextResponse.json(
        { error: 'Error al agregar item al pedido' },
        { status: 500 }
      )
    }

    return NextResponse.json({ item: data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al agregar item' },
      { status: 500 }
    )
  }
}


