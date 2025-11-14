"use client"

import dynamic from 'next/dynamic'
import { useAuth } from '@/hooks/useAuth'

// Lazy load de componentes pesados
const NotificationsPanel = dynamic(() => import('../notifications/NotificationsPanel'), { ssr: false })
const MessagesWidget = dynamic(() => import('../messaging/MessagesWidget'), { ssr: false })

/**
 * Contenedor de paneles que se renderiza fuera del header
 * Esto asegura que los paneles siempre estén disponibles independientemente
 * del estado del header
 */
export default function PanelsContainer() {
  const { isAuthenticated, role } = useAuth()

  // Solo renderizar paneles si el usuario está autenticado y no es invitado
  if (!isAuthenticated || role === 'invitado') {
    return null
  }

  return (
    <>
      <NotificationsPanel />
      <MessagesWidget />
    </>
  )
}

