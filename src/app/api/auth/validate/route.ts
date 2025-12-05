import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail } from '@/lib/db'
import { isSupabaseConfigured } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

// Forzar renderizado dinámico porque usa cookies
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch (parseError: any) {
      console.error('Error parsing request body:', parseError)
      return NextResponse.json(
        { error: 'Formato de solicitud inválido' },
        { status: 400 }
      )
    }

    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // Verificar que Supabase esté configurado
    if (!isSupabaseConfigured()) {
      console.error('Supabase no está configurado. Variables de entorno faltantes.')
      return NextResponse.json(
        { 
          error: 'Error de configuración del servidor',
          details: process.env.NODE_ENV === 'development' 
            ? 'NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY deben estar configuradas en .env.local'
            : undefined
        },
        { status: 500 }
      )
    }

    // Obtener usuario de Supabase (solo datos reales)
    let dbUser
    try {
      dbUser = await getUserByEmail(email)
    } catch (dbError: any) {
      console.error('Error fetching user from database:', dbError)
      return NextResponse.json(
        { error: 'Error al consultar la base de datos', details: process.env.NODE_ENV === 'development' ? dbError.message : undefined },
        { status: 500 }
      )
    }

    if (!dbUser) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // Verificar contraseña con bcrypt (solo datos reales)
    let isPasswordValid = false
    try {
      if (!dbUser.password_hash) {
        console.error('User has no password_hash:', dbUser.id)
        return NextResponse.json(
          { error: 'Error en la configuración de la cuenta' },
          { status: 500 }
        )
      }
      isPasswordValid = await bcrypt.compare(password, dbUser.password_hash)
    } catch (bcryptError: any) {
      console.error('Error comparing password:', bcryptError)
      return NextResponse.json(
        { error: 'Error al verificar la contraseña', details: process.env.NODE_ENV === 'development' ? bcryptError.message : undefined },
        { status: 500 }
      )
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    const user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      must_change_password: dbUser.must_change_password || false,
    }

    // Generar token de sesión
    const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Establecer cookies
    const response = NextResponse.json({
      success: true,
      user,
      must_change_password: dbUser.must_change_password || false,
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
  } catch (error: any) {
    console.error('Error in validate:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    
    // Asegurar que siempre devolvemos JSON, no HTML
    return NextResponse.json(
      { 
        error: 'Error al validar credenciales',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}

