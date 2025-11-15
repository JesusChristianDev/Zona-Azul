"use client"

import { useEffect } from 'react'
import { subscribeToPushNotifications } from '@/lib/pushNotifications'
import { useAuth } from '@/hooks/useAuth'

export default function RegisterServiceWorker() {
  const { userId } = useAuth()

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Registrar inmediatamente sin esperar a 'load' para mejor rendimiento
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(async (registration) => {
          // Verificar actualizaciones cada hora
          setInterval(() => {
            registration.update()
          }, 60 * 60 * 1000)
          
          // Suscribirse automáticamente a push notifications si hay usuario y ya tiene permisos
          // NO solicitamos permisos aquí, solo nos suscribimos si ya están concedidos
          if (userId && 'PushManager' in window && Notification.permission === 'granted') {
            try {
              const isSubscribed = await registration.pushManager.getSubscription()
              if (!isSubscribed) {
                // Suscribirse automáticamente si tiene permisos pero no está suscrito
                await subscribeToPushNotifications(userId)
              }
            } catch (error) {
              console.warn('Error al suscribirse a push notifications:', error)
            }
          }
          
          // Solicitar permiso de notificaciones de forma inteligente
          if ('Notification' in window && Notification.permission === 'default') {
            // Solo solicitar después de interacción del usuario
            const requestNotificationPermission = async () => {
              try {
                const permission = await Notification.requestPermission()
                if (permission === 'granted') {
                  console.log('✅ Permiso de notificaciones concedido')
                  
                  // Verificar que el Service Worker puede mostrar notificaciones
                  if ('serviceWorker' in navigator) {
                    const reg = await navigator.serviceWorker.ready
                    // Probar que funciona
                    try {
                      await reg.showNotification('Zona Azul', {
                        body: 'Ahora recibirás notificaciones de Zona Azul',
                        icon: '/icon-192x192.png',
                        badge: '/icon-192x192.png',
                        tag: 'notification-test',
                        silent: true, // Silenciosa para no molestar
                        dir: 'ltr',
                        lang: 'es',
                      } as any)
                      
                      // Suscribirse a push notifications automáticamente
                      if (userId && 'PushManager' in window) {
                        try {
                          await subscribeToPushNotifications(userId)
                        } catch (error) {
                          console.warn('Error al suscribirse a push:', error)
                        }
                      }
                    } catch (testError) {
                      console.warn('Service Worker puede tener problemas con notificaciones:', testError)
                    }
                  }
                } else if (permission === 'denied') {
                  console.warn('Permiso de notificaciones denegado por el usuario')
                }
              } catch (error) {
                console.error('Error al solicitar permiso de notificaciones:', error)
              }
            }
            
            // Solicitar después de interacción del usuario (mejor UX)
            let requested = false
            const handleInteraction = () => {
              if (!requested) {
                requested = true
                requestNotificationPermission()
                document.removeEventListener('click', handleInteraction)
                document.removeEventListener('touchstart', handleInteraction)
                document.removeEventListener('keydown', handleInteraction)
              }
            }
            
            // Escuchar múltiples tipos de interacción
            document.addEventListener('click', handleInteraction, { once: true, passive: true })
            document.addEventListener('touchstart', handleInteraction, { once: true, passive: true })
            document.addEventListener('keydown', handleInteraction, { once: true })
            
            // Fallback: solicitar después de 10 segundos si no hay interacción
            // (aumentado de 5 a 10 para mejor UX)
            setTimeout(() => {
              if (!requested) {
                requested = true
                requestNotificationPermission()
              }
            }, 10000)
          } else if (Notification.permission === 'granted') {
            console.log('✅ Permisos de notificaciones ya concedidos')
          }
        })
        .catch((error) => {
          console.error('Error al registrar Service Worker:', error)
        })
    }
  }, [userId]) // Incluir userId para re-evaluar suscripción cuando el usuario inicie sesión

  return null
}

