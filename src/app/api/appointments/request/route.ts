import { NextRequest, NextResponse } from 'next/server'
import { createAppointment } from '../../../../lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    // Validar datos requeridos
    if (!body.date_time) {
      return NextResponse.json(
        { ok: false, error: 'Fecha y hora son requeridas' },
        { status: 400 }
      )
    }

    // Si viene 'slot' en lugar de 'date_time', usar 'slot'
    const dateTime = body.date_time || body.slot
    
    if (!dateTime) {
      return NextResponse.json(
        { ok: false, error: 'Fecha y hora son requeridas' },
        { status: 400 }
      )
    }

    const appointment = await createAppointment({
      user_id: userId,
      nutricionista_id: body.nutricionista_id || null,
      date_time: dateTime,
      status: 'pendiente',
      notes: body.notes || null,
    })

    if (!appointment) {
      return NextResponse.json(
        { ok: false, error: 'Error al crear la cita' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, appointment }, { status: 201 })
  } catch (err: any) {
    console.error('Error creating appointment:', err)
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    )
  }
}
