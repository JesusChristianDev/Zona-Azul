import { NextRequest, NextResponse } from 'next/server'
import {
  getAllOrders,
  getOrdersByUserId,
  createOrder,
  upsertOrderMealSettings,
  getOrderMealSettingsByOrderIds,
} from '@/lib/db'
import { cookies } from 'next/headers'
import { groupMealSettingsByOrder, normalizeMealSettingsPayload } from './utils'
import type { DatabaseOrder } from '@/lib/db'

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

    // Filtrar pedidos según rol:
    // - Admin: ve todos los pedidos
    // - Repartidor: ve solo los pedidos asignados a él
    // - Usuario/Suscriptor: ve solo sus propios pedidos
    let orders
    if (role === 'admin') {
      orders = await getAllOrders()
    } else if (role === 'repartidor') {
      const { getOrdersByRepartidorId } = await import('@/lib/db')
      orders = await getOrdersByRepartidorId(userId)
    } else {
      orders = await getOrdersByUserId(userId)
    }

    const ordersWithMeals = await attachMealSettingsToOrders(orders)
    return NextResponse.json({ orders: ordersWithMeals })
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
    const {
      total_amount,
      delivery_address,
      delivery_instructions,
      delivery_mode,
      delivery_address_id,
      pickup_location,
      meals,
      meal_settings,
    } = body

    const mealsPayload = Array.isArray(meal_settings)
      ? meal_settings
      : Array.isArray(meals)
        ? meals
        : []

    const normalizedTotalAmount =
      typeof total_amount === 'number'
        ? total_amount
        : total_amount
        ? Number.parseFloat(total_amount)
        : 0

    const order = await createOrder({
      user_id: userId,
      status: 'pendiente',
      total_amount: Number.isFinite(normalizedTotalAmount) ? normalizedTotalAmount : 0,
      delivery_address: delivery_address || null,
      delivery_instructions: delivery_instructions || null,
      delivery_mode: delivery_mode === 'pickup' ? 'pickup' : 'delivery',
      delivery_address_id: delivery_mode === 'delivery' ? delivery_address_id || null : null,
      pickup_location: delivery_mode === 'pickup' ? pickup_location || null : null,
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Error al crear pedido' },
        { status: 500 }
      )
    }

    let mealSettingsResponse = []
    if (mealsPayload.length > 0) {
      try {
        const normalizedMeals = normalizeMealSettingsPayload(mealsPayload)
        const savedSettings = await upsertOrderMealSettings(order.id, normalizedMeals)
        const grouped = groupMealSettingsByOrder(savedSettings)
        mealSettingsResponse = grouped[order.id] || []
      } catch (mealError: any) {
        return NextResponse.json(
          { error: mealError?.message || 'Error al configurar la entrega de las comidas' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      {
        order: {
          ...order,
          meal_settings: mealSettingsResponse,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Error al crear pedido' },
      { status: 500 }
    )
  }
}

async function attachMealSettingsToOrders(orders: DatabaseOrder[]) {
  if (!orders.length) return orders
  const mealSettings = await getOrderMealSettingsByOrderIds(orders.map((order) => order.id))
  const grouped = groupMealSettingsByOrder(mealSettings)
  return orders.map((order) => ({
    ...order,
    meal_settings: grouped[order.id] || [],
  }))
}

