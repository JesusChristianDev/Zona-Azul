'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import type { OrderTracking } from '@/lib/types'

export default function SeguimientoPage() {
  const params = useParams()
  const router = useRouter()
  const { userId } = useAuth()
  const orderId = params.id as string
  const [tracking, setTracking] = useState<OrderTracking | null>(null)
  const [trackingHistory, setTrackingHistory] = useState<OrderTracking[]>([])
  const [orderStatus, setOrderStatus] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [eta, setEta] = useState<string>('')

  useEffect(() => {
    if (orderId) {
      loadTracking()
      // Polling cada 5 segundos para actualizar tracking
      const interval = setInterval(loadTracking, 5000)
      return () => clearInterval(interval)
    }
  }, [orderId])

  const loadTracking = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/tracking`)
      if (!response.ok) {
        throw new Error('Error al cargar seguimiento')
      }

      const data = await response.json()
      setTracking(data.current)
      setTrackingHistory(data.history || [])
      setOrderStatus(data.order_status)

      // Calcular ETA
      if (data.current?.estimated_delivery_time) {
        const etaDate = new Date(data.current.estimated_delivery_time)
        const now = new Date()
        const minutes = Math.round((etaDate.getTime() - now.getTime()) / (1000 * 60))
        
        if (minutes > 0) {
          setEta(`${minutes} minutos`)
        } else if (minutes === 0) {
          setEta('Llegando ahora')
        } else {
          setEta('Tiempo estimado pasado')
        }
      } else {
        setEta('No disponible')
      }
    } catch (error: any) {
      console.error('Error loading tracking:', error)
      setError(error.message || 'Error al cargar seguimiento')
    } finally {
      setLoading(false)
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'preparando': 'Preparando',
      'en_camino': 'En camino',
      'entregado': 'Entregado',
      'cancelado': 'Cancelado',
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'entregado':
        return 'bg-green-100 text-green-800'
      case 'en_camino':
        return 'bg-blue-100 text-blue-800'
      case 'preparando':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelado':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando seguimiento...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
        <button
          onClick={() => router.push('/suscriptor/pedidos')}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
        >
          Volver a Pedidos
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seguimiento del Pedido</h1>
          <p className="text-sm text-gray-600 mt-1">Pedido #{orderId.slice(0, 8)}</p>
        </div>
        <button
          onClick={() => router.push('/suscriptor/pedidos')}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
        >
          Volver
        </button>
      </header>

      {/* Estado actual */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Estado Actual</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(orderStatus)}`}>
            {getStatusText(orderStatus)}
          </span>
        </div>

        {tracking && (
          <div className="space-y-4">
            {tracking.location_latitude && tracking.location_longitude && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Ubicación del Repartidor</p>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    📍 Lat: {tracking.location_latitude.toFixed(6)}, Lng: {tracking.location_longitude.toFixed(6)}
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${tracking.location_latitude},${tracking.location_longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm mt-2 inline-block"
                  >
                    Ver en Google Maps →
                  </a>
                </div>
              </div>
            )}

            {tracking.estimated_delivery_time && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Tiempo Estimado de Llegada</p>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-lg font-semibold text-blue-900">{eta}</p>
                  <p className="text-xs text-blue-700 mt-1">
                    {new Date(tracking.estimated_delivery_time).toLocaleString('es-ES')}
                  </p>
                </div>
              </div>
            )}

            {tracking.updated_by && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Última Actualización</p>
                <p className="text-sm text-gray-600">
                  {new Date(tracking.created_at).toLocaleString('es-ES')}
                </p>
              </div>
            )}
          </div>
        )}

        {!tracking && (
          <div className="text-center py-8 text-gray-500">
            <p>El seguimiento aún no está disponible.</p>
            <p className="text-sm mt-2">Se actualizará cuando el repartidor inicie la entrega.</p>
          </div>
        )}
      </div>

      {/* Historial de tracking */}
      {trackingHistory.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Historial de Seguimiento</h2>
          <div className="space-y-3">
            {trackingHistory.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex items-start gap-4 p-4 rounded-lg ${
                  index === trackingHistory.length - 1
                    ? 'bg-primary/5 border-2 border-primary'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                      {getStatusText(entry.status)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(entry.created_at).toLocaleString('es-ES')}
                    </span>
                  </div>
                  {entry.location_latitude && entry.location_longitude && (
                    <p className="text-xs text-gray-600 mt-1">
                      📍 {entry.location_latitude.toFixed(4)}, {entry.location_longitude.toFixed(4)}
                    </p>
                  )}
                  {entry.estimated_delivery_time && (
                    <p className="text-xs text-gray-600 mt-1">
                      ⏰ ETA: {new Date(entry.estimated_delivery_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


