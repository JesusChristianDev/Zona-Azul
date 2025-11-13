'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

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

function NotificacionesPageContent() {
  const { userId } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    if (userId) {
      loadNotifications()
      // Polling cada 30 segundos
      const interval = setInterval(loadNotifications, 30000)
      return () => clearInterval(interval)
    } else {
      setLoading(false)
    }
  }, [userId, filter])

  const loadNotifications = async () => {
    if (!userId) return

    try {
      const url = filter === 'unread' 
        ? '/api/notifications?unread_only=true'
        : '/api/notifications'
      
      const response = await fetch(url)
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
    if (!notification.read_at) {
      markAsRead(notification.id)
    }

    if (notification.url) {
      router.push(notification.url)
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

    if (minutes < 1) return 'Hace un momento'
    if (minutes < 60) return `Hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
    if (hours < 24) return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`
    if (days < 7) return `Hace ${days} ${days === 1 ? 'día' : 'días'}`
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read_at)
    : notifications

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 min-h-screen">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            {unreadCount > 0 ? `${unreadCount} no leída${unreadCount > 1 ? 's' : ''}` : 'Todas leídas'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm bg-primary text-white rounded-lg hover:bg-primary/90 active:bg-primary/80 transition font-medium touch-manipulation"
          >
            Marcar todas como leídas
          </button>
        )}
      </header>

      {/* Filtros */}
      <div className="flex gap-1 sm:gap-2 border-b border-gray-200 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-manipulation ${
            filter === 'all'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-600 hover:text-gray-900 active:text-gray-700'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors relative whitespace-nowrap touch-manipulation ${
            filter === 'unread'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-600 hover:text-gray-900 active:text-gray-700'
          }`}
        >
          No leídas
          {unreadCount > 0 && (
            <span className="ml-1.5 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs bg-primary text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Lista de notificaciones */}
      {loading ? (
        <div className="flex items-center justify-center py-8 sm:py-12">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary border-t-transparent"></div>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 sm:p-12 text-center">
          <svg
            className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-400"
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
          <p className="text-gray-500 text-base sm:text-lg font-medium mb-2">
            {filter === 'unread' ? 'No hay notificaciones no leídas' : 'No hay notificaciones'}
          </p>
          <p className="text-xs sm:text-sm text-gray-400">
            {filter === 'unread' 
              ? 'Todas tus notificaciones han sido leídas'
              : 'Las notificaciones aparecerán aquí cuando las recibas'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full text-left p-4 sm:p-6 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation ${
                  !notification.read_at ? 'bg-blue-50/30' : ''
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex-shrink-0 text-2xl sm:text-3xl">
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                          <p
                            className={`text-sm sm:text-base font-semibold line-clamp-2 ${
                              !notification.read_at ? 'text-gray-900' : 'text-gray-700'
                            }`}
                          >
                            {notification.title}
                          </p>
                          {!notification.read_at && (
                            <span className="flex-shrink-0 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-primary rounded-full"></span>
                          )}
                          {notification.is_mandatory && (
                            <span className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs bg-red-100 text-red-700 rounded-full font-medium whitespace-nowrap">
                              Obligatoria
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-3">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 sm:mt-3 gap-2">
                      <p className="text-[10px] sm:text-xs text-gray-400">
                        {formatTime(notification.sent_at)}
                      </p>
                      {notification.url && (
                        <span className="text-[10px] sm:text-xs text-primary font-medium whitespace-nowrap">
                          Ver más →
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function NotificacionesPage() {
  return (
    <ProtectedRoute>
      <NotificacionesPageContent />
    </ProtectedRoute>
  )
}

