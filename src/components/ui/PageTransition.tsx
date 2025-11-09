"use client"

import { usePathname } from 'next/navigation'

interface PageTransitionProps {
  children: React.ReactNode
}

export default function PageTransition({ children }: PageTransitionProps) {
  // Eliminamos todas las transiciones que causan parpadeo
  // Next.js maneja el cambio de contenido de forma nativa
  // Solo mantenemos el wrapper para compatibilidad
  return <div>{children}</div>
}

