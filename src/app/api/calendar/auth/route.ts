import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/googleCalendar'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener URL de autorización de Google Calendar
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

    // Solo nutricionistas pueden conectar su calendario
    if (role !== 'nutricionista' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo nutricionistas pueden conectar su calendario' },
        { status: 403 }
      )
    }

    // Verificar que las credenciales estén configuradas y no sean placeholders
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    
    if (!clientId || !clientSecret) {
      console.error('Google OAuth credentials not configured')
      return NextResponse.json(
        { 
          error: 'Google Calendar no está configurado', 
          details: 'Las credenciales de Google OAuth no están configuradas. Por favor, configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en las variables de entorno.',
          hint: 'Visita /api/calendar/debug para ver el estado de la configuración'
        },
        { status: 500 }
      )
    }

    // Verificar que no sean valores placeholder
    if (clientId === 'tu_client_id_aqui' || clientSecret === 'tu_client_secret_aqui') {
      console.error('Google OAuth credentials are placeholders')
      return NextResponse.json(
        { 
          error: 'Credenciales de Google no configuradas', 
          details: 'Las credenciales en .env.local tienen valores placeholder. Por favor, reemplaza "tu_client_id_aqui" y "tu_client_secret_aqui" con tus credenciales reales de Google Cloud Console.',
          hint: 'Visita /api/calendar/debug para ver el estado de la configuración'
        },
        { status: 500 }
      )
    }

    const authUrl = getAuthUrl()
    
    // Guardar userId en la sesión para el callback
    const response = NextResponse.json({ authUrl })
    response.cookies.set('calendar_auth_user_id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutos
    })

    return response
  } catch (error: any) {
    console.error('Error generating auth URL:', error)
    console.error('Error stack:', error?.stack)
    return NextResponse.json(
      { 
        error: 'Error al generar URL de autorización', 
        details: error?.message || 'Error desconocido',
        hint: 'Verifica que GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET estén configurados correctamente'
      },
      { status: 500 }
    )
  }
}

