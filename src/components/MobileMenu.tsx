"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Cerrar menú cuando cambia la ruta
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Cerrar menú al hacer clic fuera y prevenir scroll
  useEffect(() => {
    if (isOpen) {
      // Prevenir scroll del body cuando el menú está abierto
      document.body.style.overflow = 'hidden'

      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen])

  return (
    <>
      <button
        className="lg:hidden p-2 text-gray-700 hover:text-primary transition-colors rounded-lg hover:bg-gray-100"
        aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={isOpen}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        data-mobile-menu="button"
      >
        <svg
          className="w-6 h-6 transition-transform duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
        >
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Overlay/Backdrop - debe estar detrás del menú */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] lg:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
          style={{ pointerEvents: 'auto' }}
        />
      )}

      {/* Menú deslizante - debe estar encima del overlay */}
      <nav
        data-mobile-menu="menu"
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-[110] lg:hidden transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full relative">
          {/* Header del menú */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/5 to-accent/5 relative z-10 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                ZA
              </div>
              <span className="font-semibold text-gray-900">Zona Azul</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsOpen(false)
              }}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors relative z-20"
              aria-label="Cerrar menú"
              style={{ pointerEvents: 'auto' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navegación */}
          <div className="flex-1 overflow-y-auto py-4" style={{ minHeight: 0 }}>
            <div className="px-4 space-y-1">
              <Link
                href="/"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative z-20 ${pathname === '/'
                    ? 'bg-primary text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-primary'
                  }`}
                onClick={(e) => {
                  e.stopPropagation()
                  setIsOpen(false)
                }}
                style={{ pointerEvents: 'auto' }}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="font-medium">Inicio</span>
              </Link>

              <Link
                href="/booking"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative z-20 ${pathname === '/booking'
                    ? 'bg-primary text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-primary'
                  }`}
                onClick={(e) => {
                  e.stopPropagation()
                  setIsOpen(false)
                }}
                style={{ pointerEvents: 'auto' }}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="font-medium">Agendar cita</span>
              </Link>

              <Link
                href="/menu"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative z-20 ${pathname === '/menu' || pathname?.startsWith('/menu/')
                    ? 'bg-primary text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-primary'
                  }`}
                onClick={(e) => {
                  e.stopPropagation()
                  setIsOpen(false)
                }}
                style={{ pointerEvents: 'auto' }}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <span className="font-medium">Carta</span>
              </Link>

              <Link
                href="/login"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative z-20 ${pathname === '/login'
                    ? 'bg-primary text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-primary'
                  }`}
                onClick={(e) => {
                  e.stopPropagation()
                  setIsOpen(false)
                }}
                style={{ pointerEvents: 'auto' }}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 12h14m-7-7l7 7-7 7"
                  />
                </svg>
                <span className="font-medium">Acceso</span>
              </Link>
            </div>
          </div>

          {/* Footer del menú */}
          <div className="border-t p-4 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">Zona Azul · PWA</p>
          </div>
        </div>
      </nav>
    </>
  )
}

