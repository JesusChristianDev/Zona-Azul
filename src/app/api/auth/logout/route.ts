import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const response = NextResponse.json({ success: true })

    // Eliminar todas las cookies de sesión
    response.cookies.delete('user_role')
    response.cookies.delete('user_id')
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

