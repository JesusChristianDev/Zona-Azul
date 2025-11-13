'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import type { Subscription } from '@/lib/types'
import { formatAppointmentDateTime } from '@/lib/dateFormatters'

export default function AdminSuscripcionesPage() {
  const { userId } = useAuth()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    loadSubscriptions()
  }, [filterStatus])

  const loadSubscriptions = async () => {
    try {
      setLoading(true)
      const url = filterStatus === 'all' 
        ? '/api/subscriptions'
        : `/api/subscriptions?status=${filterStatus}`
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Error al cargar suscripciones')
      
      const data = await response.json()
      setSubscriptions(data)
    } catch (error: any) {
      console.error('Error loading subscriptions:', error)
      setError(error.message || 'Error al cargar suscripciones')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (subscriptionId: string, consultationCompleted: boolean = false) => {
    if (!userId) {
      setError('No se pudo identificar al usuario')
      return
    }

    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved_by: userId,
          role: 'admin',
          consultation_completed: consultationCompleted,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al aprobar suscripción')
      }

      setSuccess('Suscripción aprobada correctamente')
      loadSubscriptions()
      setIsDetailModalOpen(false)
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error approving subscription:', error)
      setError(error.message || 'Error al aprobar suscripción')
      setTimeout(() => setError(null), 5000)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending_approval: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      expired: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status: string) => {
    const texts = {
      pending_approval: 'Pendiente de Aprobación',
      active: 'Activa',
      expired: 'Expirada',
      cancelled: 'Cancelada',
    }
    return texts[status as keyof typeof texts] || status
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando suscripciones...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-700 text-sm">
          {success}
        </div>
      )}

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Suscripciones</h1>
          <p className="text-sm text-gray-600 mt-1">
            Aprobar y gestionar suscripciones de usuarios
          </p>
        </div>
      </header>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending_approval', 'active', 'expired', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'Todas' : getStatusText(status)}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de suscripciones */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {subscriptions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay suscripciones {filterStatus !== 'all' ? `con estado "${getStatusText(filterStatus)}"` : ''}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {subscriptions.map((subscription) => (
              <div
                key={subscription.id}
                onClick={() => {
                  setSelectedSubscription(subscription)
                  setIsDetailModalOpen(true)
                }}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {subscription.user_id}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(subscription.status)}`}>
                        {getStatusText(subscription.status)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        Plan: {subscription.plan_id} • Precio: €{subscription.price.toFixed(2)}
                      </p>
                      <p>
                        Admin: {subscription.admin_approved ? '✓ Aprobado' : '✗ Pendiente'} • 
                        Nutricionista: {subscription.nutricionista_approved ? '✓ Aprobado' : '✗ Pendiente'}
                      </p>
                      {subscription.start_date && (
                        <p>
                          Período: {new Date(subscription.start_date).toLocaleDateString('es-ES')} - 
                          {subscription.end_date ? ` ${new Date(subscription.end_date).toLocaleDateString('es-ES')}` : ' N/A'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {subscription.status === 'pending_approval' && !subscription.admin_approved && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleApprove(subscription.id, false)
                        }}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm font-medium"
                      >
                        Aprobar
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedSubscription(subscription)
                        setIsDetailModalOpen(true)
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                    >
                      Ver Detalles
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de detalles */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedSubscription(null)
        }}
        title="Detalles de Suscripción"
        size="lg"
      >
        {selectedSubscription && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(selectedSubscription.status)}`}>
                  {getStatusText(selectedSubscription.status)}
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Precio</label>
                <p className="text-sm font-semibold text-gray-900">
                  €{selectedSubscription.price.toFixed(2)}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Aprobación Admin</label>
                <p className="text-sm text-gray-900">
                  {selectedSubscription.admin_approved ? (
                    <span className="text-green-600">✓ Aprobado</span>
                  ) : (
                    <span className="text-yellow-600">✗ Pendiente</span>
                  )}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Aprobación Nutricionista</label>
                <p className="text-sm text-gray-900">
                  {selectedSubscription.nutricionista_approved ? (
                    <span className="text-green-600">✓ Aprobado</span>
                  ) : (
                    <span className="text-yellow-600">✗ Pendiente</span>
                  )}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Consulta Requerida</label>
                <p className="text-sm text-gray-900">
                  {selectedSubscription.requires_consultation ? 'Sí' : 'No'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Consulta Completada</label>
                <p className="text-sm text-gray-900">
                  {selectedSubscription.consultation_completed ? (
                    <span className="text-green-600">✓ Completada</span>
                  ) : (
                    <span className="text-yellow-600">✗ Pendiente</span>
                  )}
                </p>
              </div>
            </div>

            {selectedSubscription.start_date && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Período</label>
                <p className="text-sm text-gray-900">
                  {new Date(selectedSubscription.start_date).toLocaleDateString('es-ES')} - 
                  {selectedSubscription.end_date ? ` ${new Date(selectedSubscription.end_date).toLocaleDateString('es-ES')}` : ' N/A'}
                </p>
              </div>
            )}

            {selectedSubscription.status === 'pending_approval' && !selectedSubscription.admin_approved && (
              <div className="pt-4 border-t space-y-2">
                <button
                  onClick={() => handleApprove(selectedSubscription.id, false)}
                  className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium"
                >
                  Aprobar Suscripción
                </button>
                <button
                  onClick={() => handleApprove(selectedSubscription.id, true)}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                >
                  Aprobar y Marcar Consulta Completada
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}


