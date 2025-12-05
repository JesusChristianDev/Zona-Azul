"use client"

import { ReactNode } from 'react'

interface EmptyStateProps {
  title?: string
  message: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}

/**
 * Estado vacío reutilizable y responsive
 */
export default function EmptyState({
  title,
  message,
  action,
  icon,
  className = ""
}: EmptyStateProps) {
  const defaultIcon = (
    <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  )

  return (
    <div className={`text-center py-8 sm:py-12 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 sm:p-8 ${className}`}>
      {icon || defaultIcon}
      {title && (
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      )}
      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4">{message}</p>
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  )
}

