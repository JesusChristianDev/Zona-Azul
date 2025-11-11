import { NextRequest, NextResponse } from 'next/server'
import { getAllOrders, getOrdersByUserId, createOrder } from '../../../lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener pedidos
export async function GET(request: NextRequest) {
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

    // Admin ve todos los pedidos, otros solo los suyos
    const orders = role === 'admin'
      ? await getAllOrders()
      : await getOrdersByUserId(userId)

    return NextResponse.json({ orders })
  } catch (error: any) {
    console.error('Error fetching orders:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    return NextResponse.json(
      { error: 'Error al obtener pedidos', details: error?.message },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo pedido
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
    const { total_amount, delivery_address, delivery_instructions } = body

    if (!total_amount || total_amount <= 0) {
      return NextResponse.json(
        { error: 'El monto total es requerido y debe ser mayor a 0' },
        { status: 400 }
      )
    }

    const order = await createOrder({
      user_id: userId,
      status: 'pendiente',
      total_amount: parseFloat(total_amount),
      delivery_address: delivery_address || null,
      delivery_instructions: delivery_instructions || null,
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Error al crear pedido' },
        { status: 500 }
      )
    }

    return NextResponse.json({ order }, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Error al crear pedido' },
      { status: 500 }
    )
  }
}

