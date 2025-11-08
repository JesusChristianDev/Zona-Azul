import type { ReactNode } from 'react'
import ProtectedRoute from '../../components/auth/ProtectedRoute'
import RoleLayoutShell from '../../components/layout/RoleLayoutShell'

const links = [
  { href: '/suscriptor', label: 'Resumen', description: 'Visión general del bienestar semanal' },
  { href: '/suscriptor/plan', label: 'Plan de comidas', description: 'Menú personalizado y calendario' },
  { href: '/suscriptor/pedidos', label: 'Pedidos', description: 'Estado de entregas y historial' },
  { href: '/suscriptor/progreso', label: 'Progreso', description: 'Peso, hidratación y energía' },
]

export default function SuscriptorLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredRole="suscriptor">
      <RoleLayoutShell
        title="Tu viaje Zona Azul"
        subtitle="Mantén el foco en tus objetivos con planes, pedidos y seguimiento integral de hábitos saludables."
        links={links}
      >
        {children}
      </RoleLayoutShell>
    </ProtectedRoute>
  )
}

