import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAllUsers, getNutricionistaByClientId, getClientsByNutricionistaId, getOrderIncidentsByRepartidorId } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Obtener contactos disponibles según el rol del usuario
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

    const allUsers = await getAllUsers()
    const safeUsers = allUsers.map(({ password_hash, ...user }) => user)
    const contacts: any[] = []

    if (role === 'admin') {
      // Admin puede contactar a todos excepto a sí mismo
      contacts.push(...safeUsers.filter(u => u.id !== userId))
    } else if (role === 'suscriptor') {
      // Suscriptor puede contactar a:
      // 1. Admin
      const admin = safeUsers.find(u => u.role === 'admin')
      if (admin) contacts.push(admin)

      // 2. Su nutricionista asignado
      const assignment = await getNutricionistaByClientId(userId)
      if (assignment) {
        const nutricionista = safeUsers.find(u => u.id === assignment.nutricionista_id)
        if (nutricionista) contacts.push(nutricionista)
      }

      // 3. Repartidor si hay un incidente activo
      // TODO: Implementar cuando se tenga la lógica de incidentes
    } else if (role === 'nutricionista') {
      // Nutricionista puede contactar a:
      // 1. Admin
      const admin = safeUsers.find(u => u.role === 'admin')
      if (admin) contacts.push(admin)

      // 2. Sus clientes asignados
      const clients = await getClientsByNutricionistaId(userId)
      clients.forEach(clientAssignment => {
        const client = safeUsers.find(u => u.id === clientAssignment.client_id)
        if (client) contacts.push(client)
      })

      // 3. Otros nutricionistas y repartidores
      const otherContacts = safeUsers.filter(
        u => u.id !== userId && (u.role === 'nutricionista' || u.role === 'repartidor')
      )
      contacts.push(...otherContacts)
    } else if (role === 'repartidor') {
      // Repartidor puede contactar a:
      // 1. Admin
      const admin = safeUsers.find(u => u.role === 'admin')
      if (admin) contacts.push(admin)

      // 2. Suscriptores con pedidos asignados
      // TODO: Implementar cuando se tenga la lógica de pedidos
      const subscribers = safeUsers.filter(u => u.role === 'suscriptor')
      contacts.push(...subscribers)

      // 3. Otros repartidores
      const otherRepartidores = safeUsers.filter(
        u => u.id !== userId && u.role === 'repartidor'
      )
      contacts.push(...otherRepartidores)
    }

    // Eliminar duplicados
    const uniqueContacts = Array.from(
      new Map(contacts.map(contact => [contact.id, contact])).values()
    )

    return NextResponse.json({ contacts: uniqueContacts })
  } catch (error: any) {
    console.error('Error fetching contacts:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    return NextResponse.json(
      { error: 'Error al obtener contactos', details: error?.message },
      { status: 500 }
    )
  }
}

