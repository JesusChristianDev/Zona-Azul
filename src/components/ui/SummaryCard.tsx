import type { ReactNode } from 'react'

interface SummaryCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export default function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className = '',
}: SummaryCardProps) {
  return (
    <div 
      className={`bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 p-4 sm:p-6 transition-all duration-200 ease-out hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] animate-in fade-in slide-in-from-bottom-2 ${className}`}
      style={{ willChange: 'transform, box-shadow' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 transition-colors duration-150">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 transition-all duration-200">{value}</p>
          {subtitle && <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 transition-colors duration-150">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2 animate-in fade-in slide-in-from-left-2">
              <svg
                className={`w-4 h-4 transition-colors duration-150 ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {trend.isPositive ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                )}
              </svg>
              <span className={`text-xs font-medium transition-colors duration-150 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.value > 0 ? '+' : ''}{trend.value.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        {icon && <div className="text-primary opacity-80 transition-all duration-200 ease-out hover:opacity-100 hover:scale-110 active:scale-95">{icon}</div>}
      </div>
    </div>
  )
}

