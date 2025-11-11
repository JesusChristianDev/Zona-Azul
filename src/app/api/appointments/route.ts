import { NextRequest, NextResponse } from 'next/server'
import { getAllAppointments, getAppointmentsByUserId, getAppointmentsByNutricionistaId } from '../../../lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener citas
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

    let appointments

    if (role === 'admin') {
      appointments = await getAllAppointments()
    } else if (role === 'nutricionista') {
      appointments = await getAppointmentsByNutricionistaId(userId)
    } else {
      appointments = await getAppointmentsByUserId(userId)
    }

    return NextResponse.json({ appointments })
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json(
      { error: 'Error al obtener citas' },
      { status: 500 }
    )
  }
}

