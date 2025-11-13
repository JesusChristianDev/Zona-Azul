import { NextRequest, NextResponse } from 'next/server'
import { getTokensFromCode } from '@/lib/googleCalendar'
import { saveCalendarCredentials } from '@/lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Callback de OAuth de Google Calendar
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    // Obtener la URL base del request
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`
    
    if (error) {
      return NextResponse.redirect(
        `${baseUrl}/nutricionista/citas?error=${encodeURIComponent(error)}`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${baseUrl}/nutricionista/citas?error=missing_code`
      )
    }

    const cookieStore = await cookies()
    const userId = cookieStore.get('calendar_auth_user_id')?.value
    
    if (!userId) {
      return NextResponse.redirect(
        `${baseUrl}/nutricionista/citas?error=session_expired`
      )
    }

    // Intercambiar código por tokens
    const tokens = await getTokensFromCode(code)

    if (!tokens.access_token) {
      return NextResponse.redirect(
        `${baseUrl}/nutricionista/citas?error=token_error`
      )
    }

    // Calcular fecha de expiración
    const tokenExpiry = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : null

    // Guardar credenciales en la base de datos
    const credentials = await saveCalendarCredentials(userId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || undefined,
      token_expiry: tokenExpiry || undefined,
      calendar_id: 'primary',
    })

    if (!credentials) {
      return NextResponse.redirect(
        `${baseUrl}/nutricionista/citas?error=save_error`
      )
    }

    // Limpiar cookie temporal
    const response = NextResponse.redirect(
      `${baseUrl}/nutricionista/citas?success=calendar_connected`
    )
    response.cookies.delete('calendar_auth_user_id')

    return response
  } catch (error: any) {
    console.error('Error in calendar callback:', error)
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`
    return NextResponse.redirect(
      `${baseUrl}/nutricionista/citas?error=${encodeURIComponent(error?.message || 'unknown_error')}`
    )
  }
}

