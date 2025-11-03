"use client"

import React from 'react'
import Link from 'next/link'
import { useAuth } from '../../hooks/useAuth'

interface HeaderProps {
  title?: string
  showBack?: boolean
}

export default function Header({ title, showBack = false }: HeaderProps) {
  const { role, logout } = useAuth()

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {showBack && (
              <Link
                href="/"
                className="p-2 text-gray-600 hover:text-primary transition-colors rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
            )}
            <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base">
                HB
              </div>
              <h1 className="text-base sm:text-lg font-semibold">HealthyBox</h1>
            </Link>
            {title && <span className="text-gray-400 hidden sm:inline">/</span>}
            {title && <span className="text-sm sm:text-base text-gray-700 font-medium hidden sm:inline">{title}</span>}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-gray-600">Rol:</span>
              <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium capitalize">
                {role}
              </span>
            </div>
            {role !== 'invitado' && (
              <button
                onClick={logout}
                className="px-3 py-1.5 text-sm text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Salir
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

