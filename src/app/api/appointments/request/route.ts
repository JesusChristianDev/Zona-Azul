import { NextRequest, NextResponse } from 'next/server'
import { createAppointment, checkAppointmentConflict } from '@/lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    // Validar datos requeridos
    if (!body.date_time && !body.slot) {
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

    // Verificar conflictos de horario
    const conflict = await checkAppointmentConflict(
      dateTime,
      undefined, // No excluir ninguna cita (es una nueva)
      body.nutricionista_id || null,
      userId || null
    )

    if (conflict.hasConflict) {
      return NextResponse.json(
        { ok: false, error: conflict.conflictReason || 'Ya existe una cita en este horario' },
        { status: 409 } // 409 Conflict
      )
    }

    // Si el usuario está autenticado, usar su ID
    // Si no está autenticado, NO crear usuario todavía - se creará cuando el nutricionista confirme la cita
    let finalUserId: string | null = userId || null

    // Crear notas con información del invitado si no está autenticado
    let notes = body.notes?.trim() || null
    if (!userId) {
      // Usuario no autenticado - guardar datos en notes para crear usuario después
      if (!body.email || !body.name) {
        return NextResponse.json(
          { ok: false, error: 'Email y nombre son requeridos para solicitar una cita' },
          { status: 400 }
        )
      }

      // Guardar datos del invitado en formato JSON dentro de notes
      const guestData = {
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        phone: body.phone?.trim() || null,
      }
      
      const guestDataJson = JSON.stringify(guestData)
      
      // Si hay notas del usuario, agregarlas primero, luego los datos del invitado
      if (notes) {
        notes = `--- MOTIVO DE LA CITA ---\n${notes}\n\n--- DATOS DEL INVITADO ---\n${guestDataJson}`
      } else {
        notes = `--- DATOS DEL INVITADO ---\n${guestDataJson}`
      }
    } else {
      // Usuario autenticado - solo guardar las notas si las proporcionó
      // Las notas pueden contener el motivo de la cita
      if (notes) {
        notes = `--- MOTIVO DE LA CITA ---\n${notes}`
      }
    }

    const appointment = await createAppointment({
      user_id: finalUserId,
      nutricionista_id: body.nutricionista_id || null,
      date_time: dateTime,
      status: 'pendiente',
      notes: notes,
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
