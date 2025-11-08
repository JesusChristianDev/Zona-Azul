import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const role = cookieStore.get('user_role')?.value
    const userId = cookieStore.get('user_id')?.value
    const sessionToken = cookieStore.get('session_token')?.value

    if (!sessionToken || !role || !userId) {
      return NextResponse.json(
        { authenticated: false, role: 'invitado', userId: null },
        { status: 200 }
      )
    }

    // Validar que el rol es válido
    const validRoles = ['admin', 'suscriptor', 'nutricionista', 'repartidor', 'invitado']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { authenticated: false, role: 'invitado', userId: null },
        { status: 200 }
      )
    }

    return NextResponse.json({
      authenticated: role !== 'invitado',
      role,
      userId,
      sessionToken,
    })
  } catch (error) {
    console.error('Error checking session:', error)
    return NextResponse.json(
      { authenticated: false, role: 'invitado', userId: null },
      { status: 500 }
    )
  }
}

