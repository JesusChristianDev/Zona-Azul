import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Forzar renderizado dinámico porque usa cookies
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const role = cookieStore.get('user_role')?.value
    const userId = cookieStore.get('user_id')?.value
    const userName = cookieStore.get('user_name')?.value
    const userEmail = cookieStore.get('user_email')?.value
    const sessionToken = cookieStore.get('session_token')?.value

    if (!sessionToken || !role || !userId) {
      return NextResponse.json(
        { authenticated: false, role: 'invitado', userId: null, userName: null, userEmail: null },
        { status: 200 }
      )
    }

    // Validar que el rol es válido
    const validRoles = ['admin', 'suscriptor', 'nutricionista', 'repartidor', 'invitado']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { authenticated: false, role: 'invitado', userId: null, userName: null, userEmail: null },
        { status: 200 }
      )
    }

    return NextResponse.json({
      authenticated: role !== 'invitado',
      role,
      userId,
      userName,
      userEmail,
      sessionToken,
    })
  } catch (error) {
    console.error('Error checking session:', error)
    return NextResponse.json(
      { authenticated: false, role: 'invitado', userId: null, userName: null, userEmail: null },
      { status: 500 }
    )
  }
}

