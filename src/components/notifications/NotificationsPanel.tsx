'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { usePanel } from '@/contexts/PanelContext'

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

interface Notification {
  id: string
  notification_type: string
  title: string
  message: string
  is_mandatory: boolean
  sent_at: string
  read_at: string | null
  url?: string
}

export default function NotificationsPanel() {
  const { userId } = useAuth()
  const router = useRouter()
  const isMobile = useIsMobile()
  const { isNotificationsOpen, setIsNotificationsOpen, setIsMessagesOpen, setIsSettingsOpen } = usePanel()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (userId) {
      loadNotifications()
      // Polling cada 30 segundos para nuevas notificaciones
      const interval = setInterval(loadNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [userId])

  useEffect(() => {
    // Cerrar panel al hacer clic fuera
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
    }

    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isNotificationsOpen, setIsNotificationsOpen])

  const loadNotifications = async () => {
    if (!userId) return

    try {
      const response = await fetch('/api/notifications?limit=50')
      if (!response.ok) throw new Error('Error al cargar notificaciones')

      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unread_count || 0)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      })

      if (response.ok) {
        // Actualizar estado local
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
          )
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
      })

      if (response.ok) {
        // Actualizar estado local
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
        )
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    // Marcar como leída
    if (!notification.read_at) {
      markAsRead(notification.id)
    }

    // Navegar si tiene URL
    if (notification.url) {
      router.push(notification.url)
      setIsNotificationsOpen(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      weekly_menu: '📅',
      menu_changes_approved: '✅',
      order_status: '📦',
      renewal_reminder: '⏰',
      plan_approval: '📋',
      consultation_required: '👥',
      stock_alert: '⚠️',
      new_message: '💬',
      order_update: '🚚',
      plan_assignment: '📝',
      appointment: '📆',
      new_order: '🛒',
    }
    return icons[type] || '🔔'
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'Ahora'
    if (minutes < 60) return `Hace ${minutes} min`
    if (hours < 24) return `Hace ${hours} h`
    if (days < 7) return `Hace ${days} d`
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  // No renderizar si no hay userId (después de todos los hooks)
  if (!userId) {
    return null
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Botón de notificaciones - siempre visible */}
      <button
        onClick={() => {
          // Cerrar otros paneles y abrir/cerrar notificaciones
          setIsMessagesOpen(false)
          setIsSettingsOpen(false)
          setIsNotificationsOpen(!isNotificationsOpen)
        }}
        className="relative p-2 text-gray-600 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors flex-shrink-0"
        aria-label="Notificaciones"
        title="Notificaciones"
      >
        <svg
          className="w-5 h-5 sm:w-6 sm:h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-5 px-1 sm:px-0 text-[10px] sm:text-xs font-bold text-white bg-red-500 rounded-full border-2 border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel de notificaciones */}
      {isNotificationsOpen && (
        <>
          {/* Overlay para móviles */}
          <div 
            className="fixed inset-0 bg-black/20 z-[45] sm:hidden"
            onClick={(e) => {
              e.stopPropagation()
              setIsNotificationsOpen(false)
            }}
            onMouseDown={(e) => e.stopPropagation()}
          />
          <div 
            className="fixed sm:absolute inset-x-0 sm:inset-x-auto top-0 sm:top-full right-0 sm:right-0 mt-0 sm:mt-2 w-full sm:w-80 md:w-96 bg-white rounded-none sm:rounded-lg shadow-xl border-0 sm:border border-gray-200 z-[50] flex flex-col"
            style={isMobile ? {
              height: '100dvh',
              maxHeight: '100dvh',
            } : {
              maxHeight: '600px',
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 flex-shrink-0 bg-white">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Notificaciones</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      markAllAsRead()
                    }}
                    className="text-xs sm:text-sm text-primary hover:text-primary/80 active:text-primary/70 font-medium px-2 sm:px-0 touch-manipulation"
                  >
                    <span className="hidden sm:inline">Marcar todas como leídas</span>
                    <span className="sm:hidden">Marcar todas</span>
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsNotificationsOpen(false)
                  }}
                  className="p-1.5 sm:p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation flex-shrink-0"
                  aria-label="Cerrar notificaciones"
                  title="Cerrar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

          {/* Lista de notificaciones */}
          <div className="overflow-y-auto flex-1 overscroll-contain min-h-0">
            {loading ? (
              <div className="flex items-center justify-center p-6 sm:p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-gray-500">
                <svg
                  className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p className="text-xs sm:text-sm">No hay notificaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-3 sm:p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation ${
                      !notification.read_at ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="flex-shrink-0 text-xl sm:text-2xl">
                        {getNotificationIcon(notification.notification_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p
                            className={`text-xs sm:text-sm font-medium line-clamp-2 ${
                              !notification.read_at ? 'text-gray-900' : 'text-gray-700'
                            }`}
                          >
                            {notification.title}
                          </p>
                          {!notification.read_at && (
                            <span className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-1.5"></span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 sm:line-clamp-3 mb-1.5 sm:mb-2 leading-relaxed">
                          {notification.message}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-400">
                          {formatTime(notification.sent_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-200 p-2 sm:p-3 flex-shrink-0">
              <button
                onClick={() => {
                  setIsNotificationsOpen(false)
                  router.push('/notificaciones')
                }}
                className="w-full text-center text-xs sm:text-sm text-primary hover:text-primary/80 active:text-primary/70 font-medium py-2 sm:py-2.5 touch-manipulation"
              >
                Ver todas las notificaciones
              </button>
            </div>
          )}
          </div>
        </>
      )}
    </div>
  )
}

