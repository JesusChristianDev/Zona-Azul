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

    const decodedEmail = decodeActivationToken(token)
    if (!decodedEmail) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const user = await getUserByEmail(decodedEmail, supabase)
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado para este token' },
        { status: 404 }
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

function decodeActivationToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8').trim().toLowerCase()
    if (!decoded || !decoded.includes('@')) return null
    return decoded
  } catch (error) {
    console.error('Error decoding activation token:', error)
    return null
  }
}
