/**
 * Funciones helper para sincronizar citas con Google Calendar
 */

import {
  getCalendarCredentials,
  updateAppointment,
  getAppointmentById,
  getUserById,
} from './db'
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  refreshAccessToken,
} from './googleCalendar'

// Sincronizar cita con Google Calendar cuando se confirma
export async function syncAppointmentToCalendar(
  appointmentId: string,
  nutricionistaId: string
): Promise<string | null> {
  try {
    // Obtener credenciales del nutricionista
    const credentials = await getCalendarCredentials(nutricionistaId)
    if (!credentials || !credentials.enabled) {
      console.log('Calendar not connected for nutricionista:', nutricionistaId)
      return null
    }

    // Verificar si el token expiró y refrescarlo si es necesario
    let accessToken = credentials.access_token
    let refreshToken = credentials.refresh_token

    if (credentials.token_expiry) {
      const expiryDate = new Date(credentials.token_expiry)
      const now = new Date()
      
      // Si el token expira en menos de 5 minutos, refrescarlo
      if (expiryDate.getTime() - now.getTime() < 5 * 60 * 1000) {
        if (refreshToken) {
          try {
            const newTokens = await refreshAccessToken(refreshToken)
            accessToken = newTokens.access_token || accessToken
            refreshToken = newTokens.refresh_token || refreshToken
            
            // Actualizar credenciales en la base de datos
            const { updateCalendarCredentials } = await import('./db')
            await updateCalendarCredentials(nutricionistaId, {
              access_token: accessToken,
              refresh_token: refreshToken,
              token_expiry: newTokens.expiry_date
                ? new Date(newTokens.expiry_date).toISOString()
                : undefined,
            })
          } catch (error) {
            console.error('Error refreshing token:', error)
            // Continuar con el token actual
          }
        }
      }
    }

    // Obtener datos de la cita
    const appointment = await getAppointmentById(appointmentId)
    if (!appointment) {
      console.error('Appointment not found:', appointmentId)
      return null
    }

    // Si la cita no tiene user_id, extraer datos del invitado de las notes
    let userName = 'Cliente'
    let userEmail = ''
    
    if (appointment.user_id) {
      const user = await getUserById(appointment.user_id)
      if (user) {
        userName = user.name
        userEmail = user.email
      } else {
        console.warn('User not found for appointment:', appointmentId, 'user_id:', appointment.user_id)
      }
    } else {
      // Extraer datos del invitado de las notes
      if (appointment.notes) {
        try {
          const guestDataMatch = appointment.notes.match(/--- DATOS DEL INVITADO ---\s*(\{[\s\S]*?\})/)
          if (guestDataMatch) {
            const guestData = JSON.parse(guestDataMatch[1])
            userName = guestData.name || 'Cliente'
            userEmail = guestData.email || ''
          }
        } catch (error) {
          console.error('Error parsing guest data from notes:', error)
        }
      }
    }

    // Crear evento en Google Calendar
    const dateTime = new Date(appointment.date_time)
    const endDateTime = new Date(dateTime)
    endDateTime.setHours(endDateTime.getHours() + 1) // Duración de 1 hora por defecto

    const eventData = {
      summary: `Consulta nutricional - ${userName}`,
      description: appointment.notes || `Consulta nutricional con ${userName}`,
      start: {
        dateTime: dateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid',
      },
      attendees: userEmail ? [{ email: userEmail }] : [],
    }

    const calendarEvent = await createCalendarEvent(
      accessToken,
      refreshToken || undefined,
      credentials.calendar_id,
      eventData
    )

    if (calendarEvent && calendarEvent.id) {
      // Actualizar cita con el ID del evento de Google Calendar
      await updateAppointment(appointmentId, {
        google_calendar_event_id: calendarEvent.id,
      })

      return calendarEvent.id
    }

    return null
  } catch (error: any) {
    console.error('Error syncing appointment to calendar:', error)
    return null
  }
}

// Actualizar evento en Google Calendar cuando se actualiza la cita
export async function updateCalendarEventForAppointment(
  appointmentId: string
): Promise<boolean> {
  try {
    const appointment = await getAppointmentById(appointmentId)
    if (!appointment || !appointment.google_calendar_event_id || !appointment.nutricionista_id) {
      return false
    }

    const credentials = await getCalendarCredentials(appointment.nutricionista_id)
    if (!credentials || !credentials.enabled) {
      return false
    }

    // Verificar y refrescar token si es necesario
    let accessToken = credentials.access_token
    let refreshToken = credentials.refresh_token

    if (credentials.token_expiry) {
      const expiryDate = new Date(credentials.token_expiry)
      const now = new Date()
      
      if (expiryDate.getTime() - now.getTime() < 5 * 60 * 1000 && refreshToken) {
        try {
          const newTokens = await refreshAccessToken(refreshToken)
          accessToken = newTokens.access_token || accessToken
          refreshToken = newTokens.refresh_token || refreshToken
          
          const { updateCalendarCredentials } = await import('./db')
          await updateCalendarCredentials(appointment.nutricionista_id, {
            access_token: accessToken,
            refresh_token: refreshToken,
            token_expiry: newTokens.expiry_date
              ? new Date(newTokens.expiry_date).toISOString()
              : undefined,
          })
        } catch (error) {
          console.error('Error refreshing token:', error)
        }
      }
    }

    // Obtener datos del usuario o del invitado
    let userName = 'Cliente'
    
    if (appointment.user_id) {
      const user = await getUserById(appointment.user_id)
      if (user) {
        userName = user.name
      }
    } else {
      // Extraer datos del invitado de las notes
      if (appointment.notes) {
        try {
          const guestDataMatch = appointment.notes.match(/--- DATOS DEL INVITADO ---\s*(\{[\s\S]*?\})/)
          if (guestDataMatch) {
            const guestData = JSON.parse(guestDataMatch[1])
            userName = guestData.name || 'Cliente'
          }
        } catch (error) {
          console.error('Error parsing guest data from notes:', error)
        }
      }
    }

    const dateTime = new Date(appointment.date_time)
    const endDateTime = new Date(dateTime)
    endDateTime.setHours(endDateTime.getHours() + 1)

    await updateCalendarEvent(
      accessToken,
      refreshToken || undefined,
      credentials.calendar_id,
      appointment.google_calendar_event_id,
      {
        summary: `Consulta nutricional - ${userName}`,
        description: appointment.notes || `Consulta nutricional con ${userName}`,
        start: {
          dateTime: dateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid',
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid',
        },
      }
    )

    return true
  } catch (error: any) {
    console.error('Error updating calendar event:', error)
    return false
  }
}

// Eliminar evento de Google Calendar cuando se cancela la cita
export async function deleteCalendarEventForAppointment(
  appointmentId: string
): Promise<boolean> {
  try {
    const appointment = await getAppointmentById(appointmentId)
    if (!appointment || !appointment.google_calendar_event_id || !appointment.nutricionista_id) {
      return false
    }

    const credentials = await getCalendarCredentials(appointment.nutricionista_id)
    if (!credentials || !credentials.enabled) {
      return false
    }

    // Verificar y refrescar token si es necesario
    let accessToken = credentials.access_token
    let refreshToken = credentials.refresh_token

    if (credentials.token_expiry) {
      const expiryDate = new Date(credentials.token_expiry)
      const now = new Date()
      
      if (expiryDate.getTime() - now.getTime() < 5 * 60 * 1000 && refreshToken) {
        try {
          const newTokens = await refreshAccessToken(refreshToken)
          accessToken = newTokens.access_token || accessToken
          refreshToken = newTokens.refresh_token || refreshToken
          
          const { updateCalendarCredentials } = await import('./db')
          await updateCalendarCredentials(appointment.nutricionista_id, {
            access_token: accessToken,
            refresh_token: refreshToken,
            token_expiry: newTokens.expiry_date
              ? new Date(newTokens.expiry_date).toISOString()
              : undefined,
          })
        } catch (error) {
          console.error('Error refreshing token:', error)
        }
      }
    }

    await deleteCalendarEvent(
      accessToken,
      refreshToken || undefined,
      credentials.calendar_id,
      appointment.google_calendar_event_id
    )

    // Limpiar el ID del evento de la cita
    await updateAppointment(appointmentId, {
      google_calendar_event_id: null,
    })

    return true
  } catch (error: any) {
    console.error('Error deleting calendar event:', error)
    return false
  }
}

