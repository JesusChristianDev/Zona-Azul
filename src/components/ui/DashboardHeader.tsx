"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'
import MobileMenu from '../MobileMenu'
import MessagesWidget from '../messaging/MessagesWidget'

export default function DashboardHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { role, logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

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
  const isDashboardPage = sectionKey ? dashboardRoots.includes(sectionKey) : false

  return (
    <>
      {/* Overlay de fade out para logout */}
      {isLoggingOut && (
        <div
          className="fixed inset-0 bg-white z-[9999] animate-in fade-in duration-300"
          style={{
            pointerEvents: 'auto',
          }}
        >
          <div className="flex items-center justify-center h-full">
            <div className="text-center animate-in fade-in slide-in-from-bottom-2">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Cerrando sesión...</p>
            </div>
          </div>
        </div>
      )}
      <header className="bg-white shadow-sm sticky top-0 z-50 border-b">
      <div className="max-w-7xl mx-auto">
        {/* Navegación principal */}
        <div className="flex items-center justify-between py-3 px-4 sm:py-4">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base">
              ZA
            </div>
            <h1 className="text-base sm:text-lg font-semibold">Zona Azul</h1>
          </Link>

          {/* Navegación desktop - solo en páginas públicas */}
          {!isDashboardPage && (
            <nav className="hidden sm:flex space-x-4">
              <Link href="/" className="text-sm text-gray-700 hover:text-primary transition-colors">
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

          {/* Navegación dashboard */}
          {isDashboardPage && (
            <div className="hidden sm:flex items-center gap-4">
              {role !== 'invitado' && (
                <>
                  <MessagesWidget />
                  <Link
                    href={`/${role}/ajustes`}
                    className="relative p-2 text-gray-600 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                    aria-label="Ajustes"
                    title="Ajustes"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="px-3 py-1.5 text-sm text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoggingOut ? 'Saliendo...' : 'Salir'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Mobile menu button */}
          {!isDashboardPage && (
            <div className="sm:hidden relative">
              <MobileMenu />
            </div>
          )}

          {/* Mobile - Dashboard pages */}
          {isDashboardPage && (
            <div className="sm:hidden flex items-center gap-2">
              {role !== 'invitado' && (
                <>
                  <MessagesWidget />
                  <Link
                    href={`/${role}/ajustes`}
                    className="p-2 text-gray-700 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                    aria-label="Ajustes"
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
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="p-2 text-gray-700 hover:text-red-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={isLoggingOut ? 'Saliendo...' : 'Salir'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Breadcrumb integrado - solo en dashboards */}
        {isDashboardPage && breadcrumbTitle && (
          <div className="border-t bg-gray-50/50 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                <Link href="/" className="hover:text-primary transition-colors">
                  Inicio
                </Link>
                <span>/</span>
                <span className="text-gray-900 font-medium">{breadcrumbTitle}</span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs">
                <span className="text-gray-500">Rol:</span>
                <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium capitalize">
                  {role}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
    </>
  )
}

