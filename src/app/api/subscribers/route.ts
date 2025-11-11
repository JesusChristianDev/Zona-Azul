import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getUsersByRole, getClientsByNutricionistaId } from '../../../lib/db'

export const dynamic = 'force-dynamic'

// GET - Obtener suscriptores según el rol del usuario
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('user_role')?.value

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    let subscribers: any[] = []

    if (role === 'admin') {
      // Admin puede ver todos los suscriptores
      const allSubscribers = await getUsersByRole('suscriptor')
      subscribers = allSubscribers.map(({ password_hash, ...user }) => user)
    } else if (role === 'nutricionista') {
      // Nutricionista solo puede ver sus clientes asignados
      const clients = await getClientsByNutricionistaId(userId)
      const clientIds = clients.map(c => c.client_id)
      
      // Obtener información de cada cliente
      const allSubscribers = await getUsersByRole('suscriptor')
      subscribers = allSubscribers
        .filter(u => clientIds.includes(u.id))
        .map(({ password_hash, ...user }) => user)
    } else {
      // Otros roles no tienen acceso
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    return NextResponse.json({ subscribers })
  } catch (error: any) {
    console.error('Error fetching subscribers:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    return NextResponse.json(
      { error: 'Error al obtener suscriptores', details: error?.message },
      { status: 500 }
    )
  }
}

