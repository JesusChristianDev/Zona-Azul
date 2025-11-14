"use client"

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useRouter, usePathname } from 'next/navigation'
import { usePanel } from '../../contexts/PanelContext'
import * as api from '../../lib/api'
import { useNotifications } from '../../hooks/useNotifications'

// Hook para detectar si es móvil
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640) // sm breakpoint
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

interface UserSettings {
  notifications: {
    enabled: boolean
    newMessages: boolean
    orderUpdates: boolean
    planAssignments: boolean
    appointments: boolean
    newOrders: boolean
    weeklyMenu: boolean
    menuChangesApproved: boolean
    orderStatus: boolean
    renewalReminder: boolean
    planApproval: boolean
    consultationRequired: boolean
  }
  preferences: {
    language: string
    theme: 'light' | 'dark' | 'auto'
    emailNotifications: boolean
  }
}

const defaultSettings: UserSettings = {
  notifications: {
    enabled: true,
    newMessages: true,
    orderUpdates: true,
    planAssignments: true,
    appointments: true,
    newOrders: true,
    weeklyMenu: true,
    menuChangesApproved: true,
    orderStatus: true,
    renewalReminder: true,
    planApproval: true,
    consultationRequired: true,
  },
  preferences: {
    language: 'es',
    theme: 'light',
    emailNotifications: false,
  },
}

interface AjustesComponentProps {
  role: 'admin' | 'suscriptor' | 'nutricionista' | 'repartidor'
}

export default function AjustesComponent({ role }: AjustesComponentProps) {
  const { userId, userName, role: userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { isSupported, permission, requestPermission, isGranted } = useNotifications()
  const isMobile = useIsMobile()
  const { setIsSettingsOpen, setIsNotificationsOpen, setIsMessagesOpen } = usePanel()
  const panelRef = useRef<HTMLDivElement>(null)
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)
  const [originalSettings, setOriginalSettings] = useState<UserSettings>(defaultSettings)
  const [loading, setLoading] = useState(false) // Iniciar como false para mostrar inmediatamente
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  // Cargar ajustes en segundo plano sin bloquear el renderizado
  useEffect(() => {
    // Solo cargar si tenemos userId y el rol coincide, y no está cargando la autenticación
    if (!authLoading && userId && (!userRole || userRole === role)) {
      const loadSettings = async () => {
        try {
          const dbSettings = await api.getUserSettings()
          if (dbSettings) {
            const loadedSettings: UserSettings = {
              notifications: {
                enabled: dbSettings.notifications_enabled ?? true,
                newMessages: dbSettings.notifications_new_messages ?? true,
                orderUpdates: dbSettings.notifications_order_updates ?? true,
                planAssignments: dbSettings.notifications_plan_assignments ?? true,
                appointments: dbSettings.notifications_appointments ?? true,
                newOrders: dbSettings.notifications_new_orders ?? true,
                weeklyMenu: dbSettings.notifications_weekly_menu ?? true,
                menuChangesApproved: dbSettings.notifications_menu_changes_approved ?? true,
                orderStatus: dbSettings.notifications_order_status ?? true,
                renewalReminder: dbSettings.notifications_renewal_reminder ?? true,
                planApproval: dbSettings.notifications_plan_approval ?? true,
                consultationRequired: dbSettings.notifications_consultation_required ?? true,
              },
              preferences: {
                language: dbSettings.preferences_language || 'es',
                theme: (dbSettings.preferences_theme as 'light' | 'dark' | 'auto') || 'light',
                emailNotifications: dbSettings.preferences_email_notifications ?? false,
              },
            }
            // Actualizar sin mostrar loading
            setSettings(loadedSettings)
            setOriginalSettings(JSON.parse(JSON.stringify(loadedSettings))) // Deep copy
          }
        } catch (error) {
          console.error('Error loading settings:', error)
          // Mantener valores por defecto si hay error
        }
      }

      // Cargar en segundo plano
      loadSettings()
    }
  }, [userId, userRole, role, authLoading])

  // Marcar cuando el componente está montado (ajustes está abierto)
  useEffect(() => {
    // Solo ejecutar en el cliente y si el pathname está disponible
    if (typeof window === 'undefined' || !pathname) {
      return
    }

    // Pequeño delay para asegurar que el componente esté completamente montado
    const timer = setTimeout(() => {
      if (pathname.includes('/ajustes')) {
        // Cerrar otros paneles al abrir ajustes
        try {
          setIsNotificationsOpen(false)
          setIsMessagesOpen(false)
          setIsSettingsOpen(true)
        } catch (error) {
          console.error('Error setting panel state:', error)
        }
      }
    }, 0)

    return () => {
      clearTimeout(timer)
      try {
        setIsSettingsOpen(false)
      } catch (error) {
        console.error('Error cleaning up panel state:', error)
      }
    }
  }, [pathname, setIsSettingsOpen, setIsNotificationsOpen, setIsMessagesOpen])

  // Prevenir salida del navegador si hay cambios sin guardar
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings)
      if (hasChanges) {
        e.preventDefault()
        e.returnValue = 'Tienes cambios sin guardar. ¿Estás seguro de que deseas salir?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [settings, originalSettings])

  const handleSave = async () => {
    if (!userId) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Si las notificaciones están habilitadas pero no tenemos permiso, solicitarlo
      if (settings.notifications.enabled && !isGranted && isSupported) {
        const granted = await requestPermission()
        if (!granted) {
          setError('Se requiere permiso de notificaciones para activar esta función')
          setSaving(false)
          return
        }
      }

      // Guardar ajustes en la base de datos
      await api.updateUserSettings({
        notifications_enabled: settings.notifications.enabled,
        notifications_new_messages: settings.notifications.newMessages,
        notifications_order_updates: settings.notifications.orderUpdates,
        notifications_plan_assignments: settings.notifications.planAssignments,
        notifications_appointments: settings.notifications.appointments,
        notifications_new_orders: settings.notifications.newOrders,
        notifications_weekly_menu: settings.notifications.weeklyMenu,
        notifications_menu_changes_approved: settings.notifications.menuChangesApproved,
        notifications_order_status: settings.notifications.orderStatus,
        notifications_renewal_reminder: settings.notifications.renewalReminder,
        notifications_plan_approval: settings.notifications.planApproval,
        notifications_consultation_required: settings.notifications.consultationRequired,
        preferences_language: settings.preferences.language,
        preferences_theme: settings.preferences.theme,
        preferences_email_notifications: settings.preferences.emailNotifications,
      })

      setSuccess('Ajustes guardados correctamente')
      setOriginalSettings(JSON.parse(JSON.stringify(settings))) // Actualizar originales
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setError('Error al guardar los ajustes')
      setTimeout(() => setError(null), 5000)
    } finally {
      setSaving(false)
    }
  }

  const updateNotificationSetting = (key: keyof UserSettings['notifications'], value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value,
      },
    }))
  }

  const updatePreference = (key: keyof UserSettings['preferences'], value: any) => {
    setSettings((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value,
      },
    }))
  }

  const handleRequestNotificationPermission = async () => {
    if (!isSupported) {
      setError('Las notificaciones no están soportadas en este navegador')
      return
    }

    const granted = await requestPermission()
    if (granted) {
      setSuccess('Permiso de notificaciones concedido')
      updateNotificationSetting('enabled', true)
    } else {
      setError('Permiso de notificaciones denegado. Puedes activarlo manualmente en la configuración del navegador.')
    }
  }

  // Función para detectar si hay cambios sin guardar
  const hasUnsavedChanges = () => {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings)
  }

  // Función para manejar el cierre/volver
  const handleExit = () => {
    if (hasUnsavedChanges()) {
      setShowExitConfirm(true)
    } else {
      setIsSettingsOpen(false)
      router.back()
    }
  }

  // Función para descartar cambios y salir
  const handleDiscardAndExit = () => {
    setSettings(JSON.parse(JSON.stringify(originalSettings))) // Restaurar originales
    setShowExitConfirm(false)
    setIsSettingsOpen(false)
    router.back()
  }

  // Función para guardar y salir
  const handleSaveAndExit = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Si las notificaciones están habilitadas pero no tenemos permiso, solicitarlo
      if (settings.notifications.enabled && !isGranted && isSupported) {
        const granted = await requestPermission()
        if (!granted) {
          setError('Se requiere permiso de notificaciones para activar esta función')
          setSaving(false)
          return
        }
      }

      // Guardar ajustes en la base de datos
      await api.updateUserSettings({
        notifications_enabled: settings.notifications.enabled,
        notifications_new_messages: settings.notifications.newMessages,
        notifications_order_updates: settings.notifications.orderUpdates,
        notifications_plan_assignments: settings.notifications.planAssignments,
        notifications_appointments: settings.notifications.appointments,
        notifications_new_orders: settings.notifications.newOrders,
        notifications_weekly_menu: settings.notifications.weeklyMenu,
        notifications_menu_changes_approved: settings.notifications.menuChangesApproved,
        notifications_order_status: settings.notifications.orderStatus,
        notifications_renewal_reminder: settings.notifications.renewalReminder,
        notifications_plan_approval: settings.notifications.planApproval,
        notifications_consultation_required: settings.notifications.consultationRequired,
        preferences_language: settings.preferences.language,
        preferences_theme: settings.preferences.theme,
        preferences_email_notifications: settings.preferences.emailNotifications,
      })

      setSuccess('Ajustes guardados correctamente')
      setOriginalSettings(JSON.parse(JSON.stringify(settings))) // Actualizar originales
      setShowExitConfirm(false)
      setIsSettingsOpen(false)
      router.back()
    } catch (error) {
      console.error('Error saving settings:', error)
      setError('Error al guardar los ajustes')
    } finally {
      setSaving(false)
    }
  }

  // Renderizar siempre el panel, incluso durante la autenticación
  // ProtectedRoute ya maneja la validación de acceso
  // Solo verificar después de que termine la autenticación para evitar renderizar innecesariamente
  // También verificar que estamos en el cliente
  if (typeof window === 'undefined') {
    return null
  }

  if (!authLoading && (!userId || (userRole && userRole !== role))) {
    return null
  }

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    suscriptor: 'Suscriptor',
    nutricionista: 'Nutricionista',
    repartidor: 'Repartidor',
  }

  return (
    <>
      {/* Overlay - siempre visible (móvil y desktop) - z-index menor para que el dashboard sea visible */}
      <div
        className="fixed inset-0 bg-black/20 z-[45] animate-in fade-in duration-200"
        data-nextjs-scroll-focus-boundary
        onClick={(e) => {
          e.stopPropagation()
          handleExit()
        }}
        onMouseDown={(e) => e.stopPropagation()}
      />

      {/* Panel de ajustes */}
      <div
        ref={panelRef}
        className="fixed inset-0 sm:inset-auto sm:top-16 sm:left-auto sm:right-4 sm:bottom-4 sm:w-[calc(100vw-2rem)] sm:max-w-4xl sm:h-[calc(100vh-6rem)] bg-white sm:rounded-xl sm:shadow-2xl z-[50] flex flex-col overflow-hidden border-0 sm:border border-gray-200 animate-in fade-in slide-in-from-right-4 sm:slide-in-from-bottom-4 duration-200"
        data-nextjs-scroll-focus-boundary
        style={isMobile ? {
          height: '100dvh',
          maxHeight: '100dvh',
        } : {}}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header fijo */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-primary/10 via-accent/10 to-highlight/10 sm:rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-base sm:text-lg truncate text-gray-900">Ajustes</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5 truncate">
                {roleLabels[role] || 'Configuración'}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleExit()
            }}
            className="p-2 hover:bg-white/50 sm:hover:bg-gray-100 rounded-lg transition-all duration-200 flex-shrink-0 active:scale-95"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 bg-gray-50">
          <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Mensajes de éxito/error */}
            {success && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-green-700 font-medium">{success}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {/* Sección: Notificaciones */}
            <section className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Notificaciones</h2>
                  <p className="text-sm text-gray-600">Controla qué notificaciones recibes</p>
                </div>
              </div>

              {/* Estado de permisos */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-medium text-gray-900 mb-1">Estado de permisos</p>
                    <p className="text-sm text-gray-600">
                      {!isSupported
                        ? 'Las notificaciones no están disponibles en este navegador'
                        : permission === 'granted'
                          ? '✅ Permisos concedidos'
                          : permission === 'denied'
                            ? '❌ Permisos denegados. Actívalos en la configuración del navegador'
                            : '⚠️ Permisos pendientes. Actívalos para recibir notificaciones'}
                    </p>
                  </div>
                  {isSupported && permission !== 'granted' && (
                    <button
                      onClick={handleRequestNotificationPermission}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      Solicitar permiso
                    </button>
                  )}
                </div>
              </div>

              {/* Toggle principal de notificaciones */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Activar notificaciones</h3>
                    <p className="text-sm text-gray-600">Recibir notificaciones en este dispositivo</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.enabled}
                      onChange={(e) => updateNotificationSetting('enabled', e.target.checked)}
                      disabled={!isGranted}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                  </label>
                </div>
              </div>

              {/* Opciones específicas de notificaciones */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">Nuevos mensajes</p>
                      <p className="text-xs text-gray-500">Notificarme cuando reciba mensajes</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.newMessages}
                      onChange={(e) => updateNotificationSetting('newMessages', e.target.checked)}
                      disabled={!settings.notifications.enabled}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                  </label>
                </div>

                {(role === 'suscriptor' || role === 'admin') && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <div>
                        <p className="font-medium text-gray-900">Actualizaciones de pedidos</p>
                        <p className="text-xs text-gray-500">Notificarme sobre cambios en mis pedidos</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.orderUpdates}
                        onChange={(e) => updateNotificationSetting('orderUpdates', e.target.checked)}
                        disabled={!settings.notifications.enabled}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                    </label>
                  </div>
                )}

                {role === 'suscriptor' && (
                  <>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div>
                          <p className="font-medium text-gray-900">Asignación de planes</p>
                          <p className="text-xs text-gray-500">Notificarme cuando me asignen un plan</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.planAssignments}
                          onChange={(e) => updateNotificationSetting('planAssignments', e.target.checked)}
                          disabled={!settings.notifications.enabled}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        <div>
                          <p className="font-medium text-gray-900">Menú semanal</p>
                          <p className="text-xs text-gray-500">Notificarme cuando se genere mi menú semanal</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.weeklyMenu}
                          onChange={(e) => updateNotificationSetting('weeklyMenu', e.target.checked)}
                          disabled={!settings.notifications.enabled}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="font-medium text-gray-900">Cambios aprobados</p>
                          <p className="text-xs text-gray-500">Notificarme cuando se aprueben cambios en mi menú</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.menuChangesApproved}
                          onChange={(e) => updateNotificationSetting('menuChangesApproved', e.target.checked)}
                          disabled={!settings.notifications.enabled}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="font-medium text-gray-900">Estado de pedidos</p>
                          <p className="text-xs text-gray-500">Notificarme sobre actualizaciones de estado de pedidos</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.orderStatus}
                          onChange={(e) => updateNotificationSetting('orderStatus', e.target.checked)}
                          disabled={!settings.notifications.enabled}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="font-medium text-gray-900">Recordatorio de renovación</p>
                          <p className="text-xs text-gray-500">Notificarme antes de la renovación de mi plan</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.renewalReminder}
                          onChange={(e) => updateNotificationSetting('renewalReminder', e.target.checked)}
                          disabled={!settings.notifications.enabled}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <div>
                          <p className="font-medium text-gray-900">Aprobación de plan</p>
                          <p className="text-xs text-gray-500">Notificarme sobre la aprobación de mi plan</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.planApproval}
                          onChange={(e) => updateNotificationSetting('planApproval', e.target.checked)}
                          disabled={!settings.notifications.enabled}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <p className="font-medium text-gray-900">Consulta requerida</p>
                          <p className="text-xs text-gray-500">Notificarme cuando se requiera una consulta</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.consultationRequired}
                          onChange={(e) => updateNotificationSetting('consultationRequired', e.target.checked)}
                          disabled={!settings.notifications.enabled}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                      </label>
                    </div>
                  </>
                )}

                {role === 'nutricionista' && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <p className="font-medium text-gray-900">Nuevas citas</p>
                        <p className="text-xs text-gray-500">Notificarme sobre nuevas solicitudes de cita</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.appointments}
                        onChange={(e) => updateNotificationSetting('appointments', e.target.checked)}
                        disabled={!settings.notifications.enabled}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                    </label>
                  </div>
                )}

                {role === 'repartidor' && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <div>
                        <p className="font-medium text-gray-900">Nuevos pedidos</p>
                        <p className="text-xs text-gray-500">Notificarme cuando se me asignen nuevos pedidos</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.newOrders}
                        onChange={(e) => updateNotificationSetting('newOrders', e.target.checked)}
                        disabled={!settings.notifications.enabled}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                    </label>
                  </div>
                )}
              </div>
            </section>

            {/* Sección: Preferencias */}
            <section className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Preferencias</h2>
                  <p className="text-sm text-gray-600">Personaliza tu experiencia</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Idioma */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Idioma</label>
                  <select
                    value={settings.preferences.language}
                    onChange={(e) => updatePreference('language', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>

                {/* Tema */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Tema</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['light', 'dark', 'auto'] as const).map((theme) => (
                      <button
                        key={theme}
                        onClick={() => updatePreference('theme', theme)}
                        className={`p-4 rounded-lg border-2 transition-all ${settings.preferences.theme === theme
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          {theme === 'light' ? (
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          ) : theme === 'dark' ? (
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          )}
                          <span className="text-xs font-medium text-gray-700 capitalize">
                            {theme === 'light' ? 'Claro' : theme === 'dark' ? 'Oscuro' : 'Automático'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notificaciones por email */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 mb-1">Notificaciones por email</p>
                    <p className="text-xs text-gray-500">Recibir notificaciones importantes por correo electrónico</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.preferences.emailNotifications}
                      onChange={(e) => updatePreference('emailNotifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </section>

            {/* Sección: Seguridad */}
            <section className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Seguridad</h2>
                  <p className="text-sm text-gray-600">Gestiona tu contraseña y seguridad de cuenta</p>
                </div>
              </div>

              {/* Cambiar contraseña */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Cambiar contraseña</h3>
                    <p className="text-sm text-gray-600">Actualiza tu contraseña para mantener tu cuenta segura</p>
                  </div>
                  <button
                    onClick={() => router.push('/change-password')}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium whitespace-nowrap flex-shrink-0"
                  >
                    Cambiar contraseña
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-2 space-y-1">
                  <p>• Mínimo 8 caracteres</p>
                  <p>• Debe incluir mayúsculas, minúsculas y números</p>
                </div>
              </div>
            </section>

            {/* Sección: Información de cuenta */}
            <section className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Información de cuenta</h2>
                  <p className="text-sm text-gray-600">Datos personales y configuración de cuenta</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-500 mb-1">Nombre</p>
                  <p className="text-sm font-semibold text-gray-900">{userName || 'Usuario'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-500 mb-1">Rol</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{roleLabels[role] || role}</p>
                </div>
              </div>
            </section>

            {/* Botones de acción - Responsive */}
            <div className="sticky bottom-4 bg-white rounded-xl border border-gray-200 shadow-lg px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 z-10">
              {hasUnsavedChanges() && (
                <div className="text-xs sm:text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2 sm:mb-0 sm:mr-auto">
                  ⚠️ Tienes cambios sin guardar
                </div>
              )}
              <button
                onClick={handleExit}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors font-medium touch-manipulation"
              >
                {hasUnsavedChanges() ? 'Descartar' : 'Volver'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges()}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-primary text-white rounded-lg hover:bg-primary/90 active:bg-primary/80 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="hidden sm:inline">Guardando...</span>
                    <span className="sm:hidden">Guardando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Guardar cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de salida */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">¿Descartar cambios?</h3>
                <p className="text-sm text-gray-600">
                  Tienes cambios sin guardar. ¿Deseas guardarlos antes de salir o descartarlos?
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={handleDiscardAndExit}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors font-medium touch-manipulation"
              >
                Descartar y salir
              </button>
              <button
                onClick={handleSaveAndExit}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 active:bg-primary/80 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                {saving ? 'Guardando...' : 'Guardar y salir'}
              </button>
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 sm:flex-none px-4 py-2.5 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors font-medium touch-manipulation"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

