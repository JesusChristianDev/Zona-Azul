"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatAppointmentDateTime } from '../../../lib/dateFormatters'

interface Appointment {
  id: string
  name: string
  email: string
  phone?: string
  slot: string
  date_time?: string
  created_at?: string
}

export default function BookingSuccess() {
  const [last, setLast] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Funciones para generar URLs de calendarios web
  const getCalendarUrls = () => {
    if (!last || !last.date_time) {
      return null
    }

    const startDate = new Date(last.date_time)
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000) // 30 minutos después

    // Formatear fechas para URLs
    const formatDateForURL = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    const formatDateForGoogle = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0].replace('Z', '')
    }

    const title = encodeURIComponent('Consulta Nutricional - Zona Azul')
    const description = encodeURIComponent(`Consulta nutricional personalizada con ${last.name}.\n\nZona Azul - Bienestar Integral`)
    const location = encodeURIComponent('Zona Azul')
    const startDateFormatted = formatDateForURL(startDate)
    const endDateFormatted = formatDateForURL(endDate)
    const startDateGoogle = formatDateForGoogle(startDate)
    const endDateGoogle = formatDateForGoogle(endDate)

    return {
      google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateGoogle}/${endDateGoogle}&details=${description}&location=${location}`,
      outlook: `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${description}&location=${location}`,
      yahoo: `https://calendar.yahoo.com/?v=60&view=d&type=20&title=${title}&st=${startDateFormatted}&dur=0030&desc=${description}&in_loc=${location}`,
      apple: `data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:${startDateFormatted}%0ADTEND:${endDateFormatted}%0ASUMMARY:${title}%0ADESCRIPTION:${description}%0ALOCATION:${location}%0AEND:VEVENT%0AEND:VCALENDAR`
    }
  }

  const calendarUrls = getCalendarUrls()

  useEffect(() => {
    // Marcar como montado para evitar errores de hidratación
    setMounted(true)
    
    const loadLastAppointment = () => {
      try {
        // Intentar leer de sessionStorage (para usuarios que acaban de crear una cita)
        const storedBooking = sessionStorage.getItem('lastBooking')
        if (storedBooking) {
          const bookingData = JSON.parse(storedBooking)
          setLast({
            id: bookingData.id,
            name: bookingData.name || 'Usuario',
            email: bookingData.email || '',
            phone: bookingData.phone,
            slot: bookingData.slot || new Date(bookingData.date_time).toLocaleString('es-ES'),
            date_time: bookingData.date_time,
            created_at: bookingData.created_at,
          })
          // Limpiar sessionStorage después de leer
          sessionStorage.removeItem('lastBooking')
          setLoading(false)
          return
        }

        // Si no hay datos en sessionStorage, simplemente no mostrar nada
        // (La página de éxito solo debería mostrar datos si el usuario acaba de crear una cita)
        setLoading(false)
      } catch (error) {
        console.error('Error reading appointment:', error)
        setLoading(false)
      }
    }
    
    loadLastAppointment()
  }, [])

  // Evitar errores de hidratación: solo renderizar contenido dinámico después del montaje
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600 text-sm sm:text-base">Cargando información...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-8 md:p-10 border border-gray-100/50">
          {/* Icono de éxito */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-green-100 to-green-50 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">
              ¡Solicitud confirmada!
            </h1>
            <p className="text-base sm:text-lg text-gray-600">
              Hemos recibido tu solicitud correctamente
            </p>
          </div>

          {last ? (
            <div className="space-y-4 sm:space-y-6">
              {/* Mensaje personalizado */}
              <div className="bg-gradient-to-br from-primary/5 via-accent/5 to-highlight/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-primary/10">
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                  Gracias <span className="font-semibold text-gray-900">{last.name}</span>, hemos registrado tu solicitud de consulta nutricional. 
                  Nuestro equipo revisará tu información y te contactará pronto para confirmar los detalles.
                </p>
              </div>

              {/* Información de la cita */}
              <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200/50">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1 sm:mb-2">
                      Su cita será
                    </p>
                    <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
                      {formatAppointmentDateTime(last.slot, last.date_time)}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 mt-2">
                      Te enviaremos un recordatorio antes de la consulta
                    </p>
                  </div>
                </div>
                {/* Botones para agregar al calendario */}
                {last.date_time && calendarUrls && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-3 text-center sm:text-left">
                      Agregar a mi calendario
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                      <a
                        href={calendarUrls.google}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex flex-col items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-gray-200 hover:border-primary/50 hover:bg-primary/5 rounded-lg transition-all group"
                        title="Agregar a Google Calendar"
                      >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 group-hover:text-primary transition-colors" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453l2.814-2.814C15.491 1.85 13.975 1.179 12.545 1.179c-5.384 0-9.727 4.353-9.727 9.727s4.343 9.727 9.727 9.727c4.596 0 8.565-3.21 9.425-7.561h-9.425z"/>
                        </svg>
                        <span className="text-xs font-medium text-gray-700 group-hover:text-primary transition-colors">Google</span>
                      </a>
                      <a
                        href={calendarUrls.outlook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex flex-col items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-gray-200 hover:border-primary/50 hover:bg-primary/5 rounded-lg transition-all group"
                        title="Agregar a Outlook"
                      >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 group-hover:text-primary transition-colors" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7.5 7.5h9v9h-9v-9zm1.5 1.5v6h6v-6H9zm-6-1.5h4.5v1.5H3V7.5zm0 4.5h4.5V13.5H3V12zm13.5-4.5H21v1.5h-4.5V7.5zm0 4.5H21V13.5h-4.5V12z"/>
                        </svg>
                        <span className="text-xs font-medium text-gray-700 group-hover:text-primary transition-colors">Outlook</span>
                      </a>
                      <a
                        href={calendarUrls.yahoo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex flex-col items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-gray-200 hover:border-primary/50 hover:bg-primary/5 rounded-lg transition-all group"
                        title="Agregar a Yahoo Calendar"
                      >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 group-hover:text-primary transition-colors" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        <span className="text-xs font-medium text-gray-700 group-hover:text-primary transition-colors">Yahoo</span>
                      </a>
                      <a
                        href={calendarUrls.apple}
                        download="consulta-nutricional.ics"
                        className="inline-flex flex-col items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-gray-200 hover:border-primary/50 hover:bg-primary/5 rounded-lg transition-all group"
                        title="Agregar a Apple Calendar"
                      >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs font-medium text-gray-700 group-hover:text-primary transition-colors">Apple</span>
                      </a>
                    </div>
                    <p className="text-xs text-gray-500 mt-3 text-center sm:text-left">
                      Haz clic en tu calendario preferido para agregar la cita automáticamente
                    </p>
                  </div>
                )}
              </div>

              {/* Información adicional */}
              <div className="bg-blue-50/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-100">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm sm:text-base font-semibold text-blue-900 mb-1">
                      Próximos pasos
                    </p>
                    <p className="text-xs sm:text-sm text-blue-800 leading-relaxed">
                      Revisa tu correo electrónico ({last.email}) en las próximas horas. 
                      Nuestro equipo se pondrá en contacto contigo para confirmar todos los detalles de tu consulta.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-600 text-sm sm:text-base mb-2">
                No se encontró información de solicitud reciente.
              </p>
              <p className="text-gray-500 text-xs sm:text-sm">
                Si acabas de enviar una solicitud, por favor contacta con nuestro equipo.
              </p>
            </div>
          )}

          {/* Botones de acción */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Volver al inicio
            </Link>
            <Link
              href="/menu"
              className="inline-flex items-center justify-center w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 bg-white border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary/5 transition-all text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Ver nuestra carta
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
