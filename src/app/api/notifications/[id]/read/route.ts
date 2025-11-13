import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// PATCH: Marcar notificación como leída
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

    const notificationId = params.id

    // Verificar que la notificación pertenece al usuario
    const { data: notification } = await supabase
      .from('notifications_log')
      .select('user_id')
      .eq('id', notificationId)
      .single()

    if (!notification || notification.user_id !== userId) {
      return NextResponse.json(
        { error: 'Notificación no encontrada o no autorizada' },
        { status: 404 }
      )
    }

    // Marcar como leída
    const { data, error } = await supabase
      .from('notifications_log')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .select()
      .single()

    if (error) {
      console.error('Error marking notification as read:', error)
      return NextResponse.json(
        { error: 'Error al marcar notificación como leída' },
        { status: 500 }
      )
    }

    return NextResponse.json({ notification: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al marcar notificación como leída' },
      { status: 500 }
    )
  }
}


