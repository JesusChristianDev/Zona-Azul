import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

// Configuración de OAuth2 para Google Calendar
export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  
  // Determinar el redirect URI basado en el entorno
  const isProduction = process.env.NODE_ENV === 'production'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (isProduction ? process.env.NEXT_PUBLIC_APP_URL || 'https://zonazul.netlify.app' : 'http://localhost:3000')
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${baseUrl}/api/calendar/callback`

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.')
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri)
}

// Generar URL de autorización
export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client()
  
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ]

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Forzar consentimiento para obtener refresh_token
  })
}

// Intercambiar código de autorización por tokens
export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

// Crear cliente autenticado con tokens
export function getAuthenticatedClient(accessToken: string, refreshToken?: string) {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })
  return oauth2Client
}

// Obtener cliente de Google Calendar autenticado
export function getCalendarClient(accessToken: string, refreshToken?: string) {
  const auth = getAuthenticatedClient(accessToken, refreshToken)
  return google.calendar({ version: 'v3', auth })
}

// Crear evento en Google Calendar
export async function createCalendarEvent(
  accessToken: string,
  refreshToken: string | undefined,
  calendarId: string,
  eventData: {
    summary: string
    description?: string
    start: { dateTime: string; timeZone: string }
    end: { dateTime: string; timeZone: string }
    attendees?: Array<{ email: string }>
  }
) {
  try {
    const calendar = getCalendarClient(accessToken, refreshToken)
    
    const event = {
      summary: eventData.summary,
      description: eventData.description || '',
      start: eventData.start,
      end: eventData.end,
      attendees: eventData.attendees || [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // Recordatorio 1 día antes
          { method: 'popup', minutes: 30 }, // Recordatorio 30 minutos antes
        ],
      },
    }

    const response = await calendar.events.insert({
      calendarId: calendarId || 'primary',
      requestBody: event,
    })

    return response.data
  } catch (error: any) {
    console.error('Error creating calendar event:', error)
    throw error
  }
}

// Actualizar evento en Google Calendar
export async function updateCalendarEvent(
  accessToken: string,
  refreshToken: string | undefined,
  calendarId: string,
  eventId: string,
  eventData: {
    summary?: string
    description?: string
    start?: { dateTime: string; timeZone: string }
    end?: { dateTime: string; timeZone: string }
    attendees?: Array<{ email: string }>
  }
) {
  try {
    const calendar = getCalendarClient(accessToken, refreshToken)
    
    // Primero obtener el evento existente
    const existingEvent = await calendar.events.get({
      calendarId: calendarId || 'primary',
      eventId: eventId,
    })

    // Actualizar con nuevos datos
    const updatedEvent = {
      ...existingEvent.data,
      ...eventData,
    }

    const response = await calendar.events.update({
      calendarId: calendarId || 'primary',
      eventId: eventId,
      requestBody: updatedEvent,
    })

    return response.data
  } catch (error: any) {
    console.error('Error updating calendar event:', error)
    throw error
  }
}

// Eliminar evento de Google Calendar
export async function deleteCalendarEvent(
  accessToken: string,
  refreshToken: string | undefined,
  calendarId: string,
  eventId: string
) {
  try {
    const calendar = getCalendarClient(accessToken, refreshToken)
    
    await calendar.events.delete({
      calendarId: calendarId || 'primary',
      eventId: eventId,
    })

    return true
  } catch (error: any) {
    console.error('Error deleting calendar event:', error)
    throw error
  }
}

// Obtener disponibilidad del calendario (horarios ocupados)
export async function getCalendarBusyTimes(
  accessToken: string,
  refreshToken: string | undefined,
  calendarId: string,
  timeMin: string,
  timeMax: string
) {
  try {
    const calendar = getCalendarClient(accessToken, refreshToken)
    
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: timeMin,
        timeMax: timeMax,
        items: [{ id: calendarId || 'primary' }],
      },
    })

    const busyTimes = response.data.calendars?.[calendarId || 'primary']?.busy || []
    return busyTimes
  } catch (error: any) {
    console.error('Error getting calendar busy times:', error)
    throw error
  }
}

// Refrescar token de acceso
export async function refreshAccessToken(refreshToken: string) {
  try {
    const oauth2Client = getOAuth2Client()
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    })
    
    const { credentials } = await oauth2Client.refreshAccessToken()
    return credentials
  } catch (error: any) {
    console.error('Error refreshing access token:', error)
    throw error
  }
}

