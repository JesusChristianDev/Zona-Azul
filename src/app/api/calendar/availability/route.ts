import { NextRequest, NextResponse } from 'next/server'
import { getCalendarCredentials } from '../../../../lib/db'
import { getCalendarBusyTimes, refreshAccessToken } from '../../../../lib/googleCalendar'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener disponibilidad del calendario
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('user_role')?.value

    const { searchParams } = new URL(request.url)
    const nutricionistaIdParam = searchParams.get('nutricionista_id')
    
    // Si se especifica un nutricionista_id, permitir acceso público (para página de booking)
    // Si no se especifica, requerir autenticación y usar el userId del usuario autenticado
    if (!nutricionistaIdParam) {
      if (!userId) {
        return NextResponse.json(
          { error: 'No autenticado' },
          { status: 401 }
        )
      }

      // Solo nutricionistas pueden ver su propia disponibilidad sin especificar ID
      if (role !== 'nutricionista' && role !== 'admin') {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 403 }
        )
      }
    }

    const nutricionistaId = nutricionistaIdParam || userId
    const timeMin = searchParams.get('timeMin')
    const timeMax = searchParams.get('timeMax')

    if (!timeMin || !timeMax) {
      return NextResponse.json(
        { error: 'timeMin y timeMax son requeridos' },
        { status: 400 }
      )
    }

    // Obtener credenciales del calendario
    const credentials = await getCalendarCredentials(nutricionistaId)
    if (!credentials || !credentials.enabled) {
      return NextResponse.json({
        available: true,
        message: 'Calendario no conectado, mostrando todos los horarios como disponibles',
      })
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
          
          const { updateCalendarCredentials } = await import('../../../../lib/db')
          await updateCalendarCredentials(nutricionistaId, {
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

    // Obtener horarios ocupados
    const busyTimes = await getCalendarBusyTimes(
      accessToken,
      refreshToken || undefined,
      credentials.calendar_id,
      timeMin,
      timeMax
    )

    return NextResponse.json({ busyTimes })
  } catch (error: any) {
    console.error('Error getting calendar availability:', error)
    return NextResponse.json(
      { error: 'Error al obtener disponibilidad', details: error?.message },
      { status: 500 }
    )
  }
}

