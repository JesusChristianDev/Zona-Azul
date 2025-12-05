import { NextRequest, NextResponse } from 'next/server'
import type { MealSettingResponse } from '../utils'
import {
  getOrderById,
  updateOrder,
  upsertOrderMealSettings,
  getOrderMealSettingsByOrderId,
} from '@/lib/db'
import { cookies } from 'next/headers'
import { groupMealSettingsByOrder, normalizeMealSettingsPayload } from '../utils'

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

    const mealSettings = await getOrderMealSettingsByOrderId(order.id)
    const groupedSettings = groupMealSettingsByOrder(mealSettings)
    return NextResponse.json({
      order: {
        ...order,
        meal_settings: groupedSettings[order.id] || [],
      },
    })
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
    const updateData: Record<string, any> = {}

    // Verificar que el pedido pertenece al usuario (excepto admin)
    const existingOrder = await getOrderById(params.id)
    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    if (role !== 'admin' && existingOrder.user_id !== userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    // Admin puede cambiar cualquier campo
    if (role === 'admin') {
      if (body.status) updateData.status = body.status
      if (body.repartidor_id !== undefined) updateData.repartidor_id = body.repartidor_id
      if (body.estimated_delivery_time) updateData.estimated_delivery_time = body.estimated_delivery_time
      if (body.actual_delivery_time) updateData.actual_delivery_time = body.actual_delivery_time
      if (body.delivery_mode) updateData.delivery_mode = body.delivery_mode
      if (body.delivery_address_id !== undefined) updateData.delivery_address_id = body.delivery_address_id
      if (body.pickup_location !== undefined) updateData.pickup_location = body.pickup_location
    }
    // Repartidor solo puede actualizar estado y tiempo de entrega
    else if (role === 'repartidor') {
      if (body.status) updateData.status = body.status
      if (body.actual_delivery_time) updateData.actual_delivery_time = body.actual_delivery_time
    }
    // Suscriptor puede actualizar método de entrega
    else if (existingOrder.user_id === userId) {
      if (body.delivery_mode) updateData.delivery_mode = body.delivery_mode
      if (body.delivery_address_id !== undefined) updateData.delivery_address_id = body.delivery_address_id
      if (body.pickup_location !== undefined) updateData.pickup_location = body.pickup_location
    }

    let order = existingOrder
    if (Object.keys(updateData).length > 0) {
      const updatedOrder = await updateOrder(params.id, updateData)
      if (!updatedOrder) {
        return NextResponse.json(
          { error: 'Error al actualizar pedido' },
          { status: 500 }
        )
      }
      order = updatedOrder
    }

    const mealsPayload = Array.isArray(body.meal_settings)
      ? body.meal_settings
      : Array.isArray(body.meals)
        ? body.meals
        : []

    let mealSettingsResponse: MealSettingResponse[] = []
    if (mealsPayload.length > 0) {
      try {
        const normalizedMeals = normalizeMealSettingsPayload(mealsPayload)
        const savedSettings = await upsertOrderMealSettings(order.id, normalizedMeals)
        const groupedSettings = groupMealSettingsByOrder(savedSettings)
        mealSettingsResponse = groupedSettings[order.id] || []
      } catch (mealError: any) {
        return NextResponse.json(
          { error: mealError?.message || 'Error al guardar la configuración de entrega' },
          { status: 400 }
        )
      }
    } else {
      const existingSettings = await getOrderMealSettingsByOrderId(order.id)
      const groupedSettings = groupMealSettingsByOrder(existingSettings)
      mealSettingsResponse = groupedSettings[order.id] || []
    }

    return NextResponse.json({
      order: {
        ...order,
        meal_settings: mealSettingsResponse,
      },
    })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Error al actualizar pedido' },
      { status: 500 }
    )
  }
}
