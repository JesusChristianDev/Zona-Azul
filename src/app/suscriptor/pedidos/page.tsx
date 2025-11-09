"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
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

// Mapear estados del admin a estados del suscriptor
const mapAdminStatusToSubscriber = (adminStatus: string): string => {
  const statusMap: Record<string, string> = {
    'Preparando': 'Preparando',
    'En camino': 'En camino',
    'Entregado': 'Entregado',
    'Cancelado': 'Cancelado',
  }
  return statusMap[adminStatus] || adminStatus
}

// Convertir pedido del admin a formato del suscriptor
const convertAdminOrderToSubscriber = (adminOrder: AdminOrder): Order => {
  // Calcular calorías aproximadas basadas en items (mock)
  const caloriesMap: Record<string, number> = {
    'Bowl Vitalidad': 520,
    'Smoothie Verde': 280,
    'Wrap Proteico': 540,
    'Infusión Antioxidante': 50,
    'Ensalada Omega': 350,
    'Agua alcalina': 0,
    'Pollo al horno con quinoa': 620,
  }
  
  const totalCalories = adminOrder.items
    ? adminOrder.items.reduce((sum, item) => sum + (caloriesMap[item] || 400), 0)
    : 500

  return {
    id: adminOrder.id,
    status: mapAdminStatusToSubscriber(adminOrder.status),
    eta: adminOrder.eta,
    totalCalories,
    items: adminOrder.items || ['Plato del día'],
    notes: adminOrder.status === 'Entregado' ? 'Recibido por el cliente' : 'Entrega sin contacto',
    createdAt: new Date().toISOString(),
    day: undefined, // Se puede calcular basado en la fecha si es necesario
  }
}

export default function SuscriptorPedidosPage() {
  const { userId } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [previousOrders, setPreviousOrders] = useState<Order[]>([])

  // Función para cargar pedidos desde admin
  const loadOrders = () => {
    if (!userId) return

    // Obtener pedidos del admin
    const adminOrdersStr = localStorage.getItem('zona_azul_admin_orders')
    if (adminOrdersStr) {
      try {
        const adminOrders: AdminOrder[] = JSON.parse(adminOrdersStr)
        // Filtrar pedidos del suscriptor actual
        const subscriberOrders = adminOrders
          .filter((order) => order.customerId === userId)
          .map(convertAdminOrderToSubscriber)

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
        console.error('Error loading orders from admin:', error)
        setOrders([])
      }
    } else {
      setOrders([])
    }
  }

  useEffect(() => {
    if (!userId) return

    loadOrders()

    // Escuchar cambios en pedidos del admin
    const handleAdminOrdersChange = () => {
      loadOrders()
    }

    // Escuchar cambios en localStorage (otras pestañas)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'zona_azul_admin_orders') {
        loadOrders()
      }
    }

    window.addEventListener('zona_azul_admin_orders_updated', handleAdminOrdersChange)
    window.addEventListener('storage', handleStorageChange)

    // Polling cada 2 segundos como fallback
    const interval = setInterval(loadOrders, 2000)

    return () => {
      window.removeEventListener('zona_azul_admin_orders_updated', handleAdminOrdersChange)
      window.removeEventListener('storage', handleStorageChange)
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
