import { NextRequest, NextResponse } from 'next/server'
import { deleteMessagesByConversation } from '@/lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// DELETE - Eliminar todos los mensajes de una conversación
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get('contact_id')

    if (!contactId) {
      return NextResponse.json(
        { error: 'ID de contacto es requerido' },
        { status: 400 }
      )
    }

    const success = await deleteMessagesByConversation(userId, contactId)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Error al eliminar mensajes' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting conversation messages:', error)
    return NextResponse.json(
      { error: 'Error al eliminar mensajes' },
      { status: 500 }
    )
  }
}

