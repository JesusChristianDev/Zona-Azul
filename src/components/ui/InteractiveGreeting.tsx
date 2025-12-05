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
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/10 via-accent/10 to-highlight/10 dark:from-primary/20 dark:via-accent/20 dark:to-highlight/20 border border-primary/20 dark:border-primary/30 p-4 sm:p-6 lg:p-8 shadow-lg">
      {/* Decoración de fondo */}
      <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-primary/5 rounded-full -mr-12 sm:-mr-16 -mt-12 sm:-mt-16 blur-2xl"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-accent/5 rounded-full -ml-8 sm:-ml-12 -mb-8 sm:-mb-12 blur-2xl"></div>
      
      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              <span className={`text-3xl sm:text-4xl lg:text-5xl transition-transform duration-500 flex-shrink-0 ${isAnimating ? 'scale-110 rotate-12' : ''}`}>
                {greetingData.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-0.5 sm:mb-1">
                  <span className="text-primary">{greetingData.greeting}</span>
                  {', '}
                  <span className="animate-in fade-in slide-in-from-right-4 break-words">{firstName}</span>
                </h1>
                <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300 line-clamp-2">
                  {greetingData.message}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex-shrink-0 self-start sm:self-auto">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full border border-primary/20 dark:border-primary/30 shadow-md">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">{getRoleMessage(role)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

