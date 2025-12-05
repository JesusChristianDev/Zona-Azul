"use client"
import { useState } from 'react'
import Link from 'next/link'

export default function ActivatePage() {
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const result = await response.json()
      if (!response.ok) {
        setError(result?.error || 'No se pudo activar la cuenta. Intenta de nuevo.')
        setDone(false)
        return
      }

      setDone(true)
    } catch (err: any) {
      console.error('Error al activar cuenta:', err)
      setError('Ocurrió un error inesperado. Intenta nuevamente más tarde.')
      setDone(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card max-w-md mx-auto p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Activar cuenta</h2>
      {!done ? (
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label htmlFor="token" className="block text-sm font-medium mb-1">
              Token de activación
            </label>
            <input
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full p-2 sm:p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
              placeholder="Ingresa tu token"
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              Puedes pegar el token del correo o usar el correo codificado en base64.
            </p>
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Contraseña
            </label>
            <input
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="w-full p-2 sm:p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
              placeholder="Crea tu contraseña"
              minLength={8}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </p>
          )}
          <div>
            <button
              className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base font-medium"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Activando...' : 'Activar'}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-3 space-y-4 text-center sm:text-left">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto sm:mx-0 mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="muted text-sm sm:text-base">Cuenta activada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.</p>
          <Link
            href="/"
            className="inline-block w-full sm:w-auto text-center mt-3 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium"
          >
            Ir al inicio
          </Link>
        </div>
      )}
    </div>
  )
}
