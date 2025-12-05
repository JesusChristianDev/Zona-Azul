"use client"

import { useState, useEffect } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import ToastMessage from '@/components/ui/ToastMessage'
import EmptyState from '@/components/ui/EmptyState'
import ActionButton from '@/components/ui/ActionButton'
import { getOrders } from '@/lib/api'
import { convertApiOrdersToFrontend, mapFrontendStatusToApi } from '@/lib/orderHelpers'
import { updateOrder } from '@/lib/api'

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
  createdAt?: string
  date?: string
}

// Ya no se generan pedidos iniciales, se obtienen de la API

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Función para cargar pedidos desde la API
  const loadOrders = async () => {
    try {
      const apiOrders = await getOrders()
      const frontendOrders = await convertApiOrdersToFrontend(apiOrders)
      setOrders(frontendOrders)
    } catch (error) {
      console.error('Error loading orders:', error)
      setOrders([])
    }
  }

  useEffect(() => {
    loadOrders()

    // Polling cada 5 segundos para actualizar pedidos
    const interval = setInterval(loadOrders, 5000)

    return () => {
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

  const handleViewDetail = (order: Order) => {
    setSelectedOrder(order)
    setIsDetailModalOpen(true)
  }

  const handleChangeStatus = async (orderId: string, newStatus: string) => {
    try {
      const apiStatus = mapFrontendStatusToApi(newStatus)
      const updateData: any = { status: apiStatus }
      
      // Si se marca como entregado, actualizar tiempo de entrega
      if (newStatus === 'Entregado') {
        updateData.actual_delivery_time = new Date().toISOString()
      }
      
      const updated = await updateOrder(orderId, updateData)
      
      if (updated) {
        // Recargar pedidos
        await loadOrders()
        showToast(`Estado actualizado a: ${newStatus}`)
        
        // Actualizar selectedOrder si es el mismo
        if (selectedOrder?.id === orderId) {
          const apiOrders = await getOrders()
          const frontendOrders = await convertApiOrdersToFrontend(apiOrders)
          const updatedOrder = frontendOrders.find((o) => o.id === orderId)
          if (updatedOrder) {
            setSelectedOrder(updatedOrder)
          }
        }
      } else {
        showToast('Error al actualizar el estado', true)
      }
    } catch (error: any) {
      console.error('Error updating order status:', error)
      showToast(error.message || 'Error al actualizar el estado', true)
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
    <div className="space-y-4 sm:space-y-6">
      {/* Mensajes */}
      {error && (
        <ToastMessage
          message={error}
          type="error"
          onClose={() => setError(null)}
        />
      )}
      {success && (
        <ToastMessage
          message={success}
          type="success"
          onClose={() => setSuccess(null)}
        />
      )}

      {/* Header */}
      <PageHeader
        title="Pedidos globales"
        description="Supervisa pedidos en tiempo real e identifica cuellos de botella entre cocina, nutrición y reparto. Esta vista consolida datos de la app y puntos físicos."
      />

      {orders.length === 0 ? (
        <EmptyState
          title="No hay pedidos"
          message="No se han registrado pedidos aún."
        />
      ) : (
        <section className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm space-y-4">
          {orders.map((order) => (
          <article key={order.id} className="rounded-2xl border border-gray-100 dark:border-slate-700 p-4 transition hover:border-primary/40 dark:hover:border-primary/60 bg-white dark:bg-slate-900/60">
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
                <ActionButton
                  onClick={() => handleViewDetail(order)}
                  variant="muted-outline"
                  size="sm"
                >
                  Ver detalle
                </ActionButton>
                <select
                  value={order.status}
                  onChange={(e) => handleChangeStatus(order.id, e.target.value)}
                  className="rounded-full border border-gray-200 dark:border-slate-700 px-3 py-1 font-medium text-gray-600 dark:text-gray-200 hover:border-highlight hover:text-highlight transition bg-white dark:bg-slate-800 text-xs"
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
      )}

      {/* Modal Detalle */}
      {isDetailModalOpen && selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsDetailModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Detalle del pedido</h2>
              <ActionButton
                onClick={() => setIsDetailModalOpen(false)}
                variant="ghost"
                size="sm"
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </ActionButton>
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
