"use client"

import { useEffect } from 'react'

export default function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Service Worker registrado exitosamente:', registration.scope)
            
            // Solicitar permiso de notificaciones después de registrar el SW
            if ('Notification' in window && Notification.permission === 'default') {
              // Esperar un poco antes de solicitar permiso para mejor UX
              setTimeout(() => {
                Notification.requestPermission().then((permission) => {
                  if (permission === 'granted') {
                    console.log('Permiso de notificaciones concedido')
                  } else {
                    console.log('Permiso de notificaciones denegado o ignorado')
                  }
                })
              }, 3000) // Esperar 3 segundos después de cargar
            }
          })
          .catch((error) => {
            console.error('Error al registrar Service Worker:', error)
          })
      })
    }
  }, [])

  return null
}

