"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, UserRole } from '../../hooks/useAuth'
import DashboardInvitado from '../dashboard/DashboardInvitado'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole: UserRole
  redirectTo?: string
}

export default function ProtectedRoute({ children, requiredRole, redirectTo = '/login' }: ProtectedRouteProps) {
  const { role, isAuthenticated, loading, userId } = useAuth()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Esperar a que termine de cargar la autenticación
    if (loading) {
      setIsChecking(true)
      return
    }

    setIsChecking(false)

    // Validar acceso solo después de que termine de cargar
    if (!isAuthenticated || !userId) {
      const url = new URL(redirectTo, window.location.origin)
      url.searchParams.set('error', 'access_denied')
      url.searchParams.set('required', requiredRole)
      url.searchParams.set('redirect', window.location.pathname)
      router.push(url.toString())
      return
    }

    // Validar que el rol coincida
    if (role !== requiredRole) {
      const url = new URL(redirectTo, window.location.origin)
      url.searchParams.set('error', 'access_denied')
      url.searchParams.set('required', requiredRole)
      url.searchParams.set('current', role || 'none')
      url.searchParams.set('redirect', window.location.pathname)
      router.push(url.toString())
      return
    }
  }, [role, isAuthenticated, requiredRole, redirectTo, router, loading, userId])

  // Mostrar loading mientras se verifica la sesión
  if (loading || isChecking) {
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

  // Si no está autenticado o no tiene el rol correcto, mostrar selector de roles
  if (!isAuthenticated || !userId || role !== requiredRole) {
    return <DashboardInvitado />
  }

  return <>{children}</>
}

