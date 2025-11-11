import { NextRequest, NextResponse } from 'next/server'
import { updateMessage } from '../../../../lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// PATCH - Actualizar mensaje (marcar como leído, responder, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const updateData: any = {}

    if (body.read !== undefined) updateData.read = body.read
    if (body.reply) updateData.reply = body.reply

    const message = await updateMessage(params.id, updateData)
    if (!message) {
      return NextResponse.json(
        { error: 'Error al actualizar mensaje' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Error updating message:', error)
    return NextResponse.json(
      { error: 'Error al actualizar mensaje' },
      { status: 500 }
    )
  }
}

