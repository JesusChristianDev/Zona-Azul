'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import SearchFilters from '@/components/ui/SearchFilters'
import ToastMessage from '@/components/ui/ToastMessage'
import LoadingState from '@/components/ui/LoadingState'
import EmptyState from '@/components/ui/EmptyState'
import type { PaymentHistory } from '@/lib/types'

export default function AdminPagosPage() {
  const { userId } = useAuth()
  const [payments, setPayments] = useState<PaymentHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPayment, setSelectedPayment] = useState<PaymentHistory | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [editFormData, setEditFormData] = useState({
    payment_status: 'pending' as 'pending' | 'completed' | 'failed' | 'refunded',
    notes: '',
  })

  useEffect(() => {
    loadPayments()
  }, [filterStatus])

  const loadPayments = async () => {
    try {
      setLoading(true)
      const url = filterStatus === 'all' 
        ? '/api/payments'
        : `/api/payments?payment_status=${filterStatus}`
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Error al cargar pagos')
      
      const data = await response.json()
      setPayments(data)
    } catch (error: any) {
      console.error('Error loading payments:', error)
      setError(error.message || 'Error al cargar pagos')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePayment = async () => {
    if (!selectedPayment) return

    try {
      const response = await fetch('/api/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: selectedPayment.id,
          payment_status: editFormData.payment_status,
          notes: editFormData.notes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar pago')
      }

      setSuccess('Pago actualizado correctamente')
      loadPayments()
      setIsEditModalOpen(false)
      setIsDetailModalOpen(false)
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error updating payment:', error)
      setError(error.message || 'Error al actualizar pago')
      setTimeout(() => setError(null), 5000)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
    }
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status: string) => {
    const texts = {
      pending: 'Pendiente',
      completed: 'Completado',
      failed: 'Fallido',
      refunded: 'Reembolsado',
    }
    return texts[status as keyof typeof texts] || status
  }

  if (loading) {
    return <LoadingState message="Cargando pagos..." />
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
        title="Gestión de Pagos"
        description="Visualizar y actualizar estado de pagos (especialmente para planes anuales con cuotas externas)"
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
              {['all', 'pending', 'completed', 'failed', 'refunded'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === status
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'Todos' : getStatusText(status)}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* Lista de pagos */}
      {payments.length === 0 ? (
        <EmptyState
          title={`No hay pagos ${filterStatus !== 'all' ? `con estado "${getStatusText(filterStatus)}"` : ''}`}
          message="No se encontraron pagos con los filtros seleccionados."
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {payments.map((payment) => (
              <div
                key={payment.id}
                onClick={() => {
                  setSelectedPayment(payment)
                  setIsDetailModalOpen(true)
                }}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        Pago #{payment.id.slice(0, 8)}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(payment.payment_status)}`}>
                        {getStatusText(payment.payment_status)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        Usuario: {payment.user_id} • Monto: €{payment.amount.toFixed(2)}
                      </p>
                      <p>
                        Fecha: {new Date(payment.payment_date).toLocaleDateString('es-ES')} • 
                        Método: {payment.payment_method || 'N/A'}
                      </p>
                      {payment.installment_number && payment.total_installments && (
                        <p>
                          Cuota {payment.installment_number} de {payment.total_installments}
                        </p>
                      )}
                      {payment.external_payment_id && (
                        <p className="text-xs text-gray-500">
                          ID Externo: {payment.external_payment_id}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedPayment(payment)
                      setEditFormData({
                        payment_status: payment.payment_status,
                        notes: payment.notes || '',
                      })
                      setIsEditModalOpen(true)
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                  >
                    Actualizar Estado
                  </button>
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
          setSelectedPayment(null)
        }}
        title="Detalles de Pago"
        size="lg"
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(selectedPayment.payment_status)}`}>
                  {getStatusText(selectedPayment.payment_status)}
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Monto</label>
                <p className="text-sm font-semibold text-gray-900">
                  €{selectedPayment.amount.toFixed(2)}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de Pago</label>
                <p className="text-sm text-gray-900">
                  {new Date(selectedPayment.payment_date).toLocaleDateString('es-ES')}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Método</label>
                <p className="text-sm text-gray-900">
                  {selectedPayment.payment_method || 'N/A'}
                </p>
              </div>
              {selectedPayment.installment_number && selectedPayment.total_installments && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Cuota</label>
                    <p className="text-sm text-gray-900">
                      {selectedPayment.installment_number} de {selectedPayment.total_installments}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">ID Externo</label>
                    <p className="text-sm text-gray-900 font-mono text-xs">
                      {selectedPayment.external_payment_id || 'N/A'}
                    </p>
                  </div>
                </>
              )}
            </div>
            {selectedPayment.notes && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notas</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {selectedPayment.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal de edición */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedPayment(null)
        }}
        title="Actualizar Estado de Pago"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado del Pago
            </label>
            <select
              value={editFormData.payment_status}
              onChange={(e) => setEditFormData({
                ...editFormData,
                payment_status: e.target.value as any,
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="pending">Pendiente</option>
              <option value="completed">Completado</option>
              <option value="failed">Fallido</option>
              <option value="refunded">Reembolsado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={editFormData.notes}
              onChange={(e) => setEditFormData({
                ...editFormData,
                notes: e.target.value,
              })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Agregar notas sobre el estado del pago..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false)
                setSelectedPayment(null)
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleUpdatePayment}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Actualizar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}


