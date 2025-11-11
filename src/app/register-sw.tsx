"use client"

import { useEffect } from 'react'

export default function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Registrar inmediatamente sin esperar a 'load' para mejor rendimiento
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          // Verificar actualizaciones cada hora
          setInterval(() => {
            registration.update()
          }, 60 * 60 * 1000)
          
          // Solicitar permiso de notificaciones solo si el usuario está interactuando
          if ('Notification' in window && Notification.permission === 'default') {
            // Solo solicitar después de interacción del usuario
            const requestNotificationPermission = () => {
              Notification.requestPermission().then((permission) => {
                if (permission === 'granted') {
                  console.log('Permiso de notificaciones concedido')
                }
              })
            }
            
            // Solicitar después de primer clic o después de 5 segundos
            let requested = false
            const handleInteraction = () => {
              if (!requested) {
                requested = true
                requestNotificationPermission()
                document.removeEventListener('click', handleInteraction)
                document.removeEventListener('touchstart', handleInteraction)
              }
            }
            
            document.addEventListener('click', handleInteraction, { once: true })
            document.addEventListener('touchstart', handleInteraction, { once: true })
            
            // Fallback: solicitar después de 5 segundos si no hay interacción
            setTimeout(() => {
              if (!requested) {
                requested = true
                requestNotificationPermission()
              }
            }, 5000)
          }
        })
        .catch((error) => {
          console.error('Error al registrar Service Worker:', error)
        })
    }
  }, [])

  return null
}

