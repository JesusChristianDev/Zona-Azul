"use client"
import { useState } from 'react'
import Link from 'next/link'

export default function ActivatePage() {
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // TODO: Implementar activación real usando API
    // Por ahora, solo marcamos como completado
    // En producción, esto debería llamar a una API que valide el token y active la cuenta
    setDone(true)
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
            />
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
            />
          </div>
          <div>
            <button
              className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base font-medium"
              type="submit"
            >
              Activar
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
          <p className="muted text-sm sm:text-base">Cuenta activada (demo). Puedes hacer login en la app real.</p>
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
