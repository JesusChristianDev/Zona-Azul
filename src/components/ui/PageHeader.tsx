"use client"

import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  badge?: string
  action?: ReactNode
  className?: string
}

/**
 * Componente reutilizable para headers de página
 * Responsive y profesional
 */
export default function PageHeader({ 
  title, 
  description, 
  badge, 
  action,
  className = ""
}: PageHeaderProps) {
  return (
    <header className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${className}`}>
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
          {badge && (
            <span className="bg-primary/10 dark:bg-primary/20 text-primary text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="w-full sm:w-auto flex-shrink-0">
          {action}
        </div>
      )}
    </header>
  )
}

