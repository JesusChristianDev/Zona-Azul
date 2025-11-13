import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// POST: Enviar recordatorios de renovación a usuarios con suscripciones próximas a vencer
// Esta función debe ser llamada periódicamente (diariamente o semanalmente) mediante un cron job
export async function POST(request: NextRequest) {
  try {
    // Verificar que es una llamada autorizada
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN || 'default-secret-token'
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const daysBefore = body.days_before || 7 // Por defecto, 7 días antes

    // Calcular fecha límite (fecha de vencimiento - días antes)
    const today = new Date()
    const reminderDate = new Date(today)
    reminderDate.setDate(today.getDate() + daysBefore)
    const reminderDateStr = reminderDate.toISOString().split('T')[0]

    // Obtener suscripciones activas que vencen en los próximos días
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        subscription_plans:plan_id (
          name,
          duration_months
        ),
        users:user_id (
          id,
          name,
          email
        )
      `)
      .eq('status', 'active')
      .lte('end_date', reminderDateStr)
      .gte('end_date', today.toISOString().split('T')[0]) // Solo las que aún no han vencido

    if (subError) {
      console.error('Error fetching subscriptions:', subError)
      return NextResponse.json(
        { error: 'Error al obtener suscripciones' },
        { status: 500 }
      )
    }

    const results = []

    for (const subscription of subscriptions || []) {
      try {
        // Verificar preferencias de notificación del usuario
        const { data: userSettings } = await supabase
          .from('user_settings')
          .select('notifications_renewal_reminder, notifications_enabled')
          .eq('user_id', subscription.user_id)
          .single()

        // Verificar si el usuario tiene habilitadas las notificaciones de renovación
        const shouldNotify = !userSettings || 
          (userSettings.notifications_enabled && userSettings.notifications_renewal_reminder !== false)

        if (!shouldNotify) {
          results.push({
            user_id: subscription.user_id,
            subscription_id: subscription.id,
            notified: false,
            reason: 'Notificaciones de renovación deshabilitadas por el usuario',
          })
          continue
        }

        // Calcular días restantes
        const endDate = new Date(subscription.end_date!)
        const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        // Crear mensaje personalizado
        const planName = subscription.subscription_plans?.name || 'tu plan'
        const message = daysRemaining === 1
          ? `Tu suscripción ${planName} vence mañana. Renueva ahora para continuar disfrutando de nuestros servicios.`
          : `Tu suscripción ${planName} vence en ${daysRemaining} días. Renueva ahora para continuar disfrutando de nuestros servicios.`

        // Registrar notificación en el log
        await supabase
          .from('notifications_log')
          .insert({
            user_id: subscription.user_id,
            notification_type: 'renewal_reminder',
            title: '⏰ Recordatorio de Renovación',
            message,
            is_mandatory: false, // Respeta las preferencias del usuario
          })

        // Intentar enviar notificación push (si está disponible)
        try {
          // Aquí podrías llamar a un servicio de notificaciones push
          // Por ahora solo registramos en el log
        } catch (notifyError) {
          console.error(`Error sending push notification to user ${subscription.user_id}:`, notifyError)
        }

        results.push({
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          notified: true,
          days_remaining: daysRemaining,
        })
      } catch (error: any) {
        console.error(`Error processing subscription ${subscription.id}:`, error)
        results.push({
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          notified: false,
          error: error.message || 'Error al procesar suscripción',
        })
      }
    }

    return NextResponse.json({
      message: 'Recordatorios de renovación procesados',
      total_subscriptions: subscriptions?.length || 0,
      total_notified: results.filter((r) => r.notified).length,
      total_skipped: results.filter((r) => !r.notified).length,
      results,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al procesar recordatorios de renovación' },
      { status: 500 }
    )
  }
}


