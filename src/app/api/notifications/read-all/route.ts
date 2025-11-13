import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// PATCH: Marcar todas las notificaciones como leídas
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Marcar todas las no leídas como leídas
    const { data, error } = await supabase
      .from('notifications_log')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null)
      .select()

    if (error) {
      console.error('Error marking all notifications as read:', error)
      return NextResponse.json(
        { error: 'Error al marcar notificaciones como leídas' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Todas las notificaciones han sido marcadas como leídas',
      updated_count: data?.length || 0,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al marcar notificaciones como leídas' },
      { status: 500 }
    )
  }
}


