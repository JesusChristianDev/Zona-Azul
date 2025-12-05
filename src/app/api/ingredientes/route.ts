import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIngredientes, upsertIngrediente, deleteIngrediente } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const ingredientes = await getIngredientes()
    return NextResponse.json({ ingredientes })
  } catch (error) {
    console.error('Error fetching ingredientes:', error)
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const role = cookieStore.get('user_role')?.value

    if (role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    if (!body.nombre || !body.unidad_base) {
      return NextResponse.json({ error: 'Nombre y unidad base son obligatorios' }, { status: 400 })
    }

    const ingrediente = await upsertIngrediente(body)
    if (!ingrediente) {
      return NextResponse.json({ error: 'No se pudo guardar el ingrediente' }, { status: 500 })
    }

    return NextResponse.json({ ingrediente })
  } catch (error) {
    console.error('Error guardando ingrediente:', error)
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const role = cookieStore.get('user_role')?.value

    if (role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id es obligatorio' }, { status: 400 })
    }

    const success = await deleteIngrediente(id)
    if (!success) {
      return NextResponse.json({ error: 'No se pudo eliminar el ingrediente' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error eliminando ingrediente:', error)
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}


