import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// POST: Guardar suscripción a push notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, subscription } = body

    if (!userId || !subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: userId, subscription' },
        { status: 400 }
      )
    }

    // Verificar si ya existe una suscripción para este usuario
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('endpoint', subscription.endpoint)
      .single()

    if (existing) {
      // Actualizar suscripción existente
      const { error } = await supabase
        .from('push_subscriptions')
        .update({
          p256dh_key: subscription.keys.p256dh,
          auth_key: subscription.keys.auth,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (error) throw error

      return NextResponse.json({ 
        message: 'Suscripción actualizada',
        subscription_id: existing.id 
      })
    }

    // Crear nueva suscripción
    const { data, error } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      message: 'Suscripción guardada',
      subscription_id: data.id 
    })
  } catch (error: any) {
    console.error('Error saving push subscription:', error)
    return NextResponse.json(
      { error: error.message || 'Error al guardar suscripción' },
      { status: 500 }
    )
  }
}




