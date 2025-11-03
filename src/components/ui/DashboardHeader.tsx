"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'
import MobileMenu from '../MobileMenu'

export default function DashboardHeader() {
  const pathname = usePathname()
  const { role, logout } = useAuth()

  // Determinar el título del breadcrumb según la ruta
  const getBreadcrumbTitle = () => {
    if (pathname === '/suscriptor') return 'Dashboard Suscriptor'
    if (pathname === '/admin') return 'Panel Administración'
    if (pathname === '/invitado') return 'Selección de Rol'
    return null
  }

  const breadcrumbTitle = getBreadcrumbTitle()
  const isDashboardPage = pathname === '/suscriptor' || pathname === '/admin' || pathname === '/invitado'

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50 border-b">
      <div className="max-w-7xl mx-auto">
        {/* Navegación principal */}
        <div className="flex items-center justify-between py-3 px-4 sm:py-4">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base">
              HB
            </div>
            <h1 className="text-base sm:text-lg font-semibold">HealthyBox</h1>
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
            </nav>
          )}

          {/* Navegación dashboard */}
          {isDashboardPage && (
            <div className="hidden sm:flex items-center gap-4">
              <Link href="/" className="text-sm text-gray-600 hover:text-primary transition-colors">
                Volver al inicio
              </Link>
              {role !== 'invitado' && (
                <button
                  onClick={logout}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Salir
                </button>
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
                <button
                  onClick={logout}
                  className="p-2 text-gray-700 hover:text-red-600 rounded-lg transition-colors"
                  aria-label="Salir"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
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
  )
}

