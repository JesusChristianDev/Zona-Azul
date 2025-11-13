import { NextRequest, NextResponse } from 'next/server'
import { getCalendarCredentials } from '@/lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Verificar estado de conexión del calendario
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const credentials = await getCalendarCredentials(userId)
    
    return NextResponse.json({
      connected: credentials !== null && credentials.enabled,
      calendarId: credentials?.calendar_id || null,
    })
  } catch (error: any) {
    console.error('Error checking calendar status:', error)
    return NextResponse.json(
      { error: 'Error al verificar estado del calendario', details: error?.message },
      { status: 500 }
    )
  }
}

