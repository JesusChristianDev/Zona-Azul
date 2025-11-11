import { NextRequest, NextResponse } from 'next/server'
import { getAllUsers, createUser, getUserById, updateUser, deleteUser } from '../../../lib/db'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener todos los usuarios (solo admin)
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const role = cookieStore.get('user_role')?.value

    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    const users = await getAllUsers()
    // No devolver password_hash en la respuesta
    const safeUsers = users.map(({ password_hash, ...user }) => user)
    return NextResponse.json({ users: safeUsers })
  } catch (error: any) {
    console.error('Error fetching users:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    return NextResponse.json(
      { error: 'Error al obtener usuarios', details: error?.message },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo usuario (solo admin)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const role = cookieStore.get('user_role')?.value

    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, password, role: userRole, name, phone } = body

    if (!email || !password || !userRole || !name) {
      return NextResponse.json(
        { error: 'Email, contraseña, rol y nombre son requeridos' },
        { status: 400 }
      )
    }

    // Hash de la contraseña
    const password_hash = await bcrypt.hash(password, 10)

    const user = await createUser({
      email,
      password_hash,
      role: userRole,
      name,
      phone,
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Error al crear usuario' },
        { status: 500 }
      )
    }

    const { password_hash: _, ...safeUser } = user
    return NextResponse.json({ user: safeUser }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Error al crear usuario' },
      { status: 500 }
    )
  }
}

