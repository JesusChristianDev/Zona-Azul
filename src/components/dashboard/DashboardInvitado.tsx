"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../hooks/useAuth'

export default function DashboardInvitado() {
  const router = useRouter()
  const { isAuthenticated, role } = useAuth()

  // Si ya está autenticado, redirigir a su dashboard
  useEffect(() => {
    if (isAuthenticated && role !== 'invitado') {
      router.push(`/${role}`)
    }
  }, [isAuthenticated, role, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-accent/5 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xl">
            ZA
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Bienvenido a Zona Azul</h1>
        <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base mb-8">
          Para acceder a los dashboards, necesitas iniciar sesión con tus credenciales.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center justify-center w-full px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-lg hover:from-primary/90 hover:to-accent/90 transition-all shadow-md"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          Iniciar Sesión
        </Link>

        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            ¿No tienes cuenta? Contacta con el administrador para obtener tus credenciales.
          </p>
          <Link href="/" className="text-sm text-primary hover:underline">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}

