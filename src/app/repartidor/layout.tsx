import type { ReactNode } from 'react'
import ProtectedRoute from '../../components/auth/ProtectedRoute'
import RoleLayoutShell from '../../components/layout/RoleLayoutShell'

const links = [
  { href: '/repartidor', label: 'Resumen', description: 'Pedidos activos y rendimiento diario' },
  { href: '/repartidor/pedidos', label: 'Pedidos asignados', description: 'Detalle con instrucciones de entrega' },
  { href: '/repartidor/historial', label: 'Historial', description: 'Entregas completadas y feedback' },
]

export default function RepartidorLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredRole="repartidor">
      <RoleLayoutShell
        title="Operaciones de reparto"
        subtitle="Monitorea tus rutas, cumple los tiempos estimados y comparte comentarios desde el campo."
        links={links}
      >
        {children}
      </RoleLayoutShell>
    </ProtectedRoute>
  )
}

