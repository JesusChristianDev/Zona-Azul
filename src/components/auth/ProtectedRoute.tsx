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

export default function ProtectedRoute({ children, requiredRole, redirectTo = '/invitado' }: ProtectedRouteProps) {
  const { role, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated || role !== requiredRole) {
      router.push(redirectTo)
    }
  }, [role, isAuthenticated, requiredRole, redirectTo, router])

  if (!isAuthenticated || role !== requiredRole) {
    return <DashboardInvitado />
  }

  return <>{children}</>
}

