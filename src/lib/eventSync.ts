/**
 * Utilidades centralizadas para sincronización de eventos en tiempo real
 * 
 * Este módulo proporciona funciones helper para:
 * - Disparar eventos de actualización
 * - Escuchar eventos de actualización
 * - Sincronización entre pestañas mediante Storage API
 */

/**
 * Eventos personalizados disponibles en la aplicación
 */
export const APP_EVENTS = {
  MENU_UPDATED: 'zona_azul_menu_updated',
  PLAN_UPDATED: 'zona_azul_plan_updated',
  SUGGESTED_MEALS_UPDATED: 'zona_azul_suggested_meals_updated',
  USERS_UPDATED: 'zona_azul_users_updated',
  SUBSCRIBERS_UPDATED: 'zona_azul_subscribers_updated',
  CLIENTS_UPDATED: 'zona_azul_clients_updated',
  DELIVERIES_UPDATED: 'zona_azul_deliveries_updated',
  ADMIN_ORDERS_UPDATED: 'zona_azul_admin_orders_updated',
  APPOINTMENTS_UPDATED: 'zona_azul_appointments_updated',
  MESSAGES_UPDATED: 'zona_azul_messages_updated',
  SETTINGS_UPDATED: 'zona_azul_settings_updated',
  PLANS_UPDATED: 'zona_azul_plans_updated',
} as const

/**
 * Dispara un evento de actualización
 */
export function dispatchUpdateEvent(eventName: keyof typeof APP_EVENTS): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(APP_EVENTS[eventName]))
}

/**
 * Escucha un evento de actualización
 */
export function listenToUpdateEvent(
  eventName: keyof typeof APP_EVENTS,
  callback: () => void
): () => void {
  if (typeof window === 'undefined') return () => {}

  window.addEventListener(APP_EVENTS[eventName], callback)
  
  // Retorna función de limpieza
  return () => {
    window.removeEventListener(APP_EVENTS[eventName], callback)
  }
}


/**
 * Configura listeners combinados (eventos personalizados)
 * 
 * NOTA: Solo escucha eventos personalizados.
 * La sincronización de datos se hace mediante polling de APIs.
 */
export function setupRealtimeSync(
  eventNames: Array<keyof typeof APP_EVENTS>,
  callback: () => void
): () => void {
  if (typeof window === 'undefined') return () => {}

  const cleanupFunctions: Array<() => void> = []

  // Escuchar eventos personalizados
  eventNames.forEach((eventName) => {
    const cleanup = listenToUpdateEvent(eventName, callback)
    cleanupFunctions.push(cleanup)
  })

  // Retorna función de limpieza combinada
  return () => {
    cleanupFunctions.forEach((cleanup) => cleanup())
  }
}

