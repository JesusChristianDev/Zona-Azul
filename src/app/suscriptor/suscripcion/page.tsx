'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import LoadingState from '@/components/ui/LoadingState'
import EmptyState from '@/components/ui/EmptyState'
import ToastMessage from '@/components/ui/ToastMessage'
import SignaturePad from '@/components/contracts/SignaturePad'
import type { Subscription, SubscriptionContract, SubscriptionPlan } from '@/lib/types'

export default function SuscripcionPage() {
  const { userId } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null)
  const [contract, setContract] = useState<SubscriptionContract | null>(null)
  const [loading, setLoading] = useState(true)
  const [isContractModalOpen, setIsContractModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [isSigning, setIsSigning] = useState(false)

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

  const getStatusBadge = (status: string): string => {
    const statusConfig: Record<string, string> = {
      active: '✓ Activa',
      pending_approval: '⏳ Pendiente de Aprobación',
      expired: '✗ Expirada',
      cancelled: '✗ Cancelada'
    }

    return statusConfig[status] || statusConfig.pending_approval
  }

  const handleSignContract = async () => {
    if (!subscription || !signatureData) return

    setIsSigning(true)
    setError(null)
    setSuccess(null)

    try {
      // Obtener IP y User Agent para trazabilidad legal
      const ipResponse = await fetch('https://api.ipify.org?format=json').catch(() => null)
      const ipData = ipResponse ? await ipResponse.json() : { ip: 'unknown' }
      const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown'

      const response = await fetch(`/api/subscriptions/${subscription.id}/contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signed_by: userId,
          signature_method: 'electronic_signature',
          signature_image: signatureData,
          ip_address: ipData.ip || 'unknown',
          user_agent: userAgent,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al firmar contrato')
      }

      const updatedContract = await response.json()
      setContract(updatedContract)
      setSuccess('Contrato firmado correctamente')
      setSignatureData(null)
      
      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        setIsContractModalOpen(false)
        loadSubscription() // Recargar datos
      }, 2000)
    } catch (error: any) {
      console.error('Error signing contract:', error)
      setError(error.message || 'Error al firmar el contrato')
    } finally {
      setIsSigning(false)
    }
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
        <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
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
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-400 text-sm">
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
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Detalles del Plan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Duración</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {plan.duration_months} {plan.duration_months === 1 ? 'mes' : 'meses'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Precio Total</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                €{subscription.price.toFixed(2)}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Comidas por Día</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {subscription.meals_per_day === 2 ? 'Comida y Cena' : 'Comida o Cena'}
              </p>
            </div>
            {subscription.discount_applied > 0 && (
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Descuento Aplicado</p>
                <p className="font-semibold text-green-600 dark:text-green-400">
                  -€{subscription.discount_applied.toFixed(2)}
                </p>
              </div>
            )}
            {plan.description && (
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg sm:col-span-2">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Descripción</p>
                <p className="text-gray-900 dark:text-gray-100">{plan.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fechas importantes */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Fechas Importantes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Fecha de Inicio</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {formatDate(subscription.start_date)}
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Fecha de Fin</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {formatDate(subscription.end_date)}
            </p>
          </div>
          {subscription.created_at && (
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Fecha de Creación</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {formatDate(subscription.created_at)}
              </p>
            </div>
          )}
          {subscription.nutricionista_approved_at && (
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Aprobada por Nutricionista</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {formatDate(subscription.nutricionista_approved_at)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Estado de aprobación */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Estado de Aprobación</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
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
                <p className="font-medium text-gray-900 dark:text-gray-100">Aprobación Administrador</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
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
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
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
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Acciones</h2>
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

      {/* Modal de contrato */}
      {contract && (
        <Modal
          isOpen={isContractModalOpen}
          onClose={() => {
            setIsContractModalOpen(false)
            setSignatureData(null)
          }}
          title="Contrato de Suscripción"
          size="lg"
        >
          <div className="space-y-6">
            {/* Texto del contrato */}
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto border border-gray-200">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                {contract.contract_text}
              </pre>
            </div>

            {/* Estado de firma */}
            {contract.signed ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-900 mb-1">✓ Contrato Firmado</p>
                    <p className="text-xs text-green-700">
                      Firmado el: {formatDate(contract.signed_at)}
                    </p>
                    {contract.signature_method === 'electronic_signature' && (
                      <p className="text-xs text-green-600 mt-1">
                        Método: Firma electrónica
                      </p>
                    )}
                    {contract.signature_image && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <p className="text-xs text-green-700 mb-2">Firma capturada:</p>
                        <div className="overflow-x-auto">
                          <img
                            src={contract.signature_image}
                            alt="Firma del contrato"
                            className="max-w-full sm:max-w-xs border border-green-300 rounded bg-white p-2"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Componente de firma electrónica */}
                <div className="border-t border-b border-gray-200 py-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Firma Electrónica</h3>
                  <div className="w-full overflow-x-auto">
                    <SignaturePad
                      onSignatureChange={setSignatureData}
                      width={400}
                      height={150}
                      disabled={isSigning}
                    />
                  </div>
                </div>

                {/* Checkbox de aceptación */}
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <input
                    type="checkbox"
                    id="accept-terms"
                    checked={!!signatureData}
                    onChange={() => {}}
                    disabled={!signatureData}
                    className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <label htmlFor="accept-terms" className="text-sm text-gray-700 cursor-pointer">
                    <span className="font-medium">Acepto los términos y condiciones</span> del contrato de suscripción.
                    Al firmar, confirmo que he leído y comprendido todas las cláusulas establecidas.
                  </label>
                </div>

                {/* Botones de acción */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsContractModalOpen(false)
                      setSignatureData(null)
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSignContract}
                    disabled={!signatureData || isSigning}
                    className="w-full sm:w-auto px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSigning ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Firmando...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Firmar Contrato
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Botón de cerrar si ya está firmado */}
            {contract.signed && (
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsContractModalOpen(false)
                    setSignatureData(null)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
