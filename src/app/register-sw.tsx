"use client"

import { useEffect } from 'react'

export default function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then(() => {
            // Service Worker registrado exitosamente
          })
          .catch((error) => {
            console.error('Error al registrar Service Worker:', error)
          })
      })
    }
  }, [])

  return null
}

