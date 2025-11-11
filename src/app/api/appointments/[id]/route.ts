import { NextRequest, NextResponse } from 'next/server'
import { updateAppointment, getAppointmentById } from '../../../../lib/db'
import { 
  syncAppointmentToCalendar, 
  updateCalendarEventForAppointment,
  deleteCalendarEventForAppointment 
} from '../../../../lib/calendarSync'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// PATCH - Actualizar cita
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

    // Obtener cita actual para verificar cambios
    const currentAppointment = await getAppointmentById(params.id)
    if (!currentAppointment) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      )
    }

    const previousStatus = currentAppointment.status
    const previousNutricionistaId = currentAppointment.nutricionista_id

    if (body.status) updateData.status = body.status
    if (body.nutricionista_id !== undefined) updateData.nutricionista_id = body.nutricionista_id
    if (body.date_time) updateData.date_time = body.date_time
    if (body.notes !== undefined) updateData.notes = body.notes

    const appointment = await updateAppointment(params.id, updateData)
    if (!appointment) {
      return NextResponse.json(
        { error: 'Error al actualizar cita' },
        { status: 500 }
      )
    }

    // Sincronizar con Google Calendar
    try {
      // Si se confirma la cita y no tenía evento en calendario, crear uno
      if (body.status === 'confirmada' && previousStatus !== 'confirmada') {
        const nutricionistaId = appointment.nutricionista_id || userId
        if (nutricionistaId) {
          await syncAppointmentToCalendar(params.id, nutricionistaId)
        }
      }
      // Si se cancela la cita y tenía evento, eliminarlo
      else if (body.status === 'cancelada' && previousStatus !== 'cancelada') {
        if (currentAppointment.google_calendar_event_id) {
          await deleteCalendarEventForAppointment(params.id)
        }
      }
      // Si se actualiza la cita y ya tiene evento, actualizarlo
      else if (appointment.google_calendar_event_id && 
               (body.date_time || body.notes !== undefined || body.status)) {
        await updateCalendarEventForAppointment(params.id)
      }
      // Si se asigna un nutricionista a una cita confirmada, crear evento
      else if (body.nutricionista_id && 
               body.nutricionista_id !== previousNutricionistaId &&
               appointment.status === 'confirmada' &&
               !appointment.google_calendar_event_id) {
        await syncAppointmentToCalendar(params.id, appointment.nutricionista_id)
      }
    } catch (calendarError: any) {
      console.error('Error syncing with calendar (non-blocking):', calendarError)
      // No fallar la actualización si hay error en el calendario
    }

    return NextResponse.json({ appointment })
  } catch (error) {
    console.error('Error updating appointment:', error)
    return NextResponse.json(
      { error: 'Error al actualizar cita' },
      { status: 500 }
    )
  }
}

