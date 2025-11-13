"use client"

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import RoleLayoutShell from '@/components/layout/RoleLayoutShell'
import RepartidorPage from './page'

const links = [
  { href: '/repartidor', label: 'Resumen', description: 'Pedidos activos y rendimiento diario' },
  { href: '/repartidor/pedidos', label: 'Pedidos asignados', description: 'Detalle con instrucciones de entrega' },
  { href: '/repartidor/historial', label: 'Historial', description: 'Entregas completadas y feedback' },
]

export default function RepartidorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isAjustes = pathname === '/repartidor/ajustes'
  
  return (
    <ProtectedRoute requiredRole="repartidor">
      {/* Siempre renderizar el RoleLayoutShell para que el dashboard sea visible */}
      <RoleLayoutShell
        title="Operaciones de reparto"
        subtitle="Monitorea tus rutas, cumple los tiempos estimados y comparte comentarios desde el campo."
        links={links}
      >
        {/* Si es ajustes, mostrar el dashboard por defecto para que sea visible detrás del overlay */}
        {/* Si no es ajustes, renderizar children normalmente */}
        {isAjustes ? <RepartidorPage /> : children}
      </RoleLayoutShell>
      {/* Renderizar el componente de ajustes fuera del RoleLayoutShell para que flote como overlay */}
      {isAjustes && children}
    </ProtectedRoute>
  )
}

