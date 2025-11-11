"use client"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AvailableSlots from './AvailableSlots'
import { getNutritionists } from '../../lib/api'

interface BookingFormProps {
  nutricionistaId?: string
}

export default function BookingForm({ nutricionistaId: propNutricionistaId }: BookingFormProps = {}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nutricionistaId, setNutricionistaId] = useState<string | undefined>(propNutricionistaId)

  // Si no se proporciona un nutricionista, obtener el primero disponible
  useEffect(() => {
    if (!nutricionistaId) {
      const loadFirstNutricionista = async () => {
        try {
          const nutritionists = await getNutritionists()
          if (nutritionists && nutritionists.length > 0) {
            setNutricionistaId(nutritionists[0].id)
          }
        } catch (error) {
          console.error('Error loading nutritionists:', error)
        }
      }
      loadFirstNutricionista()
    }
  }, [nutricionistaId])

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

    const payload = { 
      name: name.trim(), 
      email: email.trim(), 
      phone: phone.trim(), 
      date_time: selectedSlot, // selectedSlot ahora es ISO string
      nutricionista_id: nutricionistaId || null
    }

    try {
      const res = await fetch('/api/appointments/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (res.ok) {
        const data = await res.json()
        // Guardar información de la cita en sessionStorage para mostrarla en la página de éxito
        if (data.appointment) {
          sessionStorage.setItem('lastBooking', JSON.stringify({
            id: data.appointment.id,
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            slot: new Date(selectedSlot!).toLocaleString('es-ES'),
            date_time: selectedSlot,
            created_at: data.appointment.created_at,
          }))
        }
        // Notificar que se creó una nueva cita
        window.dispatchEvent(new Event('zona_azul_appointments_updated'))
        showToast('Solicitud enviada ✔️')
        setTimeout(() => router.push('/booking/success'), 800)
        return
      }
      
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.error || `Error ${res.status}: ${res.statusText}`)
    } catch (err: any) {
      console.error('Error creating appointment:', err)
      setError(err.message || 'Error al guardar la solicitud. Por favor, inténtalo de nuevo.')
      setIsSubmitting(false)
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
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50/80 border border-red-200 text-red-700 rounded-xl flex items-start gap-3 backdrop-blur-sm">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Información personal */}
      <div className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2.5">
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
            className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900 placeholder-gray-400 bg-gray-50/50 hover:bg-white"
            placeholder="Ingresa tu nombre completo"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2.5">
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
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900 placeholder-gray-400 bg-gray-50/50 hover:bg-white"
              placeholder="ejemplo@email.com"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2.5">
              Teléfono <span className="text-gray-400 text-xs font-normal">(opcional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900 placeholder-gray-400 bg-gray-50/50 hover:bg-white"
              placeholder="+34 600 000 000"
            />
          </div>
        </div>
      </div>

      {/* Selección de horario */}
      <div className="pt-8 border-t border-gray-100">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Selecciona un horario disponible</h3>
          <p className="text-sm text-gray-600">Elige el momento que mejor se adapte a tu agenda</p>
        </div>
        <AvailableSlots 
          onSelect={(id) => {
            setSelectedSlot(id)
            setError(null)
          }} 
          selectedSlot={selectedSlot}
          nutricionistaId={nutricionistaId}
        />
      </div>

      {/* Botón de envío */}
      <div className="pt-8 border-t border-gray-100">
        <button
          type="submit"
          disabled={!selectedSlot || isSubmitting}
          className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-primary via-primary/95 to-accent text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-primary/90 hover:via-primary/85 hover:to-accent/90 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-base sm:text-lg flex items-center justify-center gap-2 min-w-[220px]"
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
        <p className="mt-4 text-xs text-gray-500 leading-relaxed">
          Al enviar, aceptas que nos pongamos en contacto contigo para confirmar tu cita.
        </p>
      </div>
    </form>
  )
}
