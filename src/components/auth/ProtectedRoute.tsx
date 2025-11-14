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
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean | null>(null)
  const [checkingSubscription, setCheckingSubscription] = useState(false)
  const [mustChangePassword, setMustChangePassword] = useState<boolean | null>(null)
  const [checkingPassword, setCheckingPassword] = useState(false)

  // Verificar si debe cambiar la contraseña (SOLO para suscriptores)
  useEffect(() => {
    const checkMustChangePassword = async () => {
      // Solo verificar para suscriptores
      if (role !== 'suscriptor' || !userId || !isAuthenticated) {
        setMustChangePassword(null) // No aplica para otros roles
        return
      }

      // Evitar verificar si ya estamos en la página de cambio de contraseña
      if (typeof window !== 'undefined' && window.location.pathname === '/change-password') {
        setMustChangePassword(false) // No verificar si ya estamos cambiando la contraseña
        return
      }

      // Verificar si acabamos de cambiar la contraseña en esta sesión (evitar bucle)
      if (typeof window !== 'undefined') {
        // Verificar sessionStorage para ver si ya cambió la contraseña en esta sesión
        const passwordChangedInSession = sessionStorage.getItem(`password_changed_${userId}`)
        if (passwordChangedInSession === 'true') {
          // Ya cambió la contraseña en esta sesión, no verificar de nuevo
          setMustChangePassword(false)
          return
        }

        // Verificar si hay un parámetro 't' en la URL (redirección después de cambiar contraseña)
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.has('t')) {
          // Acabamos de cambiar la contraseña, marcar en sessionStorage y no verificar de nuevo
          sessionStorage.setItem(`password_changed_${userId}`, 'true')
          setMustChangePassword(false)
          return
        }
      }

      setCheckingPassword(true)
      try {
        // Usar cache: 'no-store' para obtener datos frescos del servidor
        const userResponse = await fetch(`/api/users/${userId}`, {
          cache: 'no-store',
        })
        if (userResponse.ok) {
          const userData = await userResponse.json()
          const mustChange = userData.user?.must_change_password || false
          setMustChangePassword(mustChange)
          
          // Si must_change_password es false, marcar en sessionStorage para evitar verificaciones futuras
          if (!mustChange && typeof window !== 'undefined') {
            sessionStorage.setItem(`password_changed_${userId}`, 'true')
          }
        } else {
          setMustChangePassword(false)
        }
      } catch (error) {
        console.error('Error checking must_change_password:', error)
        setMustChangePassword(false)
      } finally {
        setCheckingPassword(false)
      }
    }

    if (isAuthenticated && userId && role === 'suscriptor') {
      checkMustChangePassword()
    }
  }, [userId, isAuthenticated, role])

  // Verificar suscripción activa para suscriptores
  useEffect(() => {
    const checkSubscription = async () => {
      // Solo verificar si es suscriptor
      if (role !== 'suscriptor' || !userId || !isAuthenticated) {
        setHasActiveSubscription(null) // No aplica para otros roles
        return
      }

      setCheckingSubscription(true)
      try {
        const response = await fetch(`/api/subscriptions?user_id=${userId}&status=active`)
        if (response.ok) {
          const subscriptions = await response.json()
          const activeSubscription = subscriptions.find((sub: any) => sub.status === 'active')
          setHasActiveSubscription(!!activeSubscription)
        } else {
          setHasActiveSubscription(false)
        }
      } catch (error) {
        console.error('Error checking subscription:', error)
        setHasActiveSubscription(false)
      } finally {
        setCheckingSubscription(false)
      }
    }

    if (isAuthenticated && userId && role === 'suscriptor') {
      checkSubscription()
    }
  }, [role, userId, isAuthenticated])

  useEffect(() => {
    // Solo validar si no está cargando
    if (loading || checkingSubscription || checkingPassword) {
      return
    }

    // Evitar bucle: no redirigir si ya estamos en la página de cambio de contraseña
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname
      if (currentPath === '/change-password') {
        return
      }
      
      // Verificar si el usuario ya cambió la contraseña en esta sesión
      const passwordChangedInSession = sessionStorage.getItem(`password_changed_${userId}`)
      if (passwordChangedInSession === 'true') {
        // Ya cambió la contraseña en esta sesión, no redirigir
        return
      }
      
      // Si acabamos de cambiar la contraseña (hay parámetro 't' en la URL), no verificar de nuevo
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.has('t')) {
        // Acabamos de cambiar la contraseña, marcar en sessionStorage y no redirigir
        if (userId) {
          sessionStorage.setItem(`password_changed_${userId}`, 'true')
        }
        return
      }
    }

    // Si debe cambiar la contraseña (SOLO para suscriptores), redirigir
    // Solo redirigir si realmente necesita cambiar la contraseña y no estamos ya en esa página
    // Y solo si no ha cambiado la contraseña en esta sesión
    if (role === 'suscriptor' && mustChangePassword === true && isAuthenticated && userId) {
      // Verificar una vez más que no estamos en la página de cambio de contraseña
      // Y que no haya cambiado la contraseña en esta sesión
      if (typeof window !== 'undefined') {
        const passwordChangedInSession = sessionStorage.getItem(`password_changed_${userId}`)
        if (passwordChangedInSession === 'true' || window.location.pathname === '/change-password') {
          return
        }
      }
      router.push('/change-password?required=true')
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

    // Para suscriptores, verificar que tengan suscripción activa
    if (role === 'suscriptor' && hasActiveSubscription === false) {
      // Redirigir a página de suscripción o mostrar mensaje
      router.push('/suscriptor/suscripcion')
      return
    }
  }, [role, isAuthenticated, requiredRole, redirectTo, router, loading, userId, hasActiveSubscription, checkingSubscription, mustChangePassword, checkingPassword])

  // Mostrar loading si está cargando autenticación o verificando suscripción/contraseña
  if ((loading && !isAuthenticated) || (role === 'suscriptor' && checkingSubscription) || (role === 'suscriptor' && checkingPassword)) {
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

  // Para suscriptores, verificar que tengan suscripción activa
  if (role === 'suscriptor' && hasActiveSubscription === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-200 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Suscripción Requerida</h2>
          <p className="text-gray-600 mb-4">
            Necesitas una suscripción activa para acceder a tu sesión. El administrador asignará tu suscripción después de una reunión presencial.
          </p>
          <button
            onClick={() => router.push('/suscriptor/suscripcion')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Ver Estado de Suscripción
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

