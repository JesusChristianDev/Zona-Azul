"use client"

import { useState, useEffect } from 'react'
import { getSubscribers } from '../../../lib/subscribers'

interface Order {
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

// Generar pedidos iniciales basados en suscriptores reales
function generateInitialOrders(): Order[] {
  const subscribers = getSubscribers()
  const statuses = ['Preparando', 'En camino', 'Entregado']
  const etas = ['20 min', '45 min', '—']
  const itemsOptions = [
    ['Bowl Vitalidad', 'Smoothie Verde'],
    ['Wrap Proteico', 'Infusión Antioxidante'],
    ['Ensalada Omega', 'Agua alcalina'],
    ['Pollo al horno con quinoa'],
  ]
  const totals = [16.4, 9.7, 12.5, 11.9]

  // Generar fechas distribuidas en los últimos 7 días de manera estable
  const now = new Date()
  const baseDate = new Date(now)
  baseDate.setHours(0, 0, 0, 0)

  return subscribers.map((subscriber, index) => {
    // Asignar fecha de manera estable basada en el índice
    // Distribuir en los últimos 7 días (0 = hoy, 1 = ayer, etc.)
    const daysAgo = index % 7
    const orderDate = new Date(baseDate)
    orderDate.setDate(orderDate.getDate() - daysAgo)
    orderDate.setHours(12, 0, 0, 0) // Hora del mediodía para evitar problemas de zona horaria
    
    return {
      id: `PED-0019${2 - index}`,
      customerId: subscriber.id,
      customer: subscriber.name,
      customerEmail: subscriber.email,
      role: 'Suscriptor',
      status: statuses[index % statuses.length] || 'Preparando',
      eta: etas[index % etas.length] || '30 min',
      channel: 'App PWA',
      items: itemsOptions[index % itemsOptions.length] || ['Plato del día'],
      total: totals[index % totals.length] || 10.0,
      createdAt: orderDate.toISOString(),
      date: orderDate.toISOString().split('T')[0],
    }
  })
}

const initialOrders = generateInitialOrders()

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Función para cargar pedidos
  const loadOrders = () => {
    const stored = localStorage.getItem('zona_azul_admin_orders')
    const subscribers = getSubscribers()
    const validSubscriberIds = new Set(subscribers.map((s) => s.id))
    const currentOrders = generateInitialOrders()
    
    if (stored) {
      const parsed = JSON.parse(stored)
      // Filtrar pedidos que tienen suscriptores válidos
      let validOrders = parsed.filter((o: Order) => validSubscriberIds.has(o.customerId))
      
      // Asegurar que todos los pedidos tengan fechas (migración para pedidos antiguos)
      const now = new Date()
      const baseDate = new Date(now)
      baseDate.setHours(0, 0, 0, 0)
      
      validOrders = validOrders.map((order: Order, index: number) => {
        if (!order.createdAt && !order.date) {
          // Asignar fecha estable basada en el índice del pedido
          const daysAgo = index % 7
          const orderDate = new Date(baseDate)
          orderDate.setDate(orderDate.getDate() - daysAgo)
          return {
            ...order,
            createdAt: orderDate.toISOString(),
            date: orderDate.toISOString().split('T')[0],
          }
        }
        return order
      })
      
      // NO crear pedidos automáticamente para nuevos suscriptores
      // Los pedidos solo se crearán cuando se asigne un plan o se generen manualmente
      setOrders(validOrders)
      localStorage.setItem('zona_azul_admin_orders', JSON.stringify(validOrders))
    } else {
      // Solo crear pedidos iniciales si ya existen suscriptores con planes asignados
      // Para nuevos suscriptores, no crear pedidos automáticamente
      setOrders([])
      localStorage.setItem('zona_azul_admin_orders', JSON.stringify([]))
    }
  }

  useEffect(() => {
    loadOrders()

    // Escuchar cambios en localStorage para actualizar en tiempo real (otras pestañas)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'zona_azul_admin_orders') {
        loadOrders()
      }
    }

    // Escuchar cambios locales (misma pestaña)
    const handleCustomOrdersChange = () => {
      loadOrders()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('zona_azul_admin_orders_updated', handleCustomOrdersChange)
    window.addEventListener('zona_azul_subscribers_updated', loadOrders) // Escuchar nuevos suscriptores

    // Polling cada 2 segundos para detectar cambios (fallback)
    const interval = setInterval(loadOrders, 2000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('zona_azul_admin_orders_updated', handleCustomOrdersChange)
      window.removeEventListener('zona_azul_subscribers_updated', loadOrders)
      clearInterval(interval)
    }
  }, [])

  const showToast = (message: string, isError = false) => {
    if (isError) {
      setError(message)
      setTimeout(() => setError(null), 5000)
    } else {
      setSuccess(message)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  // Notificar a otras pestañas/componentes que los pedidos fueron actualizados
  const notifyOrdersUpdate = () => {
    window.dispatchEvent(new Event('zona_azul_admin_orders_updated'))
  }

  const handleViewDetail = (order: Order) => {
    setSelectedOrder(order)
    setIsDetailModalOpen(true)
  }

  const handleChangeStatus = (orderId: string, newStatus: string) => {
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        const updatedOrder = { ...o, status: newStatus }
        
        // Si se marca como "Entregado" y no tiene fecha o la fecha es antigua, asignar fecha de hoy
        if (newStatus === 'Entregado') {
          const now = new Date()
          const today = new Date(now)
          today.setHours(12, 0, 0, 0) // Hora del mediodía para evitar problemas de zona horaria
          
          // Verificar si tiene fecha y si es de hoy o más reciente
          let hasValidDate = false
          if ((o as any).createdAt) {
            const orderDate = new Date((o as any).createdAt)
            orderDate.setHours(0, 0, 0, 0)
            const todayDate = new Date(now)
            todayDate.setHours(0, 0, 0, 0)
            hasValidDate = orderDate.getTime() === todayDate.getTime()
          } else if ((o as any).date) {
            const orderDate = new Date((o as any).date)
            orderDate.setHours(0, 0, 0, 0)
            const todayDate = new Date(now)
            todayDate.setHours(0, 0, 0, 0)
            hasValidDate = orderDate.getTime() === todayDate.getTime()
          }
          
          // Si no tiene fecha válida de hoy, asignar fecha de hoy
          if (!hasValidDate) {
            (updatedOrder as any).createdAt = today.toISOString()
            ;(updatedOrder as any).date = today.toISOString().split('T')[0]
          }
        }
        
        return updatedOrder
      }
      return o
    })
    
    setOrders(updated)
    localStorage.setItem('zona_azul_admin_orders', JSON.stringify(updated))
    notifyOrdersUpdate()
    showToast(`Estado actualizado a: ${newStatus}`)
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(updated.find((o) => o.id === orderId) || null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Entregado':
        return 'bg-primary/10 text-primary'
      case 'Preparando':
        return 'bg-highlight/10 text-highlight'
      case 'En camino':
        return 'bg-accent/10 text-accent'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-700 text-sm">
          {success}
        </div>
      )}

      <header className="rounded-2xl border border-highlight/30 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">Pedidos globales</h2>
        <p className="mt-2 text-sm text-gray-600">
          Supervisa pedidos en tiempo real e identifica cuellos de botella entre cocina, nutrición y reparto.
          Esta vista consolida datos de la app y puntos físicos.
        </p>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        {orders.map((order) => (
          <article key={order.id} className="rounded-2xl border border-gray-100 p-4 transition hover:border-primary/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Pedido {order.id}{' '}
                  <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    {order.channel}
                  </span>
                </h3>
                <p className="text-sm text-gray-500">
                  Cliente: <span className="font-semibold text-gray-900">{order.customer}</span> · Rol: {order.role}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
              <span>
                ETA: <strong className="text-gray-700">{order.eta}</strong>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleViewDetail(order)}
                  className="rounded-full border border-gray-200 px-3 py-1 font-medium text-gray-600 hover:border-primary hover:text-primary transition"
                >
                  Ver detalle
                </button>
                <select
                  value={order.status}
                  onChange={(e) => handleChangeStatus(order.id, e.target.value)}
                  className="rounded-full border border-gray-200 px-3 py-1 font-medium text-gray-600 hover:border-highlight hover:text-highlight transition bg-white text-xs"
                >
                  <option value="Preparando">Preparando</option>
                  <option value="En camino">En camino</option>
                  <option value="Entregado">Entregado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* Modal Detalle */}
      {isDetailModalOpen && selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsDetailModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Detalle del pedido</h2>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">ID del pedido</p>
                <p className="text-lg font-semibold text-gray-900">{selectedOrder.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Cliente</p>
                <p className="text-lg font-semibold text-gray-900">{selectedOrder.customer}</p>
                <p className="text-sm text-gray-600">{selectedOrder.customerEmail}</p>
                <p className="text-xs text-gray-500 mt-1">{selectedOrder.role}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Estado</p>
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(selectedOrder.status)}`}>
                  {selectedOrder.status}
                </span>
              </div>
              {selectedOrder.items && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Items</p>
                  <ul className="space-y-1">
                    {selectedOrder.items.map((item, index) => (
                      <li key={index} className="text-sm text-gray-700">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedOrder.total && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Total</p>
                  <p className="text-lg font-semibold text-primary">€{selectedOrder.total.toFixed(2)}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-500">Canal</p>
                <p className="text-sm text-gray-700">{selectedOrder.channel}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">ETA</p>
                <p className="text-sm text-gray-700">{selectedOrder.eta}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
