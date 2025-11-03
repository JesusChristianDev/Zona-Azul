"use client"

import React from 'react'
import ProtectedRoute from '../../components/auth/ProtectedRoute'
import DashboardSuscriptor from '../../components/dashboard/DashboardSuscriptor'

export default function SuscriptorPage() {
  return (
    <ProtectedRoute requiredRole="suscriptor" redirectTo="/invitado">
      <div className="min-h-screen bg-gray-50">
        <DashboardSuscriptor />
      </div>
    </ProtectedRoute>
  )
}

