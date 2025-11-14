"use client"

import { ReactNode } from 'react'

interface ResponsiveGridProps {
  children: ReactNode
  cols?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  gap?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Grid responsive reutilizable
 * Simplifica la creación de layouts responsivos
 */
export default function ResponsiveGrid({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md',
  className = ""
}: ResponsiveGridProps) {
  const gapClasses = {
    sm: "gap-2 sm:gap-3",
    md: "gap-4",
    lg: "gap-6 sm:gap-8"
  }

  // Mapeo de columnas a clases de Tailwind (necesario porque Tailwind no soporta clases dinámicas)
  const colMap: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  }

  const mobileCol = colMap[cols.mobile || 1] || "grid-cols-1"
  const tabletCol = cols.tablet ? `sm:${colMap[cols.tablet] || "grid-cols-2"}` : "sm:grid-cols-2"
  const desktopCol = cols.desktop ? `lg:${colMap[cols.desktop] || "grid-cols-3"}` : "lg:grid-cols-3"

  return (
    <div className={`grid ${mobileCol} ${tabletCol} ${desktopCol} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  )
}

