import { NextRequest, NextResponse } from 'next/server'
import {
  createOrderIncident,
  getOrderIncidentsByRepartidorId,
  getOrderIncidentByOrderId,
} from '../../../lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener incidencias
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

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('order_id')
    const repartidorId = searchParams.get('repartidor_id') || (role === 'repartidor' ? userId : null)

    if (orderId) {
      const incident = await getOrderIncidentByOrderId(orderId)
      return NextResponse.json({ incident })
    }

    if (repartidorId) {
      // Solo el repartidor o admin puede ver sus incidencias
      if (role !== 'admin' && repartidorId !== userId) {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 403 }
        )
      }

      const incidents = await getOrderIncidentsByRepartidorId(repartidorId)
      return NextResponse.json({ incidents })
    }

    return NextResponse.json({ incidents: [] })
  } catch (error) {
    console.error('Error fetching order incidents:', error)
    return NextResponse.json(
      { error: 'Error al obtener incidencias' },
      { status: 500 }
    )
  }
}

// POST - Crear incidencia
export async function POST(request: NextRequest) {
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

    if (role !== 'repartidor') {
      return NextResponse.json(
        { error: 'Solo repartidores pueden reportar incidencias' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { order_id, description } = body

    if (!order_id || !description) {
      return NextResponse.json(
        { error: 'ID de pedido y descripción son requeridos' },
        { status: 400 }
      )
    }

    const incident = await createOrderIncident({
      order_id,
      repartidor_id: userId,
      description,
      status: 'reported',
    })

    if (!incident) {
      return NextResponse.json(
        { error: 'Error al crear incidencia' },
        { status: 500 }
      )
    }

    return NextResponse.json({ incident }, { status: 201 })
  } catch (error) {
    console.error('Error creating order incident:', error)
    return NextResponse.json(
      { error: 'Error al crear incidencia' },
      { status: 500 }
    )
  }
}

