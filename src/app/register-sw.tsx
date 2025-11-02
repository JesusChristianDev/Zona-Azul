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
          })
          .catch((error) => {
            console.log('Error al registrar Service Worker:', error)
          })
      })
    }
  }, [])

  return null
}

