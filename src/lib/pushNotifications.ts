"use client"

/**
 * Utilidades para suscribirse y gestionar notificaciones push
 * Permite recibir notificaciones incluso cuando la app está cerrada
 */

interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * Suscribe al usuario a notificaciones push
 */
export async function subscribeToPushNotifications(userId: string | null): Promise<boolean> {
  if (typeof window === 'undefined' || !userId) return false

  try {
    // Verificar soporte
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications no están soportadas en este navegador')
      return false
    }

    // Verificar permisos (sin solicitar si ya están concedidos o denegados)
    const currentPermission = Notification.permission
    if (currentPermission === 'denied') {
      console.warn('Permisos de notificación denegados')
      return false
    }
    if (currentPermission === 'default') {
      // Solo solicitar permisos si el usuario aún no ha decidido
      // Esto debe hacerse en respuesta a un gesto del usuario
      console.warn('Permisos de notificación no concedidos. El usuario debe conceder permisos manualmente.')
      return false
    }
    // Si permission === 'granted', continuar

    // Obtener el service worker registration
    const registration = await navigator.serviceWorker.ready

    // Suscribirse a push notifications
    // Usar VAPID public key (debe estar en variables de entorno)
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    
    if (!vapidPublicKey) {
      console.warn('⚠️ VAPID public key no configurada. Las notificaciones push no funcionarán sin VAPID keys.')
      console.warn('💡 Configura NEXT_PUBLIC_VAPID_PUBLIC_KEY en tu archivo .env.local')
      return false // No continuar sin VAPID - es requerido para push notifications
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as any,
    })

    // Enviar la suscripción al servidor
    const subscriptionData: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: arrayBufferToBase64(subscription.getKey('auth')!),
      },
    }

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        subscription: subscriptionData,
      }),
    })

    if (!response.ok) {
      throw new Error('Error al guardar suscripción en el servidor')
    }

    console.log('✅ Suscrito a notificaciones push')
    return true
  } catch (error) {
    console.error('Error al suscribirse a push notifications:', error)
    return false
  }
}

/**
 * Cancela la suscripción a push notifications
 */
export async function unsubscribeFromPushNotifications(userId: string | null): Promise<boolean> {
  if (typeof window === 'undefined' || !userId) return false

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()

      // Notificar al servidor
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      console.log('✅ Desuscrito de notificaciones push')
      return true
    }

    return false
  } catch (error) {
    console.error('Error al desuscribirse de push notifications:', error)
    return false
  }
}

/**
 * Verifica si el usuario está suscrito a push notifications
 */
export async function isSubscribedToPushNotifications(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return subscription !== null
  } catch (error) {
    console.error('Error al verificar suscripción:', error)
    return false
  }
}

/**
 * Utilidades para conversión de formatos
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

