"use client"

/**
 * Utilidades para mostrar notificaciones en la aplicación
 */

interface NotificationData {
  title: string
  body: string
  icon?: string
  image?: string // Imagen grande opcional para la notificación
  url?: string
  tag?: string
  isMandatory?: boolean // Notificaciones obligatorias (legales/seguridad) siempre se envían
}

interface UserSettings {
  notifications: {
    enabled: boolean
    newMessages: boolean
    orderUpdates: boolean
    planAssignments: boolean
    appointments: boolean
    newOrders: boolean
    weeklyMenu?: boolean
    renewalReminder?: boolean
  }
}

/**
 * Obtiene las preferencias de notificaciones del usuario desde la API
 */
async function getUserNotificationSettings(userId: string | null): Promise<UserSettings['notifications'] | null> {
  if (typeof window === 'undefined' || !userId) return null

  try {
    const { getUserSettings } = await import('./api')
    const settings = await getUserSettings()

    if (settings) {
      return {
        enabled: settings.notifications_enabled ?? true,
        newMessages: settings.notifications_new_messages ?? true,
        orderUpdates: settings.notifications_order_updates ?? true,
        planAssignments: settings.notifications_plan_assignments ?? true,
        appointments: settings.notifications_appointments ?? true,
        newOrders: settings.notifications_new_orders ?? true,
        weeklyMenu: settings.notifications_weekly_menu ?? true,
        renewalReminder: settings.notifications_renewal_reminder ?? true,
      }
    }
  } catch (error) {
    console.error('Error loading notification settings:', error)
  }

  // Valores por defecto si no hay configuraciones
  return {
    enabled: true,
    newMessages: true,
    orderUpdates: true,
    planAssignments: true,
    appointments: true,
    newOrders: true,
    weeklyMenu: true,
    renewalReminder: true,
  }
}

/**
 * Verifica si una notificación específica está habilitada
 * @param userId - ID del usuario
 * @param notificationType - Tipo de notificación
 * @param isMandatory - Si es true, siempre retorna true (notificaciones obligatorias)
 */
async function isNotificationEnabled(
  userId: string | null,
  notificationType: 'newMessages' | 'orderUpdates' | 'planAssignments' | 'appointments' | 'newOrders' | 'weeklyMenu' | 'renewalReminder',
  isMandatory: boolean = false
): Promise<boolean> {
  // Las notificaciones obligatorias siempre se envían
  if (isMandatory) return true

  const settings = await getUserNotificationSettings(userId)
  if (!settings) return true // Por defecto, habilitado

  // Si las notificaciones generales están deshabilitadas, no mostrar ninguna (excepto obligatorias)
  if (!settings.enabled) return false

  // Verificar la preferencia específica
  // Para renewalReminder, verificar la configuración específica
  if (notificationType === 'renewalReminder') {
    return settings.renewalReminder !== false
  }

  return settings[notificationType] !== false
}

/**
 * Envía notificación push desde el servidor (más rápido, funciona sin app abierta)
 */
async function sendPushNotification(data: NotificationData, userId: string | null): Promise<boolean> {
  if (!userId) return false

  // Asegurar que el título siempre incluya "Zona Azul" de forma prominente
  let finalTitle = data.title
  if (!finalTitle.includes('Zona Azul') && !finalTitle.startsWith('Zona Azul')) {
    finalTitle = `Zona Azul: ${data.title}`
  }

  try {
    const response = await fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_ids: [userId],
        title: finalTitle,
        message: data.body,
        url: data.url || '/',
        icon: data.icon || '/icon-192x192.png',
        tag: data.tag || 'zona-azul-notification',
        requireInteraction: data.isMandatory || false,
        data: {},
      }),
    })

    if (response.ok) {
      const result = await response.json()
      return result.sent > 0
    }
  } catch (error) {
    console.warn('Error enviando push notification, usando notificación local:', error)
  }

  return false
}

/**
 * Muestra una notificación usando el service worker
 * Las notificaciones obligatorias siempre se intentan enviar, incluso si el usuario tiene las notificaciones deshabilitadas
 * Intenta usar push notifications primero (más rápido) y luego fallback a notificaciones locales
 */
export async function showAppNotification(data: NotificationData, userId: string | null = null): Promise<boolean> {
  // Intentar enviar push notification primero (más rápido, funciona sin app abierta)
  if (userId) {
    const pushSent = await sendPushNotification(data, userId)
    if (pushSent) {
      return true // Push notification enviada exitosamente
    }
    // Si push falla, continuar con notificación local
  }
  if (typeof window === 'undefined') {
    return false
  }

  // Verificar si las notificaciones están soportadas
  if (!('Notification' in window)) {
    console.warn('Las notificaciones no están soportadas en este navegador')
    return false
  }

  // Para notificaciones obligatorias, intentar solicitar permiso si no está concedido
  if (data.isMandatory && Notification.permission === 'default') {
    try {
      await Notification.requestPermission()
    } catch (error) {
      console.warn('Error al solicitar permiso para notificación obligatoria:', error)
    }
  }

  // Verificar permisos (excepto para obligatorias que intentaremos mostrar de todas formas)
  if (Notification.permission !== 'granted') {
    if (data.isMandatory) {
      // Para notificaciones obligatorias, intentar mostrar de todas formas o registrar en log
      console.warn('Notificación obligatoria no pudo mostrarse: permisos no concedidos')
      // Aquí podrías registrar en una cola para mostrar cuando se concedan permisos
    } else {
      console.warn('Permiso de notificaciones no concedido')
      return false
    }
  }

  try {
    // Intentar usar Service Worker primero (mejor para PWA)
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready

        await registration.showNotification(data.title, {
          body: data.body,
          icon: data.icon || '/icon-192x192.png',
          badge: '/icon-192x192.png',
          image: data.image, // Imagen grande opcional
          tag: data.tag || 'zona-azul-notification',
          requireInteraction: data.isMandatory || false, // Notificaciones obligatorias requieren interacción
          data: {
            url: data.url || '/',
            timestamp: Date.now(),
            isMandatory: data.isMandatory || false,
            appName: 'Zona Azul', // Nombre de la aplicación
          },
          vibrate: data.isMandatory ? [300, 200, 300, 200, 300] : [200, 100, 200], // Más vibrante para obligatorias
          silent: false,
          dir: 'ltr',
          lang: 'es',
        } as any)

        return true
      } catch (swError) {
        console.warn('Error con Service Worker, usando Notification API:', swError)
        // Fallback a Notification API si Service Worker falla
      }
    }

    // Fallback: usar Notification API directamente
    const notification = new Notification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192x192.png',
      badge: '/icon-192x192.png',
      image: data.image, // Imagen grande opcional
      tag: data.tag || 'zona-azul-notification',
      requireInteraction: data.isMandatory || false, // Notificaciones obligatorias requieren interacción
      data: {
        url: data.url || '/',
        timestamp: Date.now(),
        isMandatory: data.isMandatory || false,
        appName: 'Zona Azul', // Nombre de la aplicación
      },
      dir: 'ltr',
      lang: 'es',
    } as any)

    // Manejar clic en la notificación
    notification.onclick = () => {
      window.focus()
      if (data.url) {
        window.location.href = data.url
      }
      notification.close()
    }

    return true
  } catch (error) {
    console.error('Error al mostrar notificación:', error)
    return false
  }
}

/**
 * Notificaciones específicas por tipo de evento
 */
export const NotificationHelpers = {
  // Notificación de nuevo mensaje
  newMessage: async (senderName: string, messagePreview: string, url: string = '/', userId: string | null = null) => {
    if (!(await isNotificationEnabled(userId, 'newMessages'))) return false

    return showAppNotification({
      title: `Nuevo mensaje de ${senderName}`,
      body: messagePreview,
      url,
      tag: 'new-message',
      icon: '/icon-192x192.png',
    })
  },

  // Notificación de cambio de estado de pedido
  orderStatusChanged: async (orderId: string, newStatus: string, url: string = '/suscriptor/pedidos', userId: string | null = null) => {
    if (!(await isNotificationEnabled(userId, 'orderUpdates'))) return false

    const statusMessages: Record<string, string> = {
      'Preparando': 'Tu pedido está siendo preparado',
      'En camino': '¡Tu pedido está en camino!',
      'Entregado': 'Tu pedido ha sido entregado',
      'Cancelado': 'Tu pedido ha sido cancelado',
    }

    return showAppNotification({
      title: 'Estado de pedido actualizado',
      body: statusMessages[newStatus] || `Tu pedido ahora está: ${newStatus}`,
      url,
      tag: `order-${orderId}`,
      icon: '/icon-192x192.png',
    })
  },

  // Notificación de nuevo pedido asignado (para repartidor)
  newOrderAssigned: async (customerName: string, url: string = '/repartidor/pedidos', userId: string | null = null) => {
    if (!(await isNotificationEnabled(userId, 'newOrders'))) return false

    return showAppNotification({
      title: 'Nuevo pedido asignado',
      body: `Tienes un nuevo pedido de ${customerName}`,
      url,
      tag: 'new-order',
      icon: '/icon-192x192.png',
    })
  },

  // Notificación de nueva cita (para nutricionista)
  newAppointment: async (clientName: string, date: string, url: string = '/nutricionista/citas', userId: string | null = null) => {
    if (!(await isNotificationEnabled(userId, 'appointments'))) return false

    return showAppNotification({
      title: 'Nueva cita solicitada',
      body: `${clientName} ha solicitado una cita para ${date}`,
      url,
      tag: 'new-appointment',
      icon: '/icon-192x192.png',
    })
  },

  // Notificación de plan asignado (para suscriptor)
  planAssigned: async (planName: string, url: string = '/suscriptor/plan', userId: string | null = null) => {
    if (!(await isNotificationEnabled(userId, 'planAssignments'))) return false

    return showAppNotification({
      title: '¡Plan asignado!',
      body: `Tu nutricionista te ha asignado el plan: ${planName}`,
      url,
      tag: 'plan-assigned',
      icon: '/icon-192x192.png',
    })
  },

  // Notificación de menú semanal generado
  weeklyMenuGenerated: async (weekStart: string, url: string = '/suscriptor/plan', userId: string | null = null) => {
    if (!(await isNotificationEnabled(userId, 'weeklyMenu'))) return false

    const weekStartDate = new Date(weekStart)
    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekStartDate.getDate() + 6)

    return showAppNotification({
      title: '¡Nuevo menú semanal disponible!',
      body: `Tu menú para la semana del ${weekStartDate.toLocaleDateString('es-ES')} al ${weekEndDate.toLocaleDateString('es-ES')} está listo`,
      url,
      tag: `weekly-menu-${weekStart}`,
      icon: '/icon-192x192.png',
    })
  },

  // Notificaciones obligatorias (legales/seguridad) - siempre se envían
  legalNotice: async (title: string, message: string, url: string = '/', userId: string | null = null) => {
    return showAppNotification({
      title,
      body: message,
      url,
      tag: 'legal-notice',
      icon: '/icon-192x192.png',
      isMandatory: true, // Siempre se envía
    })
  },

  securityAlert: async (message: string, url: string = '/', userId: string | null = null) => {
    return showAppNotification({
      title: '⚠️ Alerta de Seguridad',
      body: message,
      url,
      tag: 'security-alert',
      icon: '/icon-192x192.png',
      isMandatory: true, // Siempre se envía
    })
  },

  contractUpdate: async (message: string, url: string = '/suscriptor/suscripcion', userId: string | null = null) => {
    return showAppNotification({
      title: '📋 Actualización de Contrato',
      body: message,
      url,
      tag: 'contract-update',
      icon: '/icon-192x192.png',
      isMandatory: true, // Siempre se envía
    })
  },

  paymentRequired: async (message: string, url: string = '/suscriptor/suscripcion', userId: string | null = null) => {
    return showAppNotification({
      title: '💳 Pago Requerido',
      body: message,
      url,
      tag: 'payment-required',
      icon: '/icon-192x192.png',
      isMandatory: true, // Siempre se envía
    })
  },

  // Recordatorio de renovación (respeta preferencias del usuario)
  renewalReminder: async (planName: string, daysRemaining: number, url: string = '/suscriptor/suscripcion', userId: string | null = null) => {
    if (!(await isNotificationEnabled(userId, 'renewalReminder', false))) return false

    const message = daysRemaining === 1
      ? `Tu suscripción ${planName} vence mañana. Renueva ahora para continuar disfrutando de nuestros servicios.`
      : `Tu suscripción ${planName} vence en ${daysRemaining} días. Renueva ahora para continuar disfrutando de nuestros servicios.`

    return showAppNotification({
      title: '⏰ Recordatorio de Renovación',
      body: message,
      url,
      tag: 'renewal-reminder',
      icon: '/icon-192x192.png',
      isMandatory: false, // Respeta las preferencias del usuario
    })
  },
}

