"use client"

import React from 'react'
import ProtectedRoute from '../../components/auth/ProtectedRoute'
import DashboardAdmin from '../../components/dashboard/DashboardAdmin'

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="admin" redirectTo="/invitado">
      <div className="min-h-screen bg-gray-50">
        <DashboardAdmin />
      </div>
    </ProtectedRoute>
  )
}

