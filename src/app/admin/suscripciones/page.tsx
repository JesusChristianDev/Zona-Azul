'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import SearchFilters from '@/components/ui/SearchFilters'
import ToastMessage from '@/components/ui/ToastMessage'
import LoadingState from '@/components/ui/LoadingState'
import EmptyState from '@/components/ui/EmptyState'
import ActionButton from '@/components/ui/ActionButton'
import type { Subscription, SubscriptionPlan } from '@/lib/types'

export default function AdminSuscripcionesPage() {
  const { userId } = useAuth()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [users, setUsers] = useState<any[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [createFormData, setCreateFormData] = useState({
    user_id: '',
    plan_id: '',
    meals_per_day: 1 as 1 | 2,
    group_type: 'individual' as 'individual' | 'pareja' | 'familiar',
  })

  useEffect(() => {
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

    const loadUsers = async () => {
      try {
        const response = await fetch('/api/users')
        if (response.ok) {
          const data = await response.json()
          const usersArray = data.users || (Array.isArray(data) ? data : [])
          const suscriptores = Array.isArray(usersArray) 
            ? usersArray.filter((u: any) => u.role === 'suscriptor')
            : []
          setUsers(suscriptores)
        }
      } catch (error) {
        console.error('Error loading users:', error)
      }
    }

    const loadPlans = async () => {
      try {
        const response = await fetch('/api/subscription-plans')
        if (response.ok) {
          const data = await response.json()
          setPlans(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        console.error('Error loading plans:', error)
      }
    }

    loadSubscriptions()
    loadUsers()
    loadPlans()
  }, [filterStatus])

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createFormData.user_id || !createFormData.plan_id) {
      setError('Debes seleccionar un usuario y un plan')
      return
    }

    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: createFormData.user_id,
          plan_id: createFormData.plan_id,
          meals_per_day: createFormData.meals_per_day,
          group_type: createFormData.group_type,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear suscripción')
      }

      setSuccess('Suscripción creada correctamente')
      // Recargar suscripciones
      const url = filterStatus === 'all' 
        ? '/api/subscriptions'
        : `/api/subscriptions?status=${filterStatus}`
      const reloadResponse = await fetch(url)
      if (reloadResponse.ok) {
        const reloadData = await reloadResponse.json()
        setSubscriptions(reloadData)
      }
      setIsCreateModalOpen(false)
      setCreateFormData({
        user_id: '',
        plan_id: '',
        meals_per_day: 1,
        group_type: 'individual',
      })
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error creating subscription:', error)
      setError(error.message || 'Error al crear suscripción')
      setTimeout(() => setError(null), 5000)
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
      // Recargar suscripciones
      const url = filterStatus === 'all' 
        ? '/api/subscriptions'
        : `/api/subscriptions?status=${filterStatus}`
      const reloadResponse = await fetch(url)
      if (reloadResponse.ok) {
        const reloadData = await reloadResponse.json()
        setSubscriptions(reloadData)
      }
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
    return <LoadingState message="Cargando suscripciones..." />
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
        title="Gestión de Suscripciones"
        description="Crear, aprobar y gestionar suscripciones de usuarios"
        action={
          <ActionButton
            onClick={() => setIsCreateModalOpen(true)}
          >
            Crear Suscripción
          </ActionButton>
        }
      />

      {/* Filtros */}
      <SearchFilters
        searchTerm=""
        onSearchChange={() => {}}
        searchPlaceholder=""
        filters={
          <div className="col-span-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por estado:</label>
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
        }
      />

      {/* Lista de suscripciones */}
      {subscriptions.length === 0 ? (
        <EmptyState
          title={`No hay suscripciones ${filterStatus !== 'all' ? `con estado "${getStatusText(filterStatus)}"` : ''}`}
          message="No se encontraron suscripciones con los filtros seleccionados."
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                        {(subscription as any).users?.name || subscription.user_id}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(subscription.status)}`}>
                        {getStatusText(subscription.status)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        Plan: {(subscription as any).subscription_plans?.name || subscription.plan_id} • 
                        Precio: €{subscription.price.toFixed(2)} • 
                        Comidas/día: {subscription.meals_per_day === 2 ? 'Comida y Cena' : 'Comida o Cena'}
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
        </div>
      )}

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
                <label className="block text-xs font-medium text-gray-500 mb-1">Comidas por Día</label>
                <p className="text-sm font-semibold text-gray-900">
                  {selectedSubscription.meals_per_day === 2 ? 'Comida y Cena (2)' : 'Comida o Cena (1)'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Plan</label>
                <p className="text-sm text-gray-900">
                  {(selectedSubscription as any).subscription_plans?.name || selectedSubscription.plan_id}
                  {(selectedSubscription as any).subscription_plans && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({(selectedSubscription as any).subscription_plans.duration_months} meses)
                    </span>
                  )}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Usuario</label>
                <p className="text-sm text-gray-900">
                  {(selectedSubscription as any).users?.name || selectedSubscription.user_id}
                  {(selectedSubscription as any).users && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({(selectedSubscription as any).users.email})
                    </span>
                  )}
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

      {/* Modal crear suscripción */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setCreateFormData({
            user_id: '',
            plan_id: '',
            meals_per_day: 1,
            group_type: 'individual',
          })
        }}
        title="Crear Nueva Suscripción"
        size="lg"
      >
        <form onSubmit={handleCreateSubscription} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuario <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={createFormData.user_id}
              onChange={(e) => setCreateFormData({ ...createFormData, user_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Seleccionar usuario...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan de Suscripción <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={createFormData.plan_id}
              onChange={(e) => setCreateFormData({ ...createFormData, plan_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Seleccionar plan...</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} ({plan.duration_months} meses) - €{plan.base_price.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comidas por Día <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={createFormData.meals_per_day}
              onChange={(e) => setCreateFormData({ ...createFormData, meals_per_day: parseInt(e.target.value) as 1 | 2 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="1">1 comida/día (Comida o Cena) - €150/mes</option>
              <option value="2">2 comidas/día (Comida y Cena) - €275/mes</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {createFormData.meals_per_day === 2 
                ? 'Precio especial: €275/mes (en lugar de €300/mes)'
                : 'Precio estándar: €150/mes por comida'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Grupo
            </label>
            <select
              value={createFormData.group_type}
              onChange={(e) => setCreateFormData({ ...createFormData, group_type: e.target.value as 'individual' | 'pareja' | 'familiar' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="individual">Individual</option>
              <option value="pareja">Pareja</option>
              <option value="familiar">Familiar</option>
            </select>
          </div>

          <div className="pt-4 border-t flex gap-3">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium"
            >
              Crear Suscripción
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}


