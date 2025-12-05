"use client"

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { usePathname } from 'next/navigation'
import * as api from '../../lib/api'
import { isPublicRoute as checkIfPublicRoute } from '@/constants/routes'

/**
 * Componente que carga y aplica las preferencias del usuario inmediatamente después del login
 * Se monta en el layout principal para asegurar que las preferencias se apliquen antes
 * de que se renderice cualquier contenido
 */
export default function UserPreferencesLoader() {
  const { userId, isAuthenticated, loading: authLoading } = useAuth()
  const pathname = usePathname()
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)

  // Memoizar isPublicRoute para evitar recálculos innecesarios
  const isPublicRoute = useMemo(() => checkIfPublicRoute(pathname), [pathname])

  useEffect(() => {
    // IMPORTANTE: SOLO cargar preferencias si el usuario está autenticado
    // NO cargar en páginas públicas (/, /booking, /menu, /login)
    // Esto evita que se apliquen preferencias en páginas públicas
    // Solo cargar si está autenticado, tiene userId, no está en ruta pública, y no se han cargado aún
    if (!authLoading && isAuthenticated && userId && !isPublicRoute && !preferencesLoaded) {
      const loadAndApplyPreferences = async () => {
        try {
          const dbSettings = await api.getUserSettings()
          
          if (dbSettings) {
            // Aplicar ajustes de accesibilidad inmediatamente
            if (dbSettings.accessibility_font_size) {
              const fontSizeMap: Record<string, string> = {
                small: '0.875rem',    // 14px base
                medium: '1rem',       // 16px base
                large: '1.125rem',    // 18px base
                xlarge: '1.25rem'     // 20px base
              }
              const fontSize = fontSizeMap[dbSettings.accessibility_font_size] || fontSizeMap.medium
              document.documentElement.style.fontSize = fontSize
            }

            // Aplicar alto contraste
            if (dbSettings.accessibility_high_contrast) {
              document.documentElement.classList.add('high-contrast')
            } else {
              document.documentElement.classList.remove('high-contrast')
            }

            // Aplicar reducir animaciones
            if (dbSettings.accessibility_reduce_animations) {
              document.documentElement.classList.add('reduce-motion')
            } else {
              document.documentElement.classList.remove('reduce-motion')
            }

            // Aplicar tema (lo más importante para evitar flash)
            const theme = (dbSettings.preferences_theme as 'light' | 'dark' | 'auto') || 'light'
            applyTheme(theme)
          } else {
            // Si no hay ajustes, aplicar tema por defecto (light)
            applyTheme('light')
          }
        } catch (error) {
          console.error('Error loading user preferences:', error)
          // Aplicar tema por defecto si hay error
          applyTheme('light')
        } finally {
          // Marcar como cargado para evitar intentos futuros
          setPreferencesLoaded(true)
        }
      }

      // Cargar inmediatamente (sin delay)
      loadAndApplyPreferences()
    }
  }, [userId, isAuthenticated, authLoading, preferencesLoaded, isPublicRoute])

  // Si el usuario cierra sesión o navega a una ruta pública, resetear las preferencias
  useEffect(() => {
    // Resetear si:
    // 1. El usuario cierra sesión
    // 2. El usuario navega a una ruta pública
    if ((!isAuthenticated || isPublicRoute) && preferencesLoaded) {
      setPreferencesLoaded(false)
      // Resetear a valores por defecto (modo claro, sin accesibilidad)
      document.documentElement.style.fontSize = ''
      document.documentElement.classList.remove('high-contrast', 'reduce-motion', 'dark')
      applyTheme('light')
    }
  }, [isAuthenticated, preferencesLoaded, isPublicRoute])

  useEffect(() => {
    if (typeof document === 'undefined') return

    const html = document.documentElement
    const body = document.body

    if (isPublicRoute) {
      body.classList.add('public-page')
      html.classList.remove('dark')
    } else {
      body.classList.remove('public-page')
    }
  }, [isPublicRoute])

  // Este componente no renderiza nada
  return null
}

/**
 * Función para aplicar el tema al documento
 */
function applyTheme(theme: 'light' | 'dark' | 'auto') {
  if (typeof window === 'undefined') return

  const htmlElement = document.documentElement

  if (theme === 'auto') {
    // Detectar preferencia del sistema
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      htmlElement.classList.add('dark')
    } else {
      htmlElement.classList.remove('dark')
    }
  } else if (theme === 'dark') {
    htmlElement.classList.add('dark')
  } else {
    htmlElement.classList.remove('dark')
  }
}


