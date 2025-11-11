import { NextRequest, NextResponse } from 'next/server'
import { getOrderById, updateOrder } from '../../../../lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener pedido por ID
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

    const order = await getOrderById(params.id)
    if (!order) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    // Solo admin o el dueño del pedido pueden verlo
    if (role !== 'admin' && order.user_id !== userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Error al obtener pedido' },
      { status: 500 }
    )
  }
}

// PATCH - Actualizar pedido
export async function PATCH(
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

    const body = await request.json()
    const updateData: any = {}

    // Admin puede cambiar cualquier campo
    if (role === 'admin') {
      if (body.status) updateData.status = body.status
      if (body.repartidor_id !== undefined) updateData.repartidor_id = body.repartidor_id
      if (body.estimated_delivery_time) updateData.estimated_delivery_time = body.estimated_delivery_time
      if (body.actual_delivery_time) updateData.actual_delivery_time = body.actual_delivery_time
    }
    // Repartidor solo puede actualizar estado y tiempo de entrega
    else if (role === 'repartidor') {
      if (body.status) updateData.status = body.status
      if (body.actual_delivery_time) updateData.actual_delivery_time = body.actual_delivery_time
    }

    const order = await updateOrder(params.id, updateData)
    if (!order) {
      return NextResponse.json(
        { error: 'Error al actualizar pedido' },
        { status: 500 }
      )
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Error al actualizar pedido' },
      { status: 500 }
    )
  }
}

