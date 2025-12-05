"use client"

interface ToastMessageProps {
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  onClose?: () => void
  className?: string
}

/**
 * Mensaje toast reutilizable y responsive
 */
export default function ToastMessage({
  message,
  type = 'info',
  onClose,
  className = ""
}: ToastMessageProps) {
  const typeStyles = {
    success: "bg-green-50 dark:bg-emerald-900/20 border-green-200 dark:border-emerald-700 text-green-800 dark:text-emerald-100",
    error: "bg-red-50 dark:bg-rose-900/20 border-red-200 dark:border-rose-700 text-red-800 dark:text-rose-100",
    info: "bg-blue-50 dark:bg-sky-900/20 border-blue-200 dark:border-sky-700 text-blue-800 dark:text-sky-100",
    warning: "bg-yellow-50 dark:bg-amber-900/30 border-yellow-200 dark:border-amber-700 text-yellow-800 dark:text-amber-100"
  }

  const icons = {
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  }

  return (
    <div className={`rounded-lg border p-4 flex items-start gap-3 ${typeStyles[type]} ${className}`}>
      <div className="flex-shrink-0 mt-0.5">
        {icons[type]}
      </div>
      <div className="flex-1 text-sm font-medium">
        {message}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Cerrar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

