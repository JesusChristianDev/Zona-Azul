"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, UserRole } from '../../hooks/useAuth'
import DashboardInvitado from '../dashboard/DashboardInvitado'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole | null
  redirectTo?: string
}

export default function ProtectedRoute({ children, requiredRole, redirectTo = '/login' }: ProtectedRouteProps) {
  const { role, isAuthenticated, loading, userId } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Solo validar si no está cargando
    if (loading) {
      return
    }

    // Validar acceso solo si no está autenticado o no tiene el rol correcto
    if (!isAuthenticated || !userId) {
      const url = new URL(redirectTo, window.location.origin)
      url.searchParams.set('error', 'access_denied')
      if (requiredRole) {
        url.searchParams.set('required', requiredRole)
      }
      url.searchParams.set('redirect', window.location.pathname)
      router.push(url.toString())
      return
    }

    // Validar que el rol coincida solo si se especifica un rol requerido
    if (requiredRole && role !== requiredRole) {
      const url = new URL(redirectTo, window.location.origin)
      url.searchParams.set('error', 'access_denied')
      url.searchParams.set('required', requiredRole)
      url.searchParams.set('current', role || 'none')
      url.searchParams.set('redirect', window.location.pathname)
      router.push(url.toString())
      return
    }
  }, [role, isAuthenticated, requiredRole, redirectTo, router, loading, userId])

  // Solo mostrar loading si está cargando Y no está autenticado
  // Si ya está autenticado, no mostrar spinner (incluso si loading es true por recarga de datos)
  if (loading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Verificando acceso...</p>
          <p className="text-sm text-gray-500 mt-2">Por favor espera</p>
        </div>
      </div>
    )
  }

  // Si no está autenticado o no tiene el rol correcto (si se requiere), mostrar selector de roles
  if (!isAuthenticated || !userId || (requiredRole && role !== requiredRole)) {
    return <DashboardInvitado />
  }

  return <>{children}</>
}

