import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// POST: Eliminar suscripción a push notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'Falta campo requerido: userId' },
        { status: 400 }
      )
    }

    // Eliminar todas las suscripciones del usuario
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({ message: 'Suscripción eliminada' })
  } catch (error: any) {
    console.error('Error removing push subscription:', error)
    return NextResponse.json(
      { error: error.message || 'Error al eliminar suscripción' },
      { status: 500 }
    )
  }
}







