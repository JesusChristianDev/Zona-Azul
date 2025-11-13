"use client"

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import RoleLayoutShell from '@/components/layout/RoleLayoutShell'
import NutricionistaPage from './page'

const links = [
  { href: '/nutricionista', label: 'Resumen', description: 'Indicadores del equipo y próximos hitos' },
  { href: '/nutricionista/citas', label: 'Citas', description: 'Gestionar citas y consultas nutricionales' },
  { href: '/nutricionista/clientes', label: 'Clientes', description: 'Seguimiento de progreso y adherencia' },
  { href: '/nutricionista/planes', label: 'Planes', description: 'Plantillas y ajustes personalizados' },
  { href: '/nutricionista/suscripciones', label: 'Suscripciones', description: 'Aprobar suscripciones de clientes' },
  { href: '/nutricionista/modificaciones', label: 'Modificaciones', description: 'Aprobar cambios en menús de clientes' },
  { href: '/nutricionista/alertas-stock', label: 'Alertas Stock', description: 'Platos sin stock que requieren atención' },
]

export default function NutricionistaLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isAjustes = pathname === '/nutricionista/ajustes'
  
  return (
    <ProtectedRoute requiredRole="nutricionista">
      {/* Siempre renderizar el RoleLayoutShell para que el dashboard sea visible */}
      <RoleLayoutShell
        title="Acompañamiento nutricional"
        subtitle="Gestiona tus clientes activos, planifica menús evolutivos y registra feedback en tiempo real."
        links={links}
      >
        {/* Si es ajustes, mostrar el dashboard por defecto para que sea visible detrás del overlay */}
        {/* Si no es ajustes, renderizar children normalmente */}
        {isAjustes ? <NutricionistaPage /> : children}
      </RoleLayoutShell>
      {/* Renderizar el componente de ajustes fuera del RoleLayoutShell para que flote como overlay */}
      {isAjustes && children}
    </ProtectedRoute>
  )
}

