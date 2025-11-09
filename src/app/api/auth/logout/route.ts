import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Forzar renderizado dinámico porque usa cookies
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const response = NextResponse.json({ success: true })

    // Eliminar todas las cookies de sesión
    response.cookies.delete('user_role')
    response.cookies.delete('user_id')
    response.cookies.delete('user_name')
    response.cookies.delete('user_email')
    response.cookies.delete('session_token')

    return response
  } catch (error) {
    console.error('Error in logout:', error)
    return NextResponse.json(
      { error: 'Error al cerrar sesión' },
      { status: 500 }
    )
  }
}

