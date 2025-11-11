import type { ReactNode } from 'react'
import ProtectedRoute from '../../components/auth/ProtectedRoute'
import RoleLayoutShell from '../../components/layout/RoleLayoutShell'

const links = [
  { href: '/admin', label: 'Visión general', description: 'KPIs generales y salud del negocio' },
  { href: '/admin/menu', label: 'Gestión del menú', description: 'Platos, disponibilidad y pricing' },
  { href: '/admin/usuarios', label: 'Usuarios', description: 'Administradores, nutricionistas y clientes' },
  { href: '/admin/citas', label: 'Citas', description: 'Gestionar citas y crear usuarios' },
  { href: '/admin/pedidos', label: 'Pedidos', description: 'Historial completo y estado actual' },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredRole="admin">
      <RoleLayoutShell
        title="Administración general"
        subtitle="Controla la estrategia Zona Azul: operaciones, equipos y métricas clave para tomar decisiones informadas."
        links={links}
      >
        {children}
      </RoleLayoutShell>
    </ProtectedRoute>
  )
}

