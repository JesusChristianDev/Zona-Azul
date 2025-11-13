import { NextRequest, NextResponse } from 'next/server'
import { updateAppointment, getAppointmentById, deleteAppointment, checkAppointmentConflict } from '@/lib/db'
import { 
  syncAppointmentToCalendar, 
  updateCalendarEventForAppointment,
  deleteCalendarEventForAppointment 
} from '@/lib/calendarSync'
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

    // Si se está cambiando la fecha/hora, verificar conflictos
    if (body.date_time) {
      const newDateTime = body.date_time
      const newNutricionistaId = body.nutricionista_id !== undefined 
        ? body.nutricionista_id 
        : currentAppointment.nutricionista_id

      const conflict = await checkAppointmentConflict(
        newDateTime,
        params.id, // Excluir la cita actual
        newNutricionistaId || null,
        currentAppointment.user_id
      )

      if (conflict.hasConflict) {
        return NextResponse.json(
          { error: conflict.conflictReason || 'Ya existe una cita en este horario' },
          { status: 409 } // 409 Conflict
        )
      }
    }

    if (body.status) updateData.status = body.status
    if (body.nutricionista_id !== undefined) updateData.nutricionista_id = body.nutricionista_id
    if (body.date_time) updateData.date_time = body.date_time
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.user_id !== undefined) updateData.user_id = body.user_id

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
          const eventId = await syncAppointmentToCalendar(params.id, nutricionistaId)
          if (eventId) {
            console.log('✅ Evento creado en Google Calendar:', eventId, 'para cita:', params.id)
          } else {
            console.warn('⚠️ No se pudo crear evento en Google Calendar para cita:', params.id)
          }
        } else {
          console.warn('⚠️ No hay nutricionista asignado para crear evento en calendario para cita:', params.id)
        }
      }
      // Si se cancela la cita y tenía evento, eliminarlo
      else if (body.status === 'cancelada' && previousStatus !== 'cancelada') {
        if (currentAppointment.google_calendar_event_id) {
          const deleted = await deleteCalendarEventForAppointment(params.id)
          if (deleted) {
            console.log('✅ Evento eliminado de Google Calendar para cita:', params.id)
          } else {
            console.warn('⚠️ No se pudo eliminar evento de Google Calendar para cita:', params.id)
          }
        }
      }
      // Si se actualiza la cita y ya tiene evento, actualizarlo
      else if (appointment.google_calendar_event_id && 
               (body.date_time || body.notes !== undefined || body.status)) {
        const updated = await updateCalendarEventForAppointment(params.id)
        if (updated) {
          console.log('✅ Evento actualizado en Google Calendar para cita:', params.id)
        } else {
          console.warn('⚠️ No se pudo actualizar evento en Google Calendar para cita:', params.id)
        }
      }
      // Si se asigna un nutricionista a una cita confirmada, crear evento
      else if (body.nutricionista_id && 
               body.nutricionista_id !== previousNutricionistaId &&
               appointment.status === 'confirmada' &&
               !appointment.google_calendar_event_id) {
        const eventId = await syncAppointmentToCalendar(params.id, appointment.nutricionista_id)
        if (eventId) {
          console.log('✅ Evento creado en Google Calendar al asignar nutricionista:', eventId, 'para cita:', params.id)
        } else {
          console.warn('⚠️ No se pudo crear evento en Google Calendar al asignar nutricionista para cita:', params.id)
        }
      }
    } catch (calendarError: any) {
      console.error('❌ Error syncing with calendar (non-blocking):', calendarError)
      console.error('Calendar error details:', {
        message: calendarError?.message,
        stack: calendarError?.stack,
      })
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

// DELETE - Eliminar cita
export async function DELETE(
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

    // Solo admin puede eliminar citas
    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado. Solo administradores pueden eliminar citas.' },
        { status: 403 }
      )
    }

    // Obtener cita actual para verificar si tiene evento en calendario
    const currentAppointment = await getAppointmentById(params.id)
    if (!currentAppointment) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      )
    }

    // Guardar información necesaria antes de eliminar la cita
    const eventId = currentAppointment.google_calendar_event_id
    const nutricionistaId = currentAppointment.nutricionista_id

    // Eliminar evento del calendario ANTES de eliminar la cita
    // (necesitamos la información de la cita para hacerlo)
    if (eventId && nutricionistaId) {
      try {
        // Importar funciones necesarias
        const { getCalendarCredentials } = await import('../../../../lib/db')
        const { deleteCalendarEvent, refreshAccessToken } = await import('../../../../lib/googleCalendar')
        
        const credentials = await getCalendarCredentials(nutricionistaId)
        if (credentials && credentials.enabled) {
          let accessToken = credentials.access_token
          let refreshToken = credentials.refresh_token

          // Refrescar token si es necesario
          if (credentials.token_expiry) {
            const expiryDate = new Date(credentials.token_expiry)
            const now = new Date()
            
            if (expiryDate.getTime() - now.getTime() < 5 * 60 * 1000 && refreshToken) {
              try {
                const newTokens = await refreshAccessToken(refreshToken)
                accessToken = newTokens.access_token || accessToken
                refreshToken = newTokens.refresh_token || refreshToken
              } catch (error) {
                console.error('Error refreshing token:', error)
              }
            }
          }

          // Eliminar el evento del calendario
          await deleteCalendarEvent(
            accessToken,
            refreshToken || undefined,
            credentials.calendar_id || 'primary',
            eventId
          )
          console.log('Evento eliminado de Google Calendar:', eventId)
        }
      } catch (calendarError: any) {
        console.error('Error deleting calendar event (non-blocking):', calendarError)
        // Continuar con la eliminación aunque falle el calendario
      }
    }

    // Eliminar la cita de la base de datos
    const deleted = await deleteAppointment(params.id)
    if (!deleted) {
      return NextResponse.json(
        { error: 'Error al eliminar cita' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Cita eliminada correctamente' })
  } catch (error) {
    console.error('Error deleting appointment:', error)
    return NextResponse.json(
      { error: 'Error al eliminar cita' },
      { status: 500 }
    )
  }
}

