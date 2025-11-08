"use client"

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, UserRole } from '../../hooks/useAuth'
import DashboardInvitado from '../dashboard/DashboardInvitado'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole: UserRole
  redirectTo?: string
}

export default function ProtectedRoute({ children, requiredRole, redirectTo = '/login' }: ProtectedRouteProps) {
  const { role, isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Solo redirigir si ya terminó de cargar y no tiene acceso
    if (!loading && (!isAuthenticated || role !== requiredRole)) {
      const url = new URL(redirectTo, window.location.origin)
      url.searchParams.set('error', 'access_denied')
      url.searchParams.set('required', requiredRole)
      router.push(url.toString())
    }
  }, [role, isAuthenticated, requiredRole, redirectTo, router, loading])

  // Mostrar loading mientras se verifica la sesión
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    )
  }

  // Si no está autenticado o no tiene el rol correcto, mostrar selector de roles
  if (!isAuthenticated || role !== requiredRole) {
    return <DashboardInvitado />
  }

  return <>{children}</>
}

