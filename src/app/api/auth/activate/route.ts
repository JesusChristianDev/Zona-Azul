import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { activateUserAccount, getUserByEmail } from '@/lib/db'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token de activación requerido' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string' || password.trim().length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    const { data: tokenUser, error: tokenError } = await supabase.auth.getUser(token)
    if (tokenError || !tokenUser?.user) {
      console.error('Invalid activation token:', tokenError)
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 401 }
      )
    }

    const verifiedEmail = tokenUser.user.email?.toLowerCase()
    if (!verifiedEmail) {
      return NextResponse.json(
        { error: 'No se pudo validar el correo asociado al token' },
        { status: 400 }
      )
    }

    const user = await getUserByEmail(verifiedEmail, supabase)
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado para este token' },
        { status: 404 }
      )
    }

    if (user.id !== tokenUser.user.id) {
      return NextResponse.json(
        { error: 'Token inválido para este usuario' },
        { status: 401 }
      )
    }

    if (!user.must_change_password) {
      return NextResponse.json(
        { error: 'El usuario ya ha activado su cuenta o no requiere cambio de contraseña' },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(password.trim(), 10)
    const { user: activatedUser, profile } = await activateUserAccount(
      user.id,
      passwordHash,
      supabase
    )

    if (!activatedUser) {
      return NextResponse.json(
        { error: 'No se pudo activar la cuenta. Intenta nuevamente.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Cuenta activada correctamente',
      email: activatedUser.email,
      profileStatus: profile?.subscription_status ?? 'active',
    })
  } catch (error: any) {
    console.error('Error activating account:', error)
    return NextResponse.json(
      { error: 'Error interno al activar la cuenta', details: error?.message },
      { status: 500 }
    )
  }
}
