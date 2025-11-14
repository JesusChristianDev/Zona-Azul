"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function ChangePasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, userId } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const isRequired = searchParams.get('required') === 'true'

  // Si no está autenticado, redirigir a login
  useEffect(() => {
    if (!isAuthenticated && !userId) {
      router.push('/login?redirect=/change-password&required=true')
    }
  }, [isAuthenticated, userId, router])

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres'
    }
    if (!/[A-Z]/.test(password)) {
      return 'La contraseña debe contener al menos una letra mayúscula'
    }
    if (!/[a-z]/.test(password)) {
      return 'La contraseña debe contener al menos una letra minúscula'
    }
    if (!/[0-9]/.test(password)) {
      return 'La contraseña debe contener al menos un número'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validar que las contraseñas coincidan
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    // Validar formato de nueva contraseña
    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      setError(passwordError)
      return
    }

    // Si es obligatorio, la contraseña actual es requerida
    // Si es opcional (desde ajustes), también se requiere la contraseña actual por seguridad
    if (!currentPassword) {
      setError('Debes ingresar tu contraseña actual para continuar')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          required: isRequired, // Indica si es cambio obligatorio o opcional
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cambiar la contraseña')
      }

      if (data.success) {
        // Marcar en sessionStorage que el usuario cambió su contraseña en esta sesión
        // Esto evita que ProtectedRoute vuelva a verificar must_change_password
        if (typeof window !== 'undefined' && userId) {
          sessionStorage.setItem(`password_changed_${userId}`, 'true')
        }
        
        // Esperar un momento para asegurar que la actualización en la DB se complete
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Si es cambio obligatorio, forzar recarga completa para actualizar el estado
        if (isRequired) {
          // Forzar recarga completa con un timestamp para evitar cache
          // Esto asegura que el estado de must_change_password se actualice desde el servidor
          window.location.replace(`/${data.user?.role || 'suscriptor'}?t=${Date.now()}`)
        } else {
          // Si es cambio opcional desde ajustes, volver a ajustes
          router.push('/' + (data.user?.role || 'suscriptor') + '/ajustes')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al cambiar la contraseña')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-accent/5 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isRequired ? 'Cambio de Contraseña Requerido' : 'Cambiar Contraseña'}
          </h1>
          <p className="text-gray-600 text-sm">
            {isRequired
              ? 'Por seguridad, debes cambiar tu contraseña antes de continuar. Esta es la primera vez que inicias sesión.'
              : 'Actualiza tu contraseña para mantener tu cuenta segura. Puedes cambiarla cuando lo desees desde ajustes.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña Actual {isRequired && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value)
                  setError(null)
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all pr-12"
                placeholder="••••••••"
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showCurrentPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Nueva Contraseña
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  setError(null)
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all pr-12"
                placeholder="••••••••"
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showNewPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Mínimo 8 caracteres, incluyendo mayúsculas, minúsculas y números
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar Nueva Contraseña
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setError(null)
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all pr-12"
                placeholder="••••••••"
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg text-white font-semibold transition-all shadow-md ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Cambiando contraseña...
              </span>
            ) : (
              'Cambiar Contraseña'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

