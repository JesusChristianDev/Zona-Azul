"use client"

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import RoleLayoutShell from '@/components/layout/RoleLayoutShell'
import AdminPage from './page'

const links = [
  { href: '/admin', label: 'Visión general', description: 'KPIs generales y salud del negocio' },
  { href: '/admin/menu', label: 'Menú del local', description: 'Platos fijos del restaurante para compra individual' },
  { href: '/admin/comidas-planes', label: 'Comidas para planes', description: 'Comidas para planes nutricionales de suscriptores' },
  { href: '/admin/ingredientes', label: 'Ingredientes', description: 'Catálogo base y valores nutricionales para recetas y stock' },
  { href: '/admin/stock', label: 'Stock', description: 'Gestionar stock de platos y alertas' },
  { href: '/admin/usuarios', label: 'Usuarios', description: 'Administradores, nutricionistas y clientes' },
  { href: '/admin/citas', label: 'Citas', description: 'Gestionar citas y crear usuarios' },
  { href: '/admin/suscripciones', label: 'Suscripciones', description: 'Aprobar y gestionar suscripciones' },
  { href: '/admin/grupos', label: 'Grupos', description: 'Gestionar grupos de suscripción (Individual, Pareja, Familiar)' },
  { href: '/admin/pagos', label: 'Pagos', description: 'Visualizar y gestionar pagos (cuotas externas)' },
  { href: '/admin/pedidos', label: 'Pedidos', description: 'Historial completo y estado actual' },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isAjustes = pathname === '/admin/ajustes'
  
  return (
    <ProtectedRoute requiredRole="admin">
      {/* Siempre renderizar el RoleLayoutShell para que el dashboard sea visible */}
      <RoleLayoutShell
        title="Administración general"
        subtitle="Controla la estrategia Zona Azul: operaciones, equipos y métricas clave para tomar decisiones informadas."
        links={links}
      >
        {/* Si es ajustes, mostrar el dashboard por defecto para que sea visible detrás del overlay */}
        {/* Si no es ajustes, renderizar children normalmente */}
        {isAjustes ? <AdminPage /> : children}
      </RoleLayoutShell>
      {/* Renderizar el componente de ajustes fuera del RoleLayoutShell para que flote como overlay */}
      {isAjustes && children}
    </ProtectedRoute>
  )
}

