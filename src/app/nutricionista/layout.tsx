import type { ReactNode } from 'react'
import ProtectedRoute from '../../components/auth/ProtectedRoute'
import RoleLayoutShell from '../../components/layout/RoleLayoutShell'

const links = [
  { href: '/nutricionista', label: 'Resumen', description: 'Indicadores del equipo y próximos hitos' },
  { href: '/nutricionista/citas', label: 'Citas', description: 'Gestionar citas y consultas nutricionales' },
  { href: '/nutricionista/clientes', label: 'Clientes', description: 'Seguimiento de progreso y adherencia' },
  { href: '/nutricionista/planes', label: 'Planes', description: 'Plantillas y ajustes personalizados' },
]

export default function NutricionistaLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredRole="nutricionista">
      <RoleLayoutShell
        title="Acompañamiento nutricional"
        subtitle="Gestiona tus clientes activos, planifica menús evolutivos y registra feedback en tiempo real."
        links={links}
      >
        {children}
      </RoleLayoutShell>
    </ProtectedRoute>
  )
}

