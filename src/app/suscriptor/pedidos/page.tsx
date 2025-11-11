"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { getOrders } from '../../../lib/api'
import { NotificationHelpers } from '../../../lib/notifications'

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
    <div className="space-y-6">
      <header className="rounded-2xl border border-accent/30 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pedidos programados</h2>
          <p className="mt-2 text-sm text-gray-600">
            Tus pedidos se generan automáticamente según tu plan semanal personalizado. Puedes modificar tu plan
            de Viernes a Domingo para ajustar la semana siguiente.
          </p>
          <p className="mt-2 text-xs text-gray-500 italic">
            Los pedidos se preparan según las comidas de tu plan asignado por el nutricionista.
          </p>
        </div>
      </header>

      {orders.length === 0 ? (
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-8 text-center">
          <p className="text-gray-600">No hay pedidos programados aún.</p>
          <p className="text-sm text-gray-500 mt-2">
            Los pedidos se generarán automáticamente según tu plan semanal.
          </p>
        </div>
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
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
                <span>
                  <strong className="text-gray-700">ETA:</strong> {order.eta}
                </span>
                <span className="italic">Notas: {order.notes}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
