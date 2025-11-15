"use client"

import { useState, useEffect, useCallback } from 'react'

interface NotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
  data?: any
  actions?: Array<{ action: string; title: string; icon?: string }>
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Verificar si las notificaciones están soportadas
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
    }
  }, [])

  // Solicitar permiso para notificaciones
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Las notificaciones no están soportadas en este navegador')
      return false
    }

    if (permission === 'granted') {
      return true
    }

    if (permission === 'denied') {
      console.warn('Los permisos de notificación fueron denegados')
      return false
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === 'granted'
    } catch (error) {
      console.error('Error al solicitar permiso de notificaciones:', error)
      return false
    }
  }, [isSupported, permission])

  // Mostrar notificación local
  const showNotification = useCallback(
    async (options: NotificationOptions) => {
      if (!isSupported) {
        console.warn('Las notificaciones no están soportadas')
        return false
      }

      // Si no tenemos permiso, intentar solicitarlo
      if (permission !== 'granted') {
        const granted = await requestPermission()
        if (!granted) {
          return false
        }
      }

      try {
        // Verificar si el service worker está disponible
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready

          await registration.showNotification(options.title, {
            body: options.body,
            icon: options.icon || '/icon-192x192.png',
            badge: options.badge || '/icon-192x192.png',
            tag: options.tag || 'zona-azul-notification',
            requireInteraction: options.requireInteraction || false,
            data: {
              ...options.data,
              appName: 'Zona Azul', // Nombre de la aplicación
            },
            vibrate: [200, 100, 200],
            actions: options.actions || [],
            dir: 'ltr',
            lang: 'es',
          } as any)

          return true
        } else {
          // Fallback a Notification API si no hay service worker
          new Notification(options.title, {
            body: options.body,
            icon: options.icon || '/icon-192x192.png',
            badge: options.badge || '/icon-192x192.png',
            tag: options.tag || 'zona-azul-notification',
            data: {
              ...options.data,
              appName: 'Zona Azul', // Nombre de la aplicación
            },
            dir: 'ltr',
            lang: 'es',
          } as any)

          return true
        }
      } catch (error) {
        console.error('Error al mostrar notificación:', error)
        return false
      }
    },
    [isSupported, permission, requestPermission]
  )

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    isGranted: permission === 'granted',
  }
}

