import { NextRequest, NextResponse } from 'next/server'
import { validateCredentials, mockUsers, User } from '../../../../lib/mockUsers'

// Forzar renderizado dinámico porque usa cookies
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, storedUsers } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // Combinar mockUsers con usuarios almacenados del cliente
    let allUsers: User[] = [...mockUsers]
    if (storedUsers && Array.isArray(storedUsers)) {
      // Combinar usuarios, evitando duplicados por ID
      const usersMap = new Map<string, User>()
      mockUsers.forEach((u) => usersMap.set(u.id, u))
      storedUsers.forEach((u: User) => {
        if (u.email && u.password && u.role) {
          usersMap.set(u.id, u)
        }
      })
      allUsers = Array.from(usersMap.values())
    }

    // Buscar usuario por email
    const user = allUsers.find((u) => u.email.toLowerCase() === email.toLowerCase())

    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // Generar token de sesión
    const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Establecer cookies
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })

    // Configurar cookies con opciones de seguridad
    response.cookies.set('user_role', user.role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: '/',
    })

    response.cookies.set('user_id', user.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    response.cookies.set('user_name', user.name, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    response.cookies.set('user_email', user.email, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Error in validate:', error)
    return NextResponse.json(
      { error: 'Error al validar credenciales' },
      { status: 500 }
    )
  }
}

