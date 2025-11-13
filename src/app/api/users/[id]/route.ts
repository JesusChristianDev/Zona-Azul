import { NextRequest, NextResponse } from 'next/server'
import { getUserById, updateUser, deleteUser } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener usuario por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const currentUserId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('user_role')?.value

    // Admin puede ver cualquier usuario
    if (role === 'admin') {
      // Permitir acceso
    }
    // Usuarios pueden verse a sí mismos
    else if (currentUserId === params.id) {
      // Permitir acceso
    }
    // Suscriptores pueden ver a su nutricionista asignado
    else if (role === 'suscriptor') {
      const { getNutricionistaByClientId } = await import('../../../../lib/db')
      const assignment = await getNutricionistaByClientId(currentUserId || '')
      if (!assignment || assignment.nutricionista_id !== params.id) {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 403 }
        )
      }
    }
    // Nutricionistas pueden ver a sus clientes asignados
    else if (role === 'nutricionista') {
      const { getClientsByNutricionistaId } = await import('../../../../lib/db')
      const clients = await getClientsByNutricionistaId(currentUserId || '')
      const clientIds = clients.map(c => c.client_id)
      if (!clientIds.includes(params.id)) {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 403 }
        )
      }
    }
    // Otros roles no tienen acceso
    else {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    const user = await getUserById(params.id)
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const { password_hash, ...safeUser } = user
    return NextResponse.json({ user: safeUser })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Error al obtener usuario' },
      { status: 500 }
    )
  }
}

// PATCH - Actualizar usuario
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const currentUserId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('user_role')?.value

    // Solo admin puede actualizar cualquier usuario, otros solo pueden actualizarse a sí mismos
    if (role !== 'admin' && currentUserId !== params.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const updateData: any = {}

    if (body.name) updateData.name = body.name
    if (body.email) updateData.email = body.email.toLowerCase()
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.role && role === 'admin') updateData.role = body.role
    if (body.password) {
      updateData.password_hash = await bcrypt.hash(body.password, 10)
    }

    const user = await updateUser(params.id, updateData)
    if (!user) {
      return NextResponse.json(
        { error: 'Error al actualizar usuario' },
        { status: 500 }
      )
    }

    const { password_hash, ...safeUser } = user
    return NextResponse.json({ user: safeUser })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Error al actualizar usuario' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar usuario (solo admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const role = cookieStore.get('user_role')?.value

    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    const success = await deleteUser(params.id)
    if (!success) {
      return NextResponse.json(
        { error: 'Error al eliminar usuario' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Error al eliminar usuario' },
      { status: 500 }
    )
  }
}

