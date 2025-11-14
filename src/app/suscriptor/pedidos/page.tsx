"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getOrders } from '@/lib/api'
import { NotificationHelpers } from '@/lib/notifications'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'

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

interface Order {
  id: string
  status: string
  eta: string
  totalCalories: number
  items: string[]
  notes: string
  createdAt: string
  day?: string
  delivery_mode?: 'delivery' | 'pickup'
  delivery_address?: string
  pickup_location?: string
}

// Las funciones de conversión ahora están en loadOrders()

export default function SuscriptorPedidosPage() {
  const { userId } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [previousOrders, setPreviousOrders] = useState<Order[]>([])

  // Función para cargar pedidos desde la API
  const loadOrders = async () => {
    if (!userId) return

    try {
      const apiOrders = await getOrders()
      // Filtrar pedidos del suscriptor actual
      const myOrders = apiOrders.filter((order: any) => order.user_id === userId)
      
      // Convertir a formato del suscriptor
      const subscriberOrders: Order[] = myOrders.map((apiOrder: any) => {
        // Obtener items del pedido (por ahora placeholder)
        const items = ['Plato del día'] // Se puede mejorar obteniendo de order_items
        
        // Calcular calorías (placeholder, se puede mejorar)
        const totalCalories = 500 // Se puede calcular desde order_items
        
        return {
          id: apiOrder.id,
          status: mapApiStatusToSubscriber(apiOrder.status),
          eta: apiOrder.estimated_delivery_time 
            ? `${Math.round((new Date(apiOrder.estimated_delivery_time).getTime() - Date.now()) / (1000 * 60))} min`
            : '—',
          totalCalories,
          items,
          notes: apiOrder.status === 'entregado' ? 'Recibido por el cliente' : 'Entrega sin contacto',
          createdAt: apiOrder.created_at,
          delivery_mode: apiOrder.delivery_mode || 'delivery',
          delivery_address: apiOrder.delivery_address,
          pickup_location: apiOrder.pickup_location,
        }
      })

      // Detectar cambios de estado en pedidos
      if (previousOrders.length > 0 && document.hidden) {
        subscriberOrders.forEach((currentOrder) => {
          const previousOrder = previousOrders.find((prev) => prev.id === currentOrder.id)
          if (previousOrder && previousOrder.status !== currentOrder.status) {
            // Estado cambió, mostrar notificación
            NotificationHelpers.orderStatusChanged(
              currentOrder.id,
              currentOrder.status,
              '/suscriptor/pedidos',
              userId
            )
          }
        })
      }

      setPreviousOrders(subscriberOrders)
      setOrders(subscriberOrders)
    } catch (error) {
      console.error('Error loading orders:', error)
      setOrders([])
    }
  }
  
  // Mapear estados de API a estados del suscriptor
  const mapApiStatusToSubscriber = (apiStatus: string): string => {
    const statusMap: Record<string, string> = {
      'pendiente': 'Preparando',
      'preparando': 'Preparando',
      'en_camino': 'En camino',
      'entregado': 'Entregado',
      'cancelado': 'Cancelado',
    }
    return statusMap[apiStatus] || apiStatus
  }

  useEffect(() => {
    if (!userId) return

    loadOrders()

    // Polling cada 5 segundos para actualizar pedidos
    const interval = setInterval(loadOrders, 5000)

    return () => {
      clearInterval(interval)
    }
  }, [userId])

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <PageHeader
          title="Pedidos programados"
          description="Tus pedidos se generan automáticamente según tu plan semanal personalizado. Puedes modificar tu plan de Viernes a Domingo para ajustar la semana siguiente."
        />
        <p className="text-xs sm:text-sm text-gray-500 italic px-4 sm:px-0">
          Los pedidos se preparan según las comidas de tu plan asignado por el nutricionista.
        </p>
      </div>

      {/* Lista de pedidos */}
      {orders.length === 0 ? (
        <EmptyState
          title="No hay pedidos programados aún"
          message="Los pedidos se generarán automáticamente según tu plan semanal."
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Pedido #{order.id}</h3>
                  <p className="text-xs uppercase tracking-wider text-gray-400">
                    {order.day && `Plan ${order.day}`} · Calorías totales {order.totalCalories}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    order.status === 'Entregado'
                      ? 'bg-primary/10 text-primary'
                      : order.status === 'En camino'
                      ? 'bg-highlight/10 text-highlight'
                      : order.status === 'Cancelado'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-accent/10 text-accent'
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <ul className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                {order.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-gray-200 bg-slate-50 px-3 py-1 text-xs font-medium"
                  >
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
                  <span>
                    <strong className="text-gray-700">ETA:</strong> {order.eta}
                  </span>
                  <span className="italic">Notas: {order.notes}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className={`px-2 py-1 rounded-full ${
                      order.delivery_mode === 'pickup' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {order.delivery_mode === 'pickup' ? '📦 Recogida' : '🚚 Delivery'}
                    </span>
                    {order.delivery_mode === 'delivery' && order.delivery_address && (
                      <span className="text-gray-500">📍 {order.delivery_address}</span>
                    )}
                    {order.delivery_mode === 'pickup' && order.pickup_location && (
                      <span className="text-gray-500">📍 {order.pickup_location}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {(order.status === 'En camino' || order.status === 'Preparando') && (
                      <a
                        href={`/suscriptor/pedidos/${order.id}/seguimiento`}
                        className="px-3 py-1 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium"
                      >
                        Ver Seguimiento
                      </a>
                    )}
                    {order.status === 'Entregado' && (
                      <a
                        href={`/suscriptor/pedidos/${order.id}/valorar`}
                        className="px-3 py-1 text-xs bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition font-medium"
                      >
                        ⭐ Valorar
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
