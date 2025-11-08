"use client"
import { useState } from 'react'
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
      setError('Debes seleccionar un horario disponible')
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
    toast.style.padding = '12px 16px'
    toast.style.borderRadius = '8px'
    toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
    toast.style.zIndex = '9999'
    toast.style.fontSize = '14px'
    toast.style.fontWeight = '500'
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 2000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg flex items-start gap-3">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Información personal */}
      <div className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
            Nombre completo <span className="text-red-500">*</span>
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
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
            placeholder="Ingresa tu nombre completo"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
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
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
              placeholder="ejemplo@email.com"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2">
              Teléfono <span className="text-gray-400 text-xs font-normal">(opcional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
              placeholder="+34 600 000 000"
            />
          </div>
        </div>
      </div>

      {/* Selección de horario */}
      <div className="pt-6 border-t border-gray-200">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Selecciona un horario disponible</h3>
          <p className="text-sm text-gray-600">Elige el momento que mejor se adapte a tu agenda</p>
        </div>
        <AvailableSlots 
          onSelect={(id) => {
            setSelectedSlot(id)
            setError(null)
          }} 
          selectedSlot={selectedSlot} 
        />
      </div>

      {/* Botón de envío */}
      <div className="pt-6 border-t border-gray-200">
        <button
          type="submit"
          disabled={!selectedSlot || isSubmitting}
          className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-primary/90 hover:to-accent/90 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-base sm:text-lg flex items-center justify-center gap-2 min-w-[200px]"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Enviando...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Enviar solicitud</span>
            </>
          )}
        </button>
        <p className="mt-3 text-xs text-gray-500">
          Al enviar, aceptas que nos pongamos en contacto contigo para confirmar tu cita.
        </p>
      </div>
    </form>
  )
}
