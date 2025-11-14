"use client"

interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Estado de carga reutilizable y responsive
 */
export default function LoadingState({
  message = "Cargando...",
  size = 'md',
  className = ""
}: LoadingStateProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16"
  }

  return (
    <div className={`text-center py-8 sm:py-12 ${className}`}>
      <div className={`animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4 ${sizeClasses[size]}`}></div>
      <p className="text-sm sm:text-base text-gray-600">{message}</p>
    </div>
  )
}

