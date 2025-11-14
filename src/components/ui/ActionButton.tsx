"use client"

import { ReactNode } from 'react'

interface ActionButtonProps {
  onClick: () => void
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  fullWidth?: boolean
  className?: string
}

/**
 * Botón de acción reutilizable y responsive
 */
export default function ActionButton({
  onClick,
  children,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  className = ""
}: ActionButtonProps) {
  const baseClasses = "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors"
  
  const variantClasses = {
    primary: "bg-primary text-white hover:bg-primary/90",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    danger: "bg-red-100 text-red-800 hover:bg-red-200",
    success: "bg-green-100 text-green-800 hover:bg-green-200"
  }

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  }

  const widthClass = fullWidth ? "w-full sm:w-auto" : ""

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  )
}

