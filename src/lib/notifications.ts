"use client"

/**
 * Utilidades para mostrar notificaciones en la aplicación
 */

interface NotificationData {
  title: string
  body: string
  icon?: string
  url?: string
  tag?: string
}

interface UserSettings {
  notifications: {
    enabled: boolean
    newMessages: boolean
    orderUpdates: boolean
    planAssignments: boolean
    appointments: boolean
    newOrders: boolean
  }
}

/**
 * Obtiene las preferencias de notificaciones del usuario
 */
function getUserNotificationSettings(userId: string | null): UserSettings['notifications'] | null {
  if (typeof window === 'undefined' || !userId) return null

  try {
    const stored = localStorage.getItem(`zona_azul_settings_user_${userId}`)
    if (stored) {
      const settings = JSON.parse(stored)
      return settings.notifications || null
    }
  } catch (error) {
    console.error('Error loading notification settings:', error)
  }

  return null
}

/**
 * Verifica si una notificación específica está habilitada
 */
function isNotificationEnabled(
  userId: string | null,
  notificationType: 'newMessages' | 'orderUpdates' | 'planAssignments' | 'appointments' | 'newOrders'
): boolean {
  const settings = getUserNotificationSettings(userId)
  if (!settings) return true // Por defecto, habilitado

  // Si las notificaciones generales están deshabilitadas, no mostrar ninguna
  if (!settings.enabled) return false

  // Verificar la preferencia específica
  return settings[notificationType] !== false
}

/**
 * Muestra una notificación usando el service worker
 */
export async function showAppNotification(data: NotificationData): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready

    await registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: data.tag || 'zona-azul-notification',
      requireInteraction: false,
      data: {
        url: data.url || '/',
        timestamp: Date.now(),
      },
      vibrate: [200, 100, 200],
    })

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
    if (!isNotificationEnabled(userId, 'newMessages')) return false

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
    if (!isNotificationEnabled(userId, 'orderUpdates')) return false

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
    if (!isNotificationEnabled(userId, 'newOrders')) return false

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
    if (!isNotificationEnabled(userId, 'appointments')) return false

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
    if (!isNotificationEnabled(userId, 'planAssignments')) return false

    return showAppNotification({
      title: '¡Plan asignado!',
      body: `Tu nutricionista te ha asignado el plan: ${planName}`,
      url,
      tag: 'plan-assigned',
      icon: '/icon-192x192.png',
    })
  },
}

