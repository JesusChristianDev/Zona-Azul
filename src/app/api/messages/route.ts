import { NextRequest, NextResponse } from 'next/server'
import { getMessagesByUserId, createMessage } from '@/lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener mensajes del usuario
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const messages = await getMessagesByUserId(userId)
    return NextResponse.json({ messages })
  } catch (error: any) {
    console.error('Error fetching messages:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    return NextResponse.json(
      { error: 'Error al obtener mensajes', details: error?.message },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo mensaje
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
    const { to_user_id, subject, message } = body

    if (!to_user_id || !message) {
      return NextResponse.json(
        { error: 'Destinatario y mensaje son requeridos' },
        { status: 400 }
      )
    }

    const newMessage = await createMessage({
      from_user_id: userId,
      to_user_id,
      subject: subject || null,
      message,
      read: false,
    })

    if (!newMessage) {
      console.error('Failed to create message')
      return NextResponse.json(
        { error: 'Error al enviar mensaje' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: newMessage }, { status: 201 })
  } catch (error) {
    console.error('Error creating message:', error)
    return NextResponse.json(
      { error: 'Error al enviar mensaje' },
      { status: 500 }
    )
  }
}

