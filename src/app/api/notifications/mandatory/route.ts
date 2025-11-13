import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// POST: Enviar notificación obligatoria a usuarios
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      user_ids, // Array de user_ids o null para todos los usuarios
      notification_type,
      title,
      message,
      url,
    } = body

    if (!notification_type || !title || !message) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: notification_type, title, message' },
        { status: 400 }
      )
    }

    let targetUserIds: string[] = []

    if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
      // Enviar a usuarios específicos
      targetUserIds = user_ids
    } else {
      // Enviar a todos los usuarios activos
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'suscriptor') // Solo a suscriptores por defecto

      if (users) {
        targetUserIds = users.map((u) => u.id)
      }
    }

    const results = []

    for (const userId of targetUserIds) {
      try {
        // Registrar en el log de notificaciones (siempre se registra, es obligatoria)
        const { data: logEntry, error: logError } = await supabase
          .from('notifications_log')
          .insert({
            user_id: userId,
            notification_type,
            title,
            message,
            is_mandatory: true, // Siempre true para notificaciones obligatorias
          })
          .select()
          .single()

        if (logError) {
          console.error(`Error logging notification for user ${userId}:`, logError)
          results.push({
            user_id: userId,
            success: false,
            error: logError.message,
          })
          continue
        }

        results.push({
          user_id: userId,
          success: true,
          log_id: logEntry.id,
        })
      } catch (error: any) {
        console.error(`Error processing notification for user ${userId}:`, error)
        results.push({
          user_id: userId,
          success: false,
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      message: 'Notificaciones obligatorias registradas',
      total_sent: results.filter((r) => r.success).length,
      total_failed: results.filter((r) => !r.success).length,
      results,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al enviar notificaciones obligatorias' },
      { status: 500 }
    )
  }
}


