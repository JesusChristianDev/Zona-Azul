"use client"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AvailableSlots from './AvailableSlots'
import { getNutritionists } from '../../lib/api'

interface BookingFormProps {
  nutricionistaId?: string
}

// Prefijos telefónicos internacionales (países más importantes)
const PHONE_PREFIXES = [
  // Europa
  { code: '+34', country: 'España', flag: '🇪🇸' },
  { code: '+33', country: 'Francia', flag: '🇫🇷' },
  { code: '+49', country: 'Alemania', flag: '🇩🇪' },
  { code: '+39', country: 'Italia', flag: '🇮🇹' },
  { code: '+44', country: 'Reino Unido', flag: '🇬🇧' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+31', country: 'Países Bajos', flag: '🇳🇱' },
  { code: '+32', country: 'Bélgica', flag: '🇧🇪' },
  { code: '+41', country: 'Suiza', flag: '🇨🇭' },
  { code: '+43', country: 'Austria', flag: '🇦🇹' },
  { code: '+46', country: 'Suecia', flag: '🇸🇪' },
  { code: '+47', country: 'Noruega', flag: '🇳🇴' },
  { code: '+45', country: 'Dinamarca', flag: '🇩🇰' },
  { code: '+358', country: 'Finlandia', flag: '🇫🇮' },
  { code: '+353', country: 'Irlanda', flag: '🇮🇪' },
  { code: '+48', country: 'Polonia', flag: '🇵🇱' },
  { code: '+420', country: 'República Checa', flag: '🇨🇿' },
  { code: '+36', country: 'Hungría', flag: '🇭🇺' },
  { code: '+40', country: 'Rumania', flag: '🇷🇴' },
  { code: '+30', country: 'Grecia', flag: '🇬🇷' },
  { code: '+7', country: 'Rusia', flag: '🇷🇺' },
  { code: '+90', country: 'Turquía', flag: '🇹🇷' },
  
  // América del Norte
  { code: '+1', country: 'EE.UU./Canadá', flag: '🇺🇸' },
  { code: '+52', country: 'México', flag: '🇲🇽' },
  
  // América Central y Caribe
  { code: '+506', country: 'Costa Rica', flag: '🇨🇷' },
  { code: '+507', country: 'Panamá', flag: '🇵🇦' },
  { code: '+502', country: 'Guatemala', flag: '🇬🇹' },
  { code: '+504', country: 'Honduras', flag: '🇭🇳' },
  { code: '+505', country: 'Nicaragua', flag: '🇳🇮' },
  { code: '+503', country: 'El Salvador', flag: '🇸🇻' },
  { code: '+1', country: 'República Dominicana', flag: '🇩🇴' },
  { code: '+53', country: 'Cuba', flag: '🇨🇺' },
  { code: '+1', country: 'Puerto Rico', flag: '🇵🇷' },
  
  // América del Sur
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+55', country: 'Brasil', flag: '🇧🇷' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+51', country: 'Perú', flag: '🇵🇪' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
  { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
  { code: '+595', country: 'Paraguay', flag: '🇵🇾' },
  { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
  { code: '+591', country: 'Bolivia', flag: '🇧🇴' },
  
  // Asia
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+81', country: 'Japón', flag: '🇯🇵' },
  { code: '+82', country: 'Corea del Sur', flag: '🇰🇷' },
  { code: '+65', country: 'Singapur', flag: '🇸🇬' },
  { code: '+60', country: 'Malasia', flag: '🇲🇾' },
  { code: '+66', country: 'Tailandia', flag: '🇹🇭' },
  { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
  { code: '+63', country: 'Filipinas', flag: '🇵🇭' },
  { code: '+84', country: 'Vietnam', flag: '🇻🇳' },
  { code: '+971', country: 'Emiratos Árabes', flag: '🇦🇪' },
  { code: '+966', country: 'Arabia Saudí', flag: '🇸🇦' },
  { code: '+972', country: 'Israel', flag: '🇮🇱' },
  { code: '+974', country: 'Catar', flag: '🇶🇦' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+64', country: 'Nueva Zelanda', flag: '🇳🇿' },
  
  // África
  { code: '+27', country: 'Sudáfrica', flag: '🇿🇦' },
  { code: '+20', country: 'Egipto', flag: '🇪🇬' },
  { code: '+212', country: 'Marruecos', flag: '🇲🇦' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+254', country: 'Kenia', flag: '🇰🇪' },
]

export default function BookingForm({ nutricionistaId: propNutricionistaId }: BookingFormProps = {}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [emailExists, setEmailExists] = useState<boolean | null>(null)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [phonePrefix, setPhonePrefix] = useState('+34')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [isPhoneDropdownOpen, setIsPhoneDropdownOpen] = useState(false)
  
  // Limitar notas a 500 caracteres
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= 500) {
      setNotes(value)
    }
  }

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.phone-dropdown-container')) {
        setIsPhoneDropdownOpen(false)
      }
    }

    if (isPhoneDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isPhoneDropdownOpen])

  const selectedPrefix = PHONE_PREFIXES.find(p => p.code === phonePrefix) || PHONE_PREFIXES[0]
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

  // Validar email cuando cambie
  useEffect(() => {
    const checkEmail = async () => {
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setEmailExists(null)
        return
      }

      setIsCheckingEmail(true)
      try {
        const response = await fetch(`/api/users/check-email?email=${encodeURIComponent(email.trim())}`)
        if (response.ok) {
          const data = await response.json()
          setEmailExists(data.exists)
        } else {
          setEmailExists(null)
        }
      } catch (error) {
        console.error('Error checking email:', error)
        setEmailExists(null)
      } finally {
        setIsCheckingEmail(false)
      }
    }

    // Debounce: esperar 500ms después de que el usuario deje de escribir
    const timeoutId = setTimeout(checkEmail, 500)
    return () => clearTimeout(timeoutId)
  }, [email])

  async function validateForm(): Promise<boolean> {
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
    
    // Verificar si el email existe
    if (isCheckingEmail) {
      setError('Verificando email...')
      return false
    }
    
    if (emailExists === false) {
      setError('El dominio del email no existe o no es válido. Por favor, verifica que el email sea correcto.')
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
    
    if (!(await validateForm())) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    // Construir teléfono completo con prefijo
    const fullPhone = phoneNumber.trim() 
      ? `${phonePrefix} ${phoneNumber.trim()}` 
      : ''

    const payload = { 
      name: name.trim(), 
      email: email.trim(), 
      phone: fullPhone,
      notes: notes.trim() || null,
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
          // Generar slot formateado de manera consistente
          let slot = ''
          if (selectedSlot) {
            try {
              const date = new Date(selectedSlot)
              if (!isNaN(date.getTime())) {
                const weekday = date.toLocaleDateString('es-ES', { weekday: 'long' })
                const day = date.getDate()
                const month = date.toLocaleDateString('es-ES', { month: 'long' })
                const year = date.getFullYear()
                const time = date.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)
                const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1)
                slot = `${capitalizedWeekday}, ${day} de ${capitalizedMonth} de ${year} a las ${time}`
              }
            } catch (error) {
              console.error('Error formatting slot:', error)
            }
          }
          
          sessionStorage.setItem('lastBooking', JSON.stringify({
            id: data.appointment.id,
            name: name.trim(),
            email: email.trim(),
            phone: fullPhone,
            slot,
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
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
      {error && (
        <div className="p-4 bg-red-50/80 border border-red-200 text-red-700 rounded-xl flex items-start gap-3 backdrop-blur-sm">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Información personal */}
      <div className="space-y-6 pb-6 border-b border-gray-200">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="w-full">
            <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2.5">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="email"
                required
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(null)
                }}
                className={`w-full px-4 py-3.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900 placeholder-gray-400 bg-gray-50/50 hover:bg-white ${
                  emailExists === false && email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                    ? 'border-red-300 bg-red-50/50'
                    : emailExists === true
                    ? 'border-green-300 bg-green-50/50'
                    : 'border-gray-200'
                }`}
                placeholder="ejemplo@email.com"
              />
              {isCheckingEmail && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
              {!isCheckingEmail && emailExists === true && email.trim() && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {!isCheckingEmail && emailExists === false && email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
            </div>
            {emailExists === false && email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                El dominio del email no existe o no es válido
              </p>
            )}
            {emailExists === true && email.trim() && (
              <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Email válido y dominio verificado
              </p>
            )}
          </div>
          <div className="w-full">
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2.5">
              Teléfono <span className="text-gray-400 text-xs font-normal">(opcional)</span>
            </label>
            <div className="phone-dropdown-container relative w-full" style={{ zIndex: 50 }}>
              <div className="relative flex items-center border border-gray-200 rounded-xl bg-gray-50/50 hover:bg-white focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                {/* Prefijo selector integrado */}
                <button
                  type="button"
                  onClick={() => setIsPhoneDropdownOpen(!isPhoneDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-3.5 border-r border-gray-200 bg-transparent hover:bg-gray-50 transition-colors flex-shrink-0"
                >
                  <span className="text-base sm:text-lg">{selectedPrefix.flag}</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-700">{selectedPrefix.code}</span>
                  <svg 
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 transition-transform flex-shrink-0 ${isPhoneDropdownOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Input unificado */}
                <input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => {
                    // Solo permitir números y espacios
                    const value = e.target.value.replace(/[^\d\s]/g, '')
                    setPhoneNumber(value)
                  }}
                  className="flex-1 px-3 sm:px-4 py-3.5 border-0 bg-transparent focus:outline-none text-gray-900 placeholder-gray-400 text-sm sm:text-base"
                  placeholder="600 000 000"
                />
              </div>
              
              {/* Dropdown */}
              {isPhoneDropdownOpen && (
                <>
                  {/* Overlay para móviles */}
                  <div 
                    className="fixed inset-0 bg-black/20 z-40 sm:hidden"
                    onClick={() => setIsPhoneDropdownOpen(false)}
                  />
                  {/* Dropdown */}
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-[60vh] sm:max-h-[300px] overflow-y-auto z-50 w-full sm:w-auto sm:min-w-[320px]">
                    <div className="py-1">
                      {PHONE_PREFIXES.map((prefix, index) => (
                        <button
                          key={`${prefix.code}-${prefix.country}-${index}`}
                          type="button"
                          onClick={() => {
                            setPhonePrefix(prefix.code)
                            setIsPhoneDropdownOpen(false)
                          }}
                          className={`w-full px-3 sm:px-4 py-2.5 sm:py-2.5 text-left text-xs sm:text-sm hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-2.5 ${
                            phonePrefix === prefix.code ? 'bg-primary/5 text-primary font-medium' : 'text-gray-900'
                          }`}
                        >
                          <span className="flex-shrink-0 text-base sm:text-lg">{prefix.flag}</span>
                          <span className="font-medium text-gray-900">{prefix.code}</span>
                          <span className="text-gray-600 truncate flex-1">- {prefix.country}</span>
                          {phonePrefix === prefix.code && (
                            <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            {phoneNumber && (
              <p className="mt-1.5 text-xs text-gray-500">
                {phonePrefix} {phoneNumber}
              </p>
            )}
          </div>
        </div>
        
        <div>
          <label htmlFor="notes" className="block text-sm font-semibold text-gray-900 mb-2.5">
            Notas <span className="text-gray-400 text-xs font-normal">(opcional)</span>
          </label>
            <textarea
              id="notes"
              value={notes}
              onChange={handleNotesChange}
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900 placeholder-gray-400 bg-gray-50/50 hover:bg-white resize-none"
              placeholder="Explica brevemente el motivo de tu cita o cualquier información relevante que quieras compartir..."
            />
          <p className="mt-1.5 text-xs text-gray-500">
            {notes.length}/500 caracteres
          </p>
        </div>
      </div>

      {/* Selección de horario */}
      <div className="pt-6 pb-6 border-t border-gray-200">
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
      <div className="pt-6 border-t border-gray-200">
        <button
          type="submit"
          disabled={!selectedSlot || isSubmitting}
          className="w-full px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-primary via-primary/95 to-accent text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-primary/90 hover:via-primary/85 hover:to-accent/90 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base lg:text-lg flex items-center justify-center gap-2"
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
