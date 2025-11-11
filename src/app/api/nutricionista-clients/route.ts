import { NextRequest, NextResponse } from 'next/server'
import {
  getClientsByNutricionistaId,
  assignClientToNutricionista,
  removeClientFromNutricionista,
  getNutricionistaByClientId,
} from '../../../lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener clientes de un nutricionista
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('user_role')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const nutricionistaId = searchParams.get('nutricionista_id')
    const clientId = searchParams.get('client_id')

    // Si se busca por client_id, obtener el nutricionista asignado
    if (clientId) {
      const assignment = await getNutricionistaByClientId(clientId)
      if (!assignment) {
        return NextResponse.json({ assignment: null })
      }
      return NextResponse.json({ assignment })
    }

    // Si se busca por nutricionista_id
    const targetNutricionistaId = nutricionistaId || userId

    // Solo el nutricionista o admin puede ver sus clientes
    if (role !== 'admin' && targetNutricionistaId !== userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    const clients = await getClientsByNutricionistaId(targetNutricionistaId)
    return NextResponse.json({ clients })
  } catch (error) {
    console.error('Error fetching nutricionista clients:', error)
    return NextResponse.json(
      { error: 'Error al obtener clientes' },
      { status: 500 }
    )
  }
}

// POST - Asignar cliente a nutricionista
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('user_role')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    if (role !== 'admin' && role !== 'nutricionista') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { nutricionista_id, client_id, notes } = body

    if (!nutricionista_id || !client_id) {
      return NextResponse.json(
        { error: 'Nutricionista y cliente son requeridos' },
        { status: 400 }
      )
    }

    // Solo admin puede asignar a otros nutricionistas
    if (role !== 'admin' && nutricionista_id !== userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    const assignment = await assignClientToNutricionista(
      nutricionista_id,
      client_id,
      notes
    )

    if (!assignment) {
      return NextResponse.json(
        { error: 'Error al asignar cliente' },
        { status: 500 }
      )
    }

    return NextResponse.json({ assignment }, { status: 201 })
  } catch (error) {
    console.error('Error assigning client:', error)
    return NextResponse.json(
      { error: 'Error al asignar cliente' },
      { status: 500 }
    )
  }
}

// DELETE - Remover cliente de nutricionista
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('user_role')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const nutricionistaId = searchParams.get('nutricionista_id')
    const clientId = searchParams.get('client_id')

    if (!nutricionistaId || !clientId) {
      return NextResponse.json(
        { error: 'Nutricionista y cliente son requeridos' },
        { status: 400 }
      )
    }

    // Solo admin puede remover de otros nutricionistas
    if (role !== 'admin' && nutricionistaId !== userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    const success = await removeClientFromNutricionista(nutricionistaId, clientId)

    if (!success) {
      return NextResponse.json(
        { error: 'Error al remover cliente' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing client:', error)
    return NextResponse.json(
      { error: 'Error al remover cliente' },
      { status: 500 }
    )
  }
}

