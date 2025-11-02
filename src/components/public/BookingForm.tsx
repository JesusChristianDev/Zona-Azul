"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import AvailableSlots from './AvailableSlots'

export default function BookingForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function validateForm(): boolean {
    if (!name.trim()) {
      setError('El nombre es requerido')
      return false
    }
    if (!email.trim()) {
      setError('El email es requerido')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('El email no es válido')
      return false
    }
    if (!selectedSlot) {
      setError('Debes seleccionar un slot disponible')
      return false
    }
    setError(null)
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    const payload = { name: name.trim(), email: email.trim(), phone: phone.trim(), slot: selectedSlot }

    try {
      const res = await fetch('/api/appointments/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (res.ok) {
        showToast('Solicitud enviada ✔️')
        setTimeout(() => router.push('/booking/success'), 800)
        return
      }
      
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.error || `Error ${res.status}: ${res.statusText}`)
    } catch (err: any) {
      // Fallback a localStorage
      try {
        const existing = JSON.parse(localStorage.getItem('demo_appointments') || '[]')
        existing.push({ id: `m-${Date.now()}`, ...payload, created_at: new Date().toISOString() })
        localStorage.setItem('demo_appointments', JSON.stringify(existing))
        showToast('Solicitud guardada localmente ✔️')
        setTimeout(() => router.push('/booking/success'), 900)
      } catch (storageErr) {
        console.error('Error saving to localStorage:', storageErr)
        setError('Error al guardar la solicitud. Por favor, inténtalo de nuevo.')
        setIsSubmitting(false)
      }
    }
  }

  function showToast(text: string) {
    const toast = document.createElement('div')
    toast.textContent = text
    toast.style.position = 'fixed'
    toast.style.right = '20px'
    toast.style.top = '20px'
    toast.style.background = '#059669'
    toast.style.color = 'white'
    toast.style.padding = '10px 14px'
    toast.style.borderRadius = '8px'
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 1200)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <h2 className="text-xl sm:text-2xl font-semibold">Solicitar cita con nutricionista</h2>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Nombre <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          required
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          className="w-full mt-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Ingresa tu nombre completo"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            required
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(null)
            }}
            className="w-full mt-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="ejemplo@email.com"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1">
            Teléfono
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full mt-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Opcional"
          />
        </div>
      </div>

      <AvailableSlots onSelect={(id) => {
        setSelectedSlot(id)
        setError(null)
      }} selectedSlot={selectedSlot} />

      <div>
        <button
          type="submit"
          disabled={!selectedSlot || isSubmitting}
          className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors text-sm sm:text-base font-medium"
        >
          {isSubmitting ? 'Enviando...' : 'Enviar solicitud'}
        </button>
      </div>
    </form>
  )
}
