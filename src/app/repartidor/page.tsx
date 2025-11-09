"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getSubscribers } from '../../lib/subscribers'
import InteractiveGreeting from '../../components/ui/InteractiveGreeting'

interface AdminOrder {
  id: string
  customerId: string
  customer: string
  customerEmail: string
  role: string
  status: string
  eta: string
  channel: string
  items?: string[]
  total?: number
}

const safetyTips = [
  'Verifica que cada entrega tenga contacto actualizado antes de salir.',
  'Utiliza las bolsas térmicas oficiales Zona Azul para preservar la calidad.',
  'Registra comentarios o incidencias desde la app para dar seguimiento inmediato.',
]

export default function RepartidorPage() {
  const { userId, userName } = useAuth()
  const [metrics, setMetrics] = useState([
    { label: 'Pedidos del día', value: 0, delta: 'Cargando...' },
    { label: 'Tiempo promedio', value: '—', delta: 'Calculando...' },
    { label: 'Satisfacción clientes', value: '4.9/5', delta: 'Basado en 42 calificaciones' },
  ])

  useEffect(() => {
    const loadStats = () => {
      if (!userId) return

      // Obtener pedidos del admin
      const adminOrdersStr = localStorage.getItem('zona_azul_admin_orders')
      if (adminOrdersStr) {
        try {
          const adminOrders: AdminOrder[] = JSON.parse(adminOrdersStr)
          const subscribers = getSubscribers()
          const validSubscriberIds = new Set(subscribers.map((s) => s.id))
          
          // Filtrar pedidos válidos (no cancelados y con suscriptores válidos)
          const validOrders = adminOrders.filter(
            (order) =>
              validSubscriberIds.has(order.customerId) &&
              order.status !== 'Cancelado' &&
              (order.status === 'En camino' || order.status === 'Preparando' || order.status === 'Entregado')
          )

          // Pedidos del día (todos los asignados al repartidor)
          const todayDeliveries = validOrders.length

          // Pedidos pendientes (no entregados)
          const pendingDeliveries = validOrders.filter(
            (order) => order.status !== 'Entregado'
          ).length

          // Calcular tiempo promedio basado en ETA de pedidos en camino
          const ordersInRoute = validOrders.filter((order) => order.status === 'En camino')
          let avgTime = 0
          if (ordersInRoute.length > 0) {
            const totalMinutes = ordersInRoute.reduce((sum, order) => {
              const etaStr = order.eta
              if (etaStr === '—' || !etaStr) return sum
              const minutes = parseInt(etaStr.replace(/[^0-9]/g, '')) || 0
              return sum + minutes
            }, 0)
            avgTime = Math.round(totalMinutes / ordersInRoute.length)
          } else if (validOrders.length > 0) {
            // Si no hay pedidos en camino, usar ETA de pedidos preparando
            const preparingOrders = validOrders.filter(
              (order) => order.status === 'Preparando'
            )
            if (preparingOrders.length > 0) {
              const totalMinutes = preparingOrders.reduce((sum, order) => {
                const etaStr = order.eta
                if (etaStr === '—' || !etaStr) return sum + 30 // Default 30 min
                const minutes = parseInt(etaStr.replace(/[^0-9]/g, '')) || 30
                return sum + minutes
              }, 0)
              avgTime = Math.round(totalMinutes / preparingOrders.length)
            }
          }

          const avgTimeStr = avgTime > 0 ? `${avgTime} min` : '—'

          setMetrics([
            {
              label: 'Pedidos del día',
              value: todayDeliveries,
              delta: `${pendingDeliveries} pendientes de entregar`,
            },
            {
              label: 'Tiempo promedio',
              value: avgTimeStr,
              delta: 'Objetivo < 30 min',
            },
            {
              label: 'Satisfacción clientes',
              value: '4.9/5',
              delta: 'Basado en 42 calificaciones',
            },
          ])
        } catch (error) {
          console.error('Error loading stats from admin orders:', error)
          setMetrics([
            { label: 'Pedidos del día', value: 0, delta: 'Error al cargar' },
            { label: 'Tiempo promedio', value: '—', delta: 'Error al cargar' },
            { label: 'Satisfacción clientes', value: '4.9/5', delta: 'Basado en 42 calificaciones' },
          ])
        }
      } else {
        setMetrics([
          { label: 'Pedidos del día', value: 0, delta: 'Sin pedidos asignados' },
          { label: 'Tiempo promedio', value: '—', delta: 'Sin pedidos asignados' },
          { label: 'Satisfacción clientes', value: '4.9/5', delta: 'Basado en 42 calificaciones' },
        ])
      }
    }

    loadStats()

    // Escuchar cambios
    const handleOrdersUpdate = () => loadStats()
    window.addEventListener('zona_azul_admin_orders_updated', handleOrdersUpdate)
    window.addEventListener('zona_azul_deliveries_updated', handleOrdersUpdate)
    window.addEventListener('zona_azul_subscribers_updated', handleOrdersUpdate)

    // Escuchar cambios en localStorage (otras pestañas)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'zona_azul_admin_orders') {
        loadStats()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    // Polling cada 3 segundos como fallback
    const interval = setInterval(loadStats, 3000)

    return () => {
      window.removeEventListener('zona_azul_admin_orders_updated', handleOrdersUpdate)
      window.removeEventListener('zona_azul_deliveries_updated', handleOrdersUpdate)
      window.removeEventListener('zona_azul_subscribers_updated', handleOrdersUpdate)
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [userId])

  return (
    <div className="space-y-6">
      <InteractiveGreeting userName={userName || 'Repartidor'} role="repartidor" />
      <section className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-2xl border border-highlight/30 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-highlight/80">{metric.label}</p>
            <p className="mt-3 text-3xl font-bold text-gray-900">{metric.value}</p>
            <p className="mt-2 text-xs font-medium text-gray-500">{metric.delta}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Tips de excelencia Zona Azul</h2>
        <ul className="mt-4 space-y-2 text-sm text-gray-600">
          {safetyTips.map((tip) => (
            <li key={tip} className="flex items-start gap-2">
              <span className="mt-1 block h-2 w-2 rounded-full bg-accent"></span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

