import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Configurar VAPID keys (deben estar en variables de entorno)
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@zonaazul.com'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)
}

// POST: Enviar notificación push a usuarios
export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      user_ids, // Array de user_ids o null para todos
      title, 
      message, 
      url, 
      icon,
      tag,
      requireInteraction,
      data 
    } = body

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: title, message' },
        { status: 400 }
      )
    }

    // Si no hay VAPID keys configuradas, retornar error
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { 
          error: 'VAPID keys no configuradas. Configure NEXT_PUBLIC_VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY',
          fallback: 'Usando notificaciones locales en su lugar'
        },
        { status: 503 }
      )
    }

    let targetUserIds: string[] = []

    if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
      targetUserIds = user_ids
    } else {
      // Obtener todos los usuarios activos
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'suscriptor')

      if (users) {
        targetUserIds = users.map((u) => u.id)
      }
    }

    // Validar que hay usuarios objetivo
    if (targetUserIds.length === 0) {
      return NextResponse.json({
        message: 'No hay usuarios objetivo para enviar notificaciones',
        sent: 0,
      })
    }

    // Obtener todas las suscripciones push de los usuarios objetivo
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', targetUserIds)

    if (subError) {
      console.error('Error fetching push subscriptions:', subError)
      throw subError
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        message: 'No hay suscripciones push activas para estos usuarios',
        sent: 0,
      })
    }

    // Asegurar que el título siempre incluya "Zona Azul" de forma prominente
    // Esto minimiza la visibilidad del nombre del navegador
    let finalTitle = title
    if (!finalTitle.includes('Zona Azul') && !finalTitle.startsWith('Zona Azul')) {
      finalTitle = `Zona Azul: ${title}`
    }

    // Preparar payload de notificación
    const payload = JSON.stringify({
      title: finalTitle,
      body: message,
      icon: icon || '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: tag || 'zona-azul-notification',
      requireInteraction: requireInteraction || false,
      data: {
        url: url || '/',
        ...data,
        appName: 'Zona Azul',
        timestamp: Date.now(),
      },
      vibrate: [200, 100, 200],
    })

    // Enviar notificaciones push
    const results = []
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_key,
          },
        }

        await webpush.sendNotification(pushSubscription, payload)
        
        results.push({
          user_id: sub.user_id,
          success: true,
        })
      } catch (error: any) {
        // Si la suscripción es inválida, eliminarla
        if (error.statusCode === 410 || error.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id)
        }

        results.push({
          user_id: sub.user_id,
          success: false,
          error: error.message,
        })
      }
    })

    await Promise.allSettled(sendPromises)

    return NextResponse.json({
      message: 'Notificaciones push enviadas',
      total_subscriptions: subscriptions.length,
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    })
  } catch (error: any) {
    console.error('Error sending push notifications:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    })
    return NextResponse.json(
      { 
        error: error.message || 'Error al enviar notificaciones push',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}


