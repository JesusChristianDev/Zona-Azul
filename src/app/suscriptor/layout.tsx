"use client"

import type { ReactNode } from 'react'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import RoleLayoutShell from '@/components/layout/RoleLayoutShell'
import DashboardSuscriptor from '@/components/dashboard/DashboardSuscriptor'

const baseLinks = [
  { href: '/suscriptor', label: 'Resumen', description: 'Visión general del bienestar semanal' },
  { href: '/suscriptor/suscripcion', label: 'Suscripción', description: 'Gestiona tu plan de suscripción' },
  { href: '/suscriptor/plan', label: 'Plan de Comidas', description: 'Ver y modificar tu plan y menú semanal' },
  { href: '/suscriptor/restricciones', label: 'Restricciones', description: 'Gestiona tus restricciones alimentarias' },
  { href: '/suscriptor/nuevo-pedido', label: 'Configurar Entrega', description: 'Gestionar método de entrega de pedidos automáticos' },
  { href: '/suscriptor/direcciones', label: 'Direcciones', description: 'Gestiona tus direcciones de entrega' },
  { href: '/suscriptor/pedidos', label: 'Pedidos', description: 'Estado de entregas y historial' },
  { href: '/suscriptor/progreso', label: 'Progreso', description: 'Peso, hidratación y energía' },
]

const miGrupoLink = { href: '/suscriptor/mi-grupo', label: 'Mi Grupo', description: 'Gestiona tu grupo y preferencias' }

export default function SuscriptorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isAjustes = pathname === '/suscriptor/ajustes'
  const { userId } = useAuth()
  const [isInGroup, setIsInGroup] = useState(false)
  const [loadingGroup, setLoadingGroup] = useState(true)

  // Verificar si el usuario está en un grupo (no individual)
  useEffect(() => {
    const checkGroupMembership = async () => {
      if (!userId) {
        setLoadingGroup(false)
        return
      }

      try {
        // Primero verificar si tiene una suscripción activa con grupo
        const subscriptionResponse = await fetch(`/api/subscriptions?user_id=${userId}&status=active`)
        if (subscriptionResponse.ok) {
          const subscriptions = await subscriptionResponse.json()
          const activeSubscription = subscriptions.find((sub: any) => sub.status === 'active')
          
          // Si la suscripción no tiene group_id, es individual
          if (activeSubscription && !activeSubscription.group_id) {
            setIsInGroup(false)
            setLoadingGroup(false)
            return
          }
        }

        // Si tiene group_id o no hay suscripción activa, verificar membresía en grupos
        const response = await fetch(`/api/subscription-groups?user_id=${userId}`)
        if (response.ok) {
          const data = await response.json()
          
          // Verificar si el usuario está en algún grupo activo
          // Un grupo con group_type='individual' NO cuenta como grupo para mostrar "Mi Grupo"
          const hasActiveGroup = data && data.length > 0 && data.some((group: any) => {
            // Solo considerar grupos que NO sean individuales
            if (group.group_type === 'individual') {
              return false
            }
            
            const member = group.subscription_group_members?.find(
              (m: any) => m.user_id === userId && !m.removed_at
            )
            return member && group.is_active
          })
          
          setIsInGroup(hasActiveGroup)
        } else {
          // Si hay error, asumir que no está en grupo
          setIsInGroup(false)
        }
      } catch (error) {
        console.error('Error checking group membership:', error)
        setIsInGroup(false)
      } finally {
        setLoadingGroup(false)
      }
    }

    checkGroupMembership()
  }, [userId])

  // Construir links dinámicamente
  const links = [
    ...baseLinks.slice(0, 2), // Resumen y Suscripción
    ...(isInGroup ? [miGrupoLink] : []), // Mi Grupo solo si está en un grupo
    ...baseLinks.slice(2), // Resto de links
  ]
  
  return (
    <ProtectedRoute requiredRole="suscriptor">
      {/* Siempre renderizar el RoleLayoutShell para que el dashboard sea visible */}
      <RoleLayoutShell
        title="Tu viaje Zona Azul"
        subtitle="Mantén el foco en tus objetivos con planes, pedidos y seguimiento integral de hábitos saludables."
        links={links}
      >
        {/* Si es ajustes, mostrar el dashboard por defecto para que sea visible detrás del overlay */}
        {/* Si no es ajustes, renderizar children normalmente */}
        {isAjustes ? <DashboardSuscriptor /> : children}
      </RoleLayoutShell>
      {/* Renderizar el componente de ajustes fuera del RoleLayoutShell para que flote como overlay */}
      {isAjustes && children}
    </ProtectedRoute>
  )
}

