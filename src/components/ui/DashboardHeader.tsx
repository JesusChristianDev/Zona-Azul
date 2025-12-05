"use client"

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { usePanel } from '@/contexts/PanelContext'

// Lazy load de componentes pesados
const MobileMenu = dynamic(() => import('../MobileMenu'), { ssr: true })

// Componente de botón de notificaciones
function NotificationButton() {
  const { userId } = useAuth()
  const { isNotificationsOpen, setIsNotificationsOpen, setIsMessagesOpen, setIsSettingsOpen } = usePanel()
  const [unreadCount, setUnreadCount] = useState(0)

  // Cargar contador de no leídos
  useEffect(() => {
    if (!userId) return
    const loadUnreadCount = async () => {
      try {
        const response = await fetch('/api/notifications?limit=1')
        if (response.ok) {
          const data = await response.json()
          setUnreadCount(data.unread_count || 0)
        }
      } catch (error) {
        console.error('Error loading unread count:', error)
      }
    }
    loadUnreadCount()
    const interval = setInterval(loadUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [userId])

  if (!userId) return null

  return (
    <button
      onClick={() => {
        setIsMessagesOpen(false)
        setIsSettingsOpen(false)
        setIsNotificationsOpen(!isNotificationsOpen)
      }}
      className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 rounded-lg transition-colors flex-shrink-0"
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
  )
}

// Componente de botón de mensajes
function MessageButton() {
  const { userId, role } = useAuth()
  const { isMessagesOpen, setIsMessagesOpen, setIsNotificationsOpen, setIsSettingsOpen } = usePanel()
  const [unreadTotal, setUnreadTotal] = useState(0)

  // Cargar contador de no leídos
  useEffect(() => {
    if (!userId || !role) return
    const loadUnreadCount = async () => {
      try {
        const response = await fetch('/api/messages')
        if (response.ok) {
          const data = await response.json()
          // La API devuelve { messages: [...] }
          const messages = Array.isArray(data.messages) ? data.messages : (Array.isArray(data) ? data : [])
          const unread = messages.filter((msg: any) => msg.to_id === userId && !msg.read).length
          setUnreadTotal(unread)
        }
      } catch (error) {
        console.error('Error loading unread count:', error)
      }
    }
    loadUnreadCount()
    const interval = setInterval(loadUnreadCount, 3000)
    return () => clearInterval(interval)
  }, [userId, role])

  if (!userId || !role) return null

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        setIsNotificationsOpen(false)
        setIsSettingsOpen(false)
        setIsMessagesOpen(!isMessagesOpen)
      }}
      className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 rounded-lg transition-colors flex-shrink-0"
      aria-label="Mensajes"
      title="Mensajes"
    >
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
      {unreadTotal > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] sm:min-w-[20px] h-[18px] sm:h-5 px-1 sm:px-1.5 flex items-center justify-center shadow-lg animate-pulse z-10">
          {unreadTotal > 9 ? '9+' : unreadTotal}
        </span>
      )}
    </button>
  )
}

export default function DashboardHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { role, logout, userId, isAuthenticated } = useAuth()
  const { isNotificationsOpen, isMessagesOpen, isSettingsOpen, setIsNotificationsOpen, setIsMessagesOpen, setIsSettingsOpen } = usePanel()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false)
  
  // Ocultar navbar cuando algún panel está abierto
  const isAnyPanelOpen = isNotificationsOpen || isMessagesOpen || isSettingsOpen

  useEffect(() => {
    setIsMobileActionsOpen(false)
  }, [pathname, isAnyPanelOpen])

  const handleLogout = async () => {
    // Prevenir múltiples clicks
    if (isLoggingOut) return
    
    // Iniciar animación de salida
    setIsLoggingOut(true)
    
    try {
      // Esperar a que la animación de fade out se complete
      await new Promise((resolve) => setTimeout(resolve, 300))
      
      // Ejecutar logout
      await logout()
      
      // Usar window.location.href para forzar recarga completa y evitar bucles
      // Esperar un pequeño delay adicional para suavidad
      await new Promise((resolve) => setTimeout(resolve, 100))
      
      // Forzar recarga completa de la página para evitar bucles
      window.location.href = '/'
    } catch (error) {
      console.error('Error durante logout:', error)
      // Resetear estado en caso de error
      setIsLoggingOut(false)
    }
  }

  const segments = pathname?.split('/').filter(Boolean) ?? []
  const sectionKey = segments[0]

  const baseTitles: Record<string, string> = {
    invitado: 'Selección de Rol',
    admin: 'Panel Administración',
    suscriptor: 'Dashboard Suscriptor',
    nutricionista: 'Panel Nutricionista',
    repartidor: 'Panel Repartidor',
  }

  const detailTitles: Record<string, string> = {
    'admin/menu': 'Gestión del Menú',
    'admin/usuarios': 'Gestión de Usuarios',
    'admin/pedidos': 'Pedidos Globales',
    'admin/ajustes': 'Ajustes',
    'suscriptor/plan': 'Mi Plan de Comidas',
    'suscriptor/pedidos': 'Seguimiento de Pedidos',
    'suscriptor/progreso': 'Progreso Físico',
    'suscriptor/ajustes': 'Ajustes',
    'nutricionista/clientes': 'Lista de Suscriptores',
    'nutricionista/planes': 'Crear Planes',
    'nutricionista/citas': 'Citas',
    'nutricionista/ajustes': 'Ajustes',
    'repartidor/pedidos': 'Pedidos Asignados',
    'repartidor/historial': 'Historial de Entregas',
    'repartidor/ajustes': 'Ajustes',
  }

  const sectionPath = segments.slice(0, 2).join('/')
  const breadcrumbTitle = detailTitles[sectionPath] ?? baseTitles[sectionKey ?? ''] ?? null

  const dashboardRoots = ['invitado', 'admin', 'suscriptor', 'nutricionista', 'repartidor']
  const isDashboardPage = sectionKey ? dashboardRoots.includes(sectionKey as string) : false

  return (
    <>
      {/* Overlay de fade out para logout */}
      {isLoggingOut && (
        <div
          className="fixed inset-0 bg-white dark:bg-slate-900 z-[9999] animate-in fade-in duration-300"
          style={{
            pointerEvents: 'auto',
          }}
        >
          <div className="flex items-center justify-center h-full">
            <div className="text-center animate-in fade-in slide-in-from-bottom-2">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">Cerrando sesión...</p>
            </div>
          </div>
        </div>
      )}
      {/* Ocultar header completo solo en móviles cuando cualquier panel está abierto */}
      {/* En desktop, siempre mostrar el header pero con z-index menor que los paneles */}
      <header className={`bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-[40] border-b border-gray-200 dark:border-slate-700 w-full ${isAnyPanelOpen ? 'hidden sm:block' : ''}`}>
      <div className="max-w-7xl mx-auto w-full">
        {/* Navegación principal */}
        <div className="flex items-center justify-between py-2.5 sm:py-3 md:py-4 px-3 sm:px-4 gap-2 w-full">
          {isDashboardPage ? (
            // Logo sin link cuando está en dashboard
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base flex-shrink-0">
                ZA
              </div>
              <h1 className="text-sm sm:text-base md:text-lg font-semibold truncate text-gray-900 dark:text-gray-100">Zona Azul</h1>
            </div>
          ) : (
            // Logo con link cuando está en páginas públicas
            <Link href="/" className="flex items-center gap-1.5 sm:gap-2 md:gap-3 hover:opacity-80 transition-opacity flex-shrink-0 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base flex-shrink-0">
                ZA
              </div>
              <h1 className="text-sm sm:text-base md:text-lg font-semibold truncate text-gray-900 dark:text-gray-100">Zona Azul</h1>
            </Link>
          )}

          {/* Navegación desktop - solo en páginas públicas */}
          {!isDashboardPage && (
            <nav className="hidden lg:flex space-x-4">
              <Link href="/" className="text-sm text-gray-700 dark:text-gray-300 hover:text-primary transition-colors">
                Inicio
              </Link>
              <Link href="/booking" className="text-sm text-gray-700 hover:text-primary transition-colors">
                Agendar cita
              </Link>
              <Link href="/menu" className="text-sm text-gray-700 hover:text-primary transition-colors">
                Carta
              </Link>
              <Link href="/login" className="text-sm text-gray-700 hover:text-primary transition-colors">
                Acceso
              </Link>
            </nav>
          )}

          {/* Navegación dashboard - Desktop */}
          {isDashboardPage && (
            <div className="hidden sm:flex items-center gap-3 md:gap-4 flex-shrink-0">
              {role !== 'invitado' && (
                <>
                  {/* Indicador de rol */}
                  <div className="flex items-center gap-2 text-xs flex-shrink-0">
                    <span className="text-gray-500 dark:text-gray-400">Rol:</span>
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium capitalize">
                      {role}
                    </span>
                  </div>
                  
                  {/* Botones de notificaciones y mensajes - los paneles se renderizan fuera del header */}
                  <NotificationButton />
                  <MessageButton />
                  
                  {/* Siempre mostrar ajustes y logout en desktop (incluso cuando algún panel está abierto) */}
                  <button
                    onClick={() => {
                      // Cerrar otros paneles al abrir ajustes
                      setIsNotificationsOpen(false)
                      setIsMessagesOpen(false)
                      // Abrir panel de ajustes (sin navegar)
                      setIsSettingsOpen(!isSettingsOpen)
                    }}
                    className={`relative p-2 text-gray-600 dark:text-gray-400 hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 rounded-lg transition-colors flex-shrink-0 ${isSettingsOpen ? 'text-primary bg-primary/10' : ''}`}
                    aria-label="Ajustes"
                    title="Ajustes"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {isLoggingOut ? 'Saliendo...' : 'Salir'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Mobile menu button */}
          {!isDashboardPage && (
            <div className="lg:hidden relative">
              <MobileMenu />
            </div>
          )}

          {/* Mobile - Dashboard pages */}
          {/* Ocultar botones del navbar en móvil cuando cualquier panel está abierto */}
          {isDashboardPage && (
            <div className={`sm:hidden flex items-center gap-1.5 flex-shrink-0 ml-auto ${isAnyPanelOpen ? 'hidden' : ''}`}>
              {role !== 'invitado' && (
                <>
                  {/* Indicador de rol en móvil */}
                  <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
                    <span className="text-gray-500 hidden xs:inline">Rol:</span>
                    <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium capitalize">
                      {role}
                    </span>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setIsMobileActionsOpen((prev) => !prev)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-primary/10 text-primary font-semibold text-sm transition-colors hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      aria-label="Abrir menú rápido"
                      aria-expanded={isMobileActionsOpen}
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      <span className="hidden xs:inline">Menú</span>
                    </button>

                    {isMobileActionsOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl py-2 z-20">
                        <div className="px-3 pb-2 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Acciones rápidas</div>
                        <div className="flex flex-col gap-1 px-2">
                          <div className="flex items-center justify-between gap-3 px-2 py-2 rounded-xl hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                            <div className="flex items-center gap-3">
                              <NotificationButton />
                              <span className="text-sm text-gray-900 dark:text-gray-100">Notificaciones</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-3 px-2 py-2 rounded-xl hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                            <div className="flex items-center gap-3">
                              <MessageButton />
                              <span className="text-sm text-gray-900 dark:text-gray-100">Mensajes</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setIsNotificationsOpen(false)
                              setIsMessagesOpen(false)
                              setIsSettingsOpen(!isSettingsOpen)
                              setIsMobileActionsOpen(false)
                            }}
                            className={`flex items-center gap-3 px-2 py-2 rounded-xl text-left hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors ${isSettingsOpen ? 'bg-primary/5 dark:bg-primary/10 text-primary' : 'text-gray-900 dark:text-gray-100'}`}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                              />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-sm font-medium">Ajustes</span>
                          </button>
                          <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="flex items-center gap-3 px-2 py-2 rounded-xl text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={isLoggingOut ? 'Saliendo...' : 'Salir'}
                            title={isLoggingOut ? 'Saliendo...' : 'Salir'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="text-sm font-medium">Salir</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      </header>
    </>
  )
}



