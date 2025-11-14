import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getUserById } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { current_password, new_password, required } = body

    if (!new_password) {
      return NextResponse.json(
        { error: 'La nueva contraseña es requerida' },
        { status: 400 }
      )
    }

    // Validar formato de nueva contraseña
    if (new_password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      )
    }
    if (!/[A-Z]/.test(new_password)) {
      return NextResponse.json(
        { error: 'La contraseña debe contener al menos una letra mayúscula' },
        { status: 400 }
      )
    }
    if (!/[a-z]/.test(new_password)) {
      return NextResponse.json(
        { error: 'La contraseña debe contener al menos una letra minúscula' },
        { status: 400 }
      )
    }
    if (!/[0-9]/.test(new_password)) {
      return NextResponse.json(
        { error: 'La contraseña debe contener al menos un número' },
        { status: 400 }
      )
    }

    // Obtener usuario
    const user = await getUserById(userId)

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Si es cambio obligatorio, la contraseña actual es requerida
    // Si es cambio opcional (desde ajustes), también se requiere la contraseña actual
    if (required || current_password) {
      if (!current_password) {
        return NextResponse.json(
          { error: 'La contraseña actual es requerida' },
          { status: 400 }
        )
      }
      const isPasswordValid = await bcrypt.compare(current_password, user.password_hash)
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'La contraseña actual es incorrecta' },
          { status: 401 }
        )
      }
    }

    // Hash de la nueva contraseña
    const newPasswordHash = await bcrypt.hash(new_password, 10)

    // Actualizar contraseña
    // IMPORTANTE: Siempre establecer must_change_password = false después de cambiar la contraseña
    // Esto asegura que no vuelva a aparecer la obligación, incluso si es un cambio opcional desde ajustes
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: newPasswordHash,
        must_change_password: false, // Siempre establecer en false después de cambiar contraseña
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating password:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar la contraseña' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada correctamente',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error: any) {
    console.error('Error in change-password:', error)
    return NextResponse.json(
      { error: 'Error al cambiar la contraseña' },
      { status: 500 }
    )
  }
}

