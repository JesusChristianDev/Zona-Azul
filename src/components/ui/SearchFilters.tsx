"use client"

import { ReactNode } from 'react'

interface SearchFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filters?: ReactNode
  resultsCount?: { showing: number; total: number }
  className?: string
}

/**
 * Componente reutilizable para búsqueda y filtros
 * Responsive y profesional
 */
export default function SearchFilters({
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  filters,
  resultsCount,
  className = ""
}: SearchFiltersProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 ${className}`}>
      <div className="space-y-4">
        {/* Barra de búsqueda */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition placeholder-gray-400"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              aria-label="Limpiar búsqueda"
            >
              <svg className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filtros adicionales */}
        {filters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters}
          </div>
        )}

        {/* Contador de resultados */}
        {resultsCount && resultsCount.showing !== resultsCount.total && (
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
            Mostrando {resultsCount.showing} de {resultsCount.total} resultados
          </div>
        )}
      </div>
    </div>
  )
}

