"use client"
import React, { useState } from 'react'

export default function ActivatePage() {
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Demo behaviour: store a flag in localStorage to simulate activation
    localStorage.setItem(`activation_${token}`, JSON.stringify({ activated_at: new Date().toISOString() }))
    setDone(true)
  }

  return (
    <div className="card max-w-md">
      <h2 className="text-xl font-semibold">Activar cuenta</h2>
      {!done ? (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <div>
            <label className="block text-sm">Token de activación</label>
            <input value={token} onChange={(e) => setToken(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm">Contraseña</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full p-2 border rounded" />
          </div>
          <div>
            <button className="px-4 py-2 bg-green-600 text-white rounded" type="submit">Activar</button>
          </div>
        </form>
      ) : (
        <div className="mt-3">
          <p className="muted">Cuenta activada (demo). Puedes hacer login en la app real.</p>
          <a href="/" className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white rounded">Ir al inicio</a>
        </div>
      )}
    </div>
  )
}
