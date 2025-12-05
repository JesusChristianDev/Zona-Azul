"use client"

import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePanel } from '@/contexts/PanelContext'
import { usePathname } from 'next/navigation'
import { isPublicRoute as checkIfPublicRoute } from '@/constants/routes'

// Tipos para los componentes
type ComponentType = React.ComponentType<any> | null

/**
 * Contenedor de paneles que se renderiza fuera del header
 * Esto asegura que los paneles siempre estén disponibles independientemente
 * del estado del header
 */
export default function PanelsContainer() {
  const { isAuthenticated, role, loading: authLoading } = useAuth()
  const { isSettingsOpen, setIsNotificationsOpen, setIsMessagesOpen, setIsSettingsOpen } = usePanel()
  const pathname = usePathname()
  const [shouldLoad, setShouldLoad] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [componentsLoaded, setComponentsLoaded] = useState(false)
  const [NotificationsPanel, setNotificationsPanel] = useState<ComponentType>(null)
  const [MessagesWidget, setMessagesWidget] = useState<ComponentType>(null)
  const [AjustesComponent, setAjustesComponent] = useState<ComponentType>(null)

  // Memoizar el estado de ruta pública para evitar recálculos innecesarios
  const isPublicRoute = useMemo(() => checkIfPublicRoute(pathname), [pathname])

  // Asegurar que solo se renderice en el cliente después de la hidratación
  useEffect(() => {
    // Solo establecer mounted en el cliente
    if (typeof window !== 'undefined') {
      setMounted(true)
    }
  }, [])

  // Solo cargar componentes si el usuario está autenticado y no está en la página raíz
  useEffect(() => {
    // Solo cargar si está autenticado, no es invitado, y no está en una ruta pública
    if (!authLoading && isAuthenticated && role !== 'invitado' && !isPublicRoute) {
      setShouldLoad(true)
    } else {
      setShouldLoad(false)
      // Cerrar todos los paneles cuando se navega a una ruta pública
      // Esto previene que los paneles queden abiertos cuando no deberían estar visibles
      if (isPublicRoute) {
        setIsNotificationsOpen(false)
        setIsMessagesOpen(false)
        setIsSettingsOpen(false)
      }
    }
  }, [isAuthenticated, role, authLoading, isPublicRoute, setIsNotificationsOpen, setIsMessagesOpen, setIsSettingsOpen])

  // Cargar componentes lazy solo cuando shouldLoad es true y están montados
  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined' || !mounted) return
    
    if (shouldLoad && !componentsLoaded) {
      // Cargar componentes de forma asíncrona solo cuando se necesiten
      let cancelled = false
      
      const loadComponents = async () => {
        try {
          const [NotificationsPanelModule, MessagesWidgetModule, AjustesComponentModule] = await Promise.all([
            import('../notifications/NotificationsPanel'),
            import('../messaging/MessagesWidget'),
            import('../settings/AjustesComponent')
          ])
          
          if (!cancelled) {
            setNotificationsPanel(() => NotificationsPanelModule.default)
            setMessagesWidget(() => MessagesWidgetModule.default)
            setAjustesComponent(() => AjustesComponentModule.default)
            setComponentsLoaded(true)
          }
        } catch (error) {
          if (!cancelled) {
            console.error('Error loading panel components:', error)
          }
        }
      }
      
      // Cargar inmediatamente sin delay para mejor rendimiento
      loadComponents()
      
      return () => {
        cancelled = true
      }
    } else if (!shouldLoad && componentsLoaded) {
      // Limpiar componentes cuando no se necesitan
      setNotificationsPanel(null)
      setMessagesWidget(null)
      setAjustesComponent(null)
      setComponentsLoaded(false)
    }
  }, [shouldLoad, mounted, componentsLoaded])

  // CRÍTICO: Retornar null durante SSR y hasta que esté completamente montado
  // Esto previene cualquier intento de hidratación
  // También retornar null si estamos en una ruta pública
  if (typeof window === 'undefined' || !mounted || isPublicRoute) {
    return null
  }

  // No renderizar nada si no debe cargarse o si está cargando la autenticación
  // Esto previene que se intente cargar los módulos lazy cuando no hay usuario
  if (authLoading || !shouldLoad || !isAuthenticated || role === 'invitado') {
    return null
  }

  // Solo renderizar si los componentes están cargados
  if (!componentsLoaded || !NotificationsPanel || !MessagesWidget) {
    return null
  }

  return (
    <>
      <NotificationsPanel />
      <MessagesWidget />
      {/* Renderizar panel de ajustes siempre (como los otros paneles) */}
      {/* El componente internamente verifica si está abierto */}
      {role && AjustesComponent && <AjustesComponent role={role} />}
    </>
  )
}