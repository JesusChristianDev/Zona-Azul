'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import LoadingState from '@/components/ui/LoadingState'
import EmptyState from '@/components/ui/EmptyState'
import type { Subscription, SubscriptionContract, SubscriptionPlan } from '@/lib/types'

export default function SuscripcionPage() {
  const { userId } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null)
  const [contract, setContract] = useState<SubscriptionContract | null>(null)
  const [loading, setLoading] = useState(true)
  const [isContractModalOpen, setIsContractModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      loadSubscription()
    }
  }, [userId])

  const loadSubscription = async () => {
    if (!userId) return

    setLoading(true)
    try {
      // Cargar suscripción actual (activa o pendiente)
      const response = await fetch(`/api/subscriptions?user_id=${userId}`)
      if (response.ok) {
        const data = await response.json()
        // Buscar suscripción activa o pendiente
        const activeSub = data.find((sub: Subscription) => 
          sub.status === 'active' || sub.status === 'pending_approval'
        )
        
        if (activeSub) {
          setSubscription(activeSub)
          
          // Cargar información del plan
          if (activeSub.plan_id) {
            try {
              const planResponse = await fetch(`/api/subscription-plans?id=${activeSub.plan_id}`)
              if (planResponse.ok) {
                const plans = await planResponse.json()
                if (plans && plans.length > 0) {
                  setPlan(plans[0])
                }
              }
            } catch (error) {
              console.error('Error loading plan:', error)
            }
          }

          // Cargar contrato si existe
          try {
            const contractResponse = await fetch(`/api/subscriptions/${activeSub.id}/contract`)
            if (contractResponse.ok) {
              const contractData = await contractResponse.json()
              setContract(contractData)
            }
          } catch (error) {
            console.error('Error loading contract:', error)
          }
        } else {
          setSubscription(null)
        }
      }
    } catch (error) {
      console.error('Error loading subscription:', error)
      setError('Error al cargar la información de suscripción')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      active: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        label: '✓ Activa'
      },
      pending_approval: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        label: '⏳ Pendiente de Aprobación'
      },
      expired: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        label: '✗ Expirada'
      },
      cancelled: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        label: '✗ Cancelada'
      }
    }

    const config = statusConfig[status] || statusConfig.pending_approval
    return (
      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  if (loading) {
    return <LoadingState message="Cargando información de suscripción..." />
  }

  // Si no tiene suscripción
  if (!subscription) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <EmptyState
          title="No tienes suscripción aún"
          message="El administrador asignará tu suscripción. Una vez asignada, podrás ver todos los detalles aquí."
          icon={
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Información:</strong> Las suscripciones son asignadas por el administrador después de una reunión presencial. 
            Recibirás una notificación cuando tu suscripción sea activada.
          </p>
        </div>
      </div>
    )
  }

  // Si tiene suscripción, mostrar detalles
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Header con estado */}
      <PageHeader
        title="Mi Suscripción"
        description={plan?.name || 'Plan de Suscripción'}
        badge={getStatusBadge(subscription.status)}
      />

      {/* Información del plan */}
      {plan && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalles del Plan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Duración</p>
              <p className="font-semibold text-gray-900">
                {plan.duration_months} {plan.duration_months === 1 ? 'mes' : 'meses'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Precio Total</p>
              <p className="font-semibold text-gray-900">
                €{subscription.price.toFixed(2)}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Comidas por Día</p>
              <p className="font-semibold text-gray-900">
                {subscription.meals_per_day === 2 ? 'Comida y Cena' : 'Comida o Cena'}
              </p>
            </div>
            {subscription.discount_applied > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Descuento Aplicado</p>
                <p className="font-semibold text-green-600">
                  -€{subscription.discount_applied.toFixed(2)}
                </p>
              </div>
            )}
            {plan.description && (
              <div className="p-4 bg-gray-50 rounded-lg sm:col-span-2">
                <p className="text-sm text-gray-500 mb-1">Descripción</p>
                <p className="text-gray-900">{plan.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fechas importantes */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Fechas Importantes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Fecha de Inicio</p>
            <p className="font-semibold text-gray-900">
              {formatDate(subscription.start_date)}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Fecha de Fin</p>
            <p className="font-semibold text-gray-900">
              {formatDate(subscription.end_date)}
            </p>
          </div>
          {subscription.created_at && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Fecha de Creación</p>
              <p className="font-semibold text-gray-900">
                {formatDate(subscription.created_at)}
              </p>
            </div>
          )}
          {subscription.nutricionista_approved_at && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Aprobada por Nutricionista</p>
              <p className="font-semibold text-gray-900">
                {formatDate(subscription.nutricionista_approved_at)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Estado de aprobación */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado de Aprobación</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                subscription.admin_approved ? 'bg-green-100' : 'bg-gray-200'
              }`}>
                {subscription.admin_approved ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">Aprobación Administrador</p>
                <p className="text-xs text-gray-500">
                  {subscription.admin_approved ? 'Aprobada' : 'Pendiente'}
                </p>
              </div>
            </div>
            {subscription.admin_approved_at && (
              <p className="text-xs text-gray-500">
                {formatDate(subscription.admin_approved_at)}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                subscription.nutricionista_approved ? 'bg-green-100' : 'bg-gray-200'
              }`}>
                {subscription.nutricionista_approved ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">Aprobación Nutricionista</p>
                <p className="text-xs text-gray-500">
                  {subscription.nutricionista_approved ? 'Aprobada' : 'Pendiente'}
                </p>
              </div>
            </div>
            {subscription.nutricionista_approved_at && (
              <p className="text-xs text-gray-500">
                {formatDate(subscription.nutricionista_approved_at)}
              </p>
            )}
          </div>
          {subscription.requires_consultation && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  subscription.consultation_completed ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  {subscription.consultation_completed ? (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">Consulta Requerida</p>
                  <p className="text-xs text-gray-500">
                    {subscription.consultation_completed ? 'Completada' : 'Pendiente'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones</h2>
        <div className="flex flex-wrap gap-3">
          {contract && (
            <button
              onClick={() => setIsContractModalOpen(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
            >
              Ver Contrato
            </button>
          )}
          {subscription.status === 'active' && (
            <div className="px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm font-medium">
              ✓ Tu suscripción está activa y funcionando
            </div>
          )}
          {subscription.status === 'pending_approval' && (
            <div className="px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200 text-sm font-medium">
              ⏳ Tu suscripción está pendiente de aprobación
            </div>
          )}
        </div>
      </div>

      {/* Modal de contrato */}
      {contract && (
        <Modal
          isOpen={isContractModalOpen}
          onClose={() => setIsContractModalOpen(false)}
          title="Contrato de Suscripción"
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                {contract.contract_text}
              </pre>
            </div>
            {contract.signed_at && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <strong>✓ Contrato firmado el:</strong> {formatDate(contract.signed_at)}
                </p>
              </div>
            )}
            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setIsContractModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
