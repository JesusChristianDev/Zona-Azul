"use client"

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'

export default function DashboardInvitado() {
  const { loginAs } = useAuth()
  const router = useRouter()

  const handleLogin = (role: 'suscriptor' | 'admin', userId: string) => {
    loginAs(role, userId)
    // Redirigir al dashboard correspondiente
    setTimeout(() => {
      router.push(`/${role}`)
    }, 100)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Bienvenido a HealthyBox</h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Selecciona un rol para acceder al dashboard correspondiente
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleLogin('suscriptor', 'user-1')}
            className="w-full p-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-left flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Acceder como Suscriptor</span>
            </div>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => handleLogin('admin', 'admin-1')}
            className="w-full p-4 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-left flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span>Acceder como Admin/Nutricionista</span>
            </div>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <Link
            href="/"
            className="block w-full p-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-primary hover:text-primary transition-colors font-medium text-center"
          >
            Volver al inicio
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-xs text-gray-500">
            Esta es una versión demo. En producción, estos roles se asignarán automáticamente según el login.
          </p>
        </div>
      </div>
    </div>
  )
}

