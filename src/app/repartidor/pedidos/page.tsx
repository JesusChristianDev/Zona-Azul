"use client"

import { useState, useEffect } from 'react'
import Modal from '../../../components/ui/Modal'
import { useAuth } from '../../../hooks/useAuth'
import { getUserData, setUserData } from '../../../lib/storage'
import { getSubscribers, getSubscriberAddress, getSubscriberInstructions } from '../../../lib/subscribers'
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

interface Delivery {
  id: string
  customerId: string
  customer: string
  customerEmail: string
  address: string
  schedule: string
  instructions: string
  status: 'asignado' | 'en_camino' | 'entregado' | 'incidencia'
}

// Mapear estados del admin a estados del repartidor
const mapAdminStatusToDelivery = (adminStatus: string): Delivery['status'] => {
  const statusMap: Record<string, Delivery['status']> = {
    'Preparando': 'asignado',
    'En camino': 'en_camino',
    'Entregado': 'entregado',
    'Cancelado': 'asignado', // Los cancelados no se muestran, pero por si acaso
  }
  return statusMap[adminStatus] || 'asignado'
}

// Convertir pedido del admin a formato Delivery del repartidor
const convertAdminOrderToDelivery = (adminOrder: AdminOrder): Delivery => {
  const schedules = ['13:15', '14:00', '14:45', '15:30', '16:00']
  const scheduleIndex = parseInt(adminOrder.id.slice(-1)) || 0

  return {
    id: adminOrder.id,
    customerId: adminOrder.customerId,
    customer: adminOrder.customer,
    customerEmail: adminOrder.customerEmail,
    address: getSubscriberAddress(adminOrder.customerId),
    schedule: schedules[scheduleIndex % schedules.length] || '13:00',
    instructions: getSubscriberInstructions(adminOrder.customerId),
    status: mapAdminStatusToDelivery(adminOrder.status),
  }
}

export default function RepartidorPedidosPage() {
  const { userId } = useAuth()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [previousDeliveries, setPreviousDeliveries] = useState<Delivery[]>([])
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
  const [incidentDescription, setIncidentDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Función para cargar pedidos desde admin
  const loadDeliveries = () => {
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

        // Convertir a formato Delivery
        const deliveries = validOrders.map(convertAdminOrderToDelivery)

        // Mantener estados personalizados del repartidor (incidencias) desde localStorage
        const storedDeliveries = getUserData<Delivery[]>('zona_azul_deliveries', userId, [])
        let finalDeliveries: Delivery[] = []

        if (storedDeliveries && storedDeliveries.length > 0) {
          // Preservar incidencias reportadas
          finalDeliveries = deliveries.map((delivery) => {
            const stored = storedDeliveries.find((d) => d.id === delivery.id)
            if (stored && stored.status === 'incidencia') {
              return stored // Mantener la incidencia
            }
            return delivery
          })
        } else {
          finalDeliveries = deliveries
        }

        // Detectar nuevos pedidos asignados
        if (previousDeliveries.length > 0 && document.hidden) {
          const newDeliveries = finalDeliveries.filter(
            (current) => !previousDeliveries.some((prev) => prev.id === current.id)
          )

          newDeliveries.forEach((delivery) => {
            NotificationHelpers.newOrderAssigned(delivery.customer, '/repartidor/pedidos', userId)
          })
        }

        setPreviousDeliveries(finalDeliveries)
        setDeliveries(finalDeliveries)
      } catch (error) {
        console.error('Error loading deliveries from admin:', error)
        setDeliveries([])
      }
    } else {
      setDeliveries([])
    }
  }

  useEffect(() => {
    if (!userId) return

    loadDeliveries()

    // Escuchar cambios en localStorage para actualizar en tiempo real (otras pestañas)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'zona_azul_admin_orders' || (e.key && e.key.startsWith('zona_azul_deliveries_user_'))) {
        loadDeliveries()
      }
    }

    // Escuchar cambios locales (misma pestaña)
    const handleCustomDeliveriesChange = () => {
      loadDeliveries()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('zona_azul_deliveries_updated', handleCustomDeliveriesChange)
    window.addEventListener('zona_azul_admin_orders_updated', loadDeliveries) // Escuchar cambios en pedidos del admin
    window.addEventListener('zona_azul_subscribers_updated', loadDeliveries) // Escuchar nuevos suscriptores

    // Polling cada 2 segundos para detectar cambios (fallback)
    const interval = setInterval(loadDeliveries, 2000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('zona_azul_deliveries_updated', handleCustomDeliveriesChange)
      window.removeEventListener('zona_azul_admin_orders_updated', loadDeliveries)
      window.removeEventListener('zona_azul_subscribers_updated', loadDeliveries)
      clearInterval(interval)
    }
  }, [userId])

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
  const notifyDeliveriesUpdate = () => {
    window.dispatchEvent(new Event('zona_azul_deliveries_updated'))
  }

  const handleStartRoute = (deliveryId: string) => {
    // Actualizar en pedidos del admin
    const adminOrdersStr = localStorage.getItem('zona_azul_admin_orders')
    if (adminOrdersStr) {
      try {
        const adminOrders: AdminOrder[] = JSON.parse(adminOrdersStr)
        const updatedAdminOrders = adminOrders.map((order) =>
          order.id === deliveryId ? { ...order, status: 'En camino' } : order
        )
        localStorage.setItem('zona_azul_admin_orders', JSON.stringify(updatedAdminOrders))
        window.dispatchEvent(new Event('zona_azul_admin_orders_updated'))
      } catch (error) {
        console.error('Error updating admin order:', error)
      }
    }

    // Actualizar en deliveries del repartidor
    const updated = deliveries.map((d) =>
      d.id === deliveryId ? { ...d, status: 'en_camino' as const } : d
    )
    setDeliveries(updated)
    if (userId) {
      setUserData('zona_azul_deliveries', updated, userId)
      notifyDeliveriesUpdate()
    }
    showToast('Ruta iniciada')
  }

  const handleMarkDelivered = (deliveryId: string) => {
    if (confirm('¿Confirmas que este pedido fue entregado correctamente?')) {
      // Actualizar en pedidos del admin
      const adminOrdersStr = localStorage.getItem('zona_azul_admin_orders')
      if (adminOrdersStr) {
        try {
          const adminOrders: AdminOrder[] = JSON.parse(adminOrdersStr)
          const updatedAdminOrders = adminOrders.map((order) =>
            order.id === deliveryId ? { ...order, status: 'Entregado', eta: '—' } : order
          )
          localStorage.setItem('zona_azul_admin_orders', JSON.stringify(updatedAdminOrders))
          window.dispatchEvent(new Event('zona_azul_admin_orders_updated'))
        } catch (error) {
          console.error('Error updating admin order:', error)
        }
      }

      // Actualizar en deliveries del repartidor
      const updated = deliveries.map((d) =>
        d.id === deliveryId ? { ...d, status: 'entregado' as const } : d
      )
      setDeliveries(updated)
      if (userId) {
        setUserData('zona_azul_deliveries', updated, userId)
        notifyDeliveriesUpdate()
      }
      showToast('Pedido marcado como entregado')
    }
  }

  const handleReportIncident = (delivery: Delivery) => {
    setSelectedDelivery(delivery)
    setIncidentDescription('')
    setIsIncidentModalOpen(true)
  }

  const handleSubmitIncident = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDelivery) return

    if (!incidentDescription.trim()) {
      setError('Por favor describe la incidencia')
      return
    }

    const updated = deliveries.map((d) =>
      d.id === selectedDelivery.id ? { ...d, status: 'incidencia' as const } : d
    )
    setDeliveries(updated)
    if (userId) {
      setUserData('zona_azul_deliveries', updated, userId)
      notifyDeliveriesUpdate()
    }
    setIsIncidentModalOpen(false)
    setSelectedDelivery(null)
    showToast('Incidencia reportada correctamente')
  }

  const getStatusBadge = (status: Delivery['status']) => {
    const badges = {
      asignado: 'bg-accent/10 text-accent',
      en_camino: 'bg-highlight/10 text-highlight',
      entregado: 'bg-primary/10 text-primary',
      incidencia: 'bg-red-100 text-red-700',
    }
    return badges[status]
  }

  const getStatusLabel = (status: Delivery['status']) => {
    const labels = {
      asignado: 'Asignado',
      en_camino: 'En camino',
      entregado: 'Entregado',
      incidencia: 'Incidencia',
    }
    return labels[status]
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

      <header className="rounded-2xl border border-primary/20 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">Pedidos asignados</h2>
        <p className="mt-2 text-sm text-gray-600">
          Organiza tus entregas priorizando la experiencia del cliente. Marca incidencias para que el equipo de
          soporte actúe en minutos.
        </p>
      </header>

      <section className="space-y-3">
        {deliveries.map((delivery) => (
          <article key={delivery.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{delivery.customer}</h3>
                <p className="text-xs text-gray-500">{delivery.customerEmail}</p>
                <p className="text-xs uppercase tracking-wider text-gray-400 mt-1">{delivery.id}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(delivery.status)}`}>
                {getStatusLabel(delivery.status)}
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Dirección: <span className="font-medium text-gray-900">{delivery.address}</span>
            </p>
            <p className="mt-2 text-xs italic text-gray-500">Instrucciones: {delivery.instructions}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {delivery.status === 'asignado' && (
                <button
                  onClick={() => handleStartRoute(delivery.id)}
                  className="rounded-full border border-primary px-3 py-1 font-semibold text-primary hover:bg-primary hover:text-white transition"
                >
                  Iniciar ruta
                </button>
              )}
              {delivery.status === 'en_camino' && (
                <button
                  onClick={() => handleMarkDelivered(delivery.id)}
                  className="rounded-full border border-primary px-3 py-1 font-semibold text-primary hover:bg-primary hover:text-white transition"
                >
                  Marcar como entregado
                </button>
              )}
              {delivery.status !== 'entregado' && (
                <button
                  onClick={() => handleReportIncident(delivery)}
                  className="rounded-full border border-highlight px-3 py-1 font-semibold text-highlight hover:bg-highlight hover:text-white transition"
                >
                  Reportar incidencia
                </button>
              )}
            </div>
          </article>
        ))}
      </section>

      {/* Modal Reportar Incidencia */}
      <Modal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        title={`Reportar incidencia - ${selectedDelivery?.id}`}
      >
        <form onSubmit={handleSubmitIncident} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descripción de la incidencia</label>
            <textarea
              required
              value={incidentDescription}
              onChange={(e) => setIncidentDescription(e.target.value)}
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Describe qué ocurrió: dirección incorrecta, cliente no disponible, problema con el pedido..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsIncidentModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-highlight text-white rounded-lg hover:bg-highlight/90 transition"
            >
              Reportar incidencia
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
