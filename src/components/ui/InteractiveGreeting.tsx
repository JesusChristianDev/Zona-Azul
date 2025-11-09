"use client"

import { useState, useEffect } from 'react'

interface InteractiveGreetingProps {
  userName: string
  role?: 'admin' | 'suscriptor' | 'nutricionista' | 'repartidor'
}

// Función para obtener el saludo según la hora del día
function getTimeBasedGreeting(): { greeting: string; emoji: string; message: string } {
  const hour = new Date().getHours()
  
  if (hour >= 5 && hour < 12) {
    return {
      greeting: 'Buenos días',
      emoji: '☀️',
      message: '¡Que tengas un excelente día!'
    }
  } else if (hour >= 12 && hour < 18) {
    return {
      greeting: 'Buenas tardes',
      emoji: '🌤️',
      message: '¡Esperamos que tu día vaya genial!'
    }
  } else if (hour >= 18 && hour < 22) {
    return {
      greeting: 'Buenas tardes',
      emoji: '🌆',
      message: '¡Esperamos que tu día haya sido productivo!'
    }
  } else {
    return {
      greeting: 'Buenas noches',
      emoji: '🌙',
      message: '¡Descansa bien!'
    }
  }
}

// Mensajes personalizados por rol
function getRoleMessage(role?: string): string {
  const roleMessages: Record<string, string> = {
    admin: 'Todo bajo control',
    suscriptor: 'Tu bienestar es nuestra prioridad',
    nutricionista: 'Ayudando a transformar vidas',
    repartidor: 'Entregando sonrisas',
  }
  return roleMessages[role || ''] || 'Bienvenido de nuevo'
}

export default function InteractiveGreeting({ userName, role }: InteractiveGreetingProps) {
  const [greetingData, setGreetingData] = useState(getTimeBasedGreeting())
  const [isAnimating, setIsAnimating] = useState(false)

  // Actualizar saludo cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setGreetingData(getTimeBasedGreeting())
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 500)
    }, 60000) // Cada minuto

    return () => clearInterval(interval)
  }, [])

  // Obtener primer nombre
  const firstName = userName?.split(' ')[0] || 'Usuario'

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/10 to-highlight/10 border border-primary/20 p-6 sm:p-8 shadow-lg">
      {/* Decoración de fondo */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/5 rounded-full -ml-12 -mb-12 blur-2xl"></div>
      
      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-4xl sm:text-5xl transition-transform duration-500 ${isAnimating ? 'scale-110 rotate-12' : ''}`}>
                {greetingData.emoji}
              </span>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1">
                  <span className="text-primary">{greetingData.greeting}</span>
                  {', '}
                  <span className="animate-in fade-in slide-in-from-right-4">{firstName}</span>
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  {greetingData.message}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex-shrink-0">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-primary/20 shadow-md">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-gray-700">{getRoleMessage(role)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

