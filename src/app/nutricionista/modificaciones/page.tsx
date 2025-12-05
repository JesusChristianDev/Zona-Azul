'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import SearchFilters from '@/components/ui/SearchFilters'
import ToastMessage from '@/components/ui/ToastMessage'
import LoadingState from '@/components/ui/LoadingState'
import EmptyState from '@/components/ui/EmptyState'
import type { MenuModification } from '@/lib/types'

export default function NutricionistaModificacionesPage() {
  const { userId } = useAuth()
  const [modifications, setModifications] = useState<MenuModification[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedModification, setSelectedModification] = useState<MenuModification | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isRecommendationModalOpen, setIsRecommendationModalOpen] = useState(false)
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('pending')
  const [recommendationText, setRecommendationText] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    loadModifications()
  }, [filterStatus])

  const loadModifications = async () => {
    try {
      setLoading(true)
      const url = filterStatus === 'all' 
        ? '/api/menu-modifications'
        : `/api/menu-modifications?status=${filterStatus}`
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Error al cargar modificaciones')
      
      const data = await response.json()
      setModifications(data)
    } catch (error: any) {
      console.error('Error loading modifications:', error)
      setError(error.message || 'Error al cargar modificaciones')
    } finally {
      setLoading(false)
    }
  }

  const handleAddRecommendation = async () => {
    if (!selectedModification || !recommendationText.trim()) {
      setError('Debes escribir una recomendación')
      return
    }

    try {
      const response = await fetch(`/api/menu-modifications/${selectedModification.id}/recommendation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nutritionist_id: userId,
          recommendation: recommendationText,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al agregar recomendación')
      }

      setSuccess('Recomendación agregada correctamente')
      loadModifications()
      setIsRecommendationModalOpen(false)
      setRecommendationText('')
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error adding recommendation:', error)
      setError(error.message || 'Error al agregar recomendación')
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleApproveOrReject = async (status: 'approved' | 'rejected') => {
    if (!selectedModification) return

    if (status === 'rejected' && !rejectionReason.trim()) {
      setError('Debes proporcionar un motivo para el rechazo')
      return
    }

    try {
      const response = await fetch(`/api/menu-modifications/${selectedModification.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved_by: userId,
          status,
          rejection_reason: status === 'rejected' ? rejectionReason : null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error al ${status === 'approved' ? 'aprobar' : 'rechazar'} modificación`)
      }

      setSuccess(`Modificación ${status === 'approved' ? 'aprobada' : 'rechazada'} correctamente`)
      loadModifications()
      setIsApproveModalOpen(false)
      setSelectedModification(null)
      setRejectionReason('')
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error processing modification:', error)
      setError(error.message || `Error al ${status === 'approved' ? 'aprobar' : 'rechazar'} modificación`)
      setTimeout(() => setError(null), 5000)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    }
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status: string) => {
    const texts = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada',
    }
    return texts[status as keyof typeof texts] || status
  }

  const getMealTypeText = (type: string) => {
    return type === 'lunch' ? 'Almuerzo' : type === 'dinner' ? 'Cena' : type
  }

  if (loading) {
    return <LoadingState message="Cargando modificaciones..." />
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
        title="Aprobar Modificaciones de Menú"
        description="Revisa y aprueba las solicitudes de modificación de menú de tus clientes"
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
              {['pending', 'approved', 'rejected', 'all'].map((status) => (
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

      {/* Lista de modificaciones */}
      {modifications.length === 0 ? (
        <EmptyState
          title={`No hay modificaciones ${filterStatus !== 'all' ? `con estado "${getStatusText(filterStatus)}"` : ''}`}
          message="No se encontraron modificaciones con los filtros seleccionados."
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {modifications.map((mod) => (
              <div
                key={mod.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        Usuario: {mod.user_id} • Día {mod.day_number} - {getMealTypeText(mod.meal_type)}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(mod.status)}`}>
                        {getStatusText(mod.status)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">Original:</span> {mod.original_meal?.name || 'N/A'} ({mod.original_meal?.calories} kcal)
                      </p>
                      <p>
                        <span className="font-medium">Solicitado:</span> {mod.requested_meal?.name || 'N/A'} ({mod.requested_meal?.calories} kcal)
                      </p>
                      {mod.nutritionist_recommendation && (
                        <p className="text-blue-700 bg-blue-50 p-2 rounded mt-2">
                          <span className="font-medium">Tu recomendación:</span> {mod.nutritionist_recommendation}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {mod.status === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedModification(mod)
                            setIsRecommendationModalOpen(true)
                          }}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                        >
                          Agregar Recomendación
                        </button>
                        <button
                          onClick={() => {
                            setSelectedModification(mod)
                            setIsApproveModalOpen(true)
                          }}
                          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm font-medium"
                        >
                          Revisar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal agregar recomendación */}
      <Modal
        isOpen={isRecommendationModalOpen}
        onClose={() => {
          setIsRecommendationModalOpen(false)
          setRecommendationText('')
        }}
        title="Agregar Recomendación"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recomendación
            </label>
            <textarea
              value={recommendationText}
              onChange={(e) => setRecommendationText(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Escribe tu recomendación para esta modificación..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Esta recomendación será visible para el usuario antes de aprobar o rechazar.
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsRecommendationModalOpen(false)
                setRecommendationText('')
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAddRecommendation}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Agregar Recomendación
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal aprobar/rechazar */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => {
          setIsApproveModalOpen(false)
          setSelectedModification(null)
          setRejectionReason('')
        }}
        title="Aprobar o Rechazar Modificación"
        size="md"
      >
        {selectedModification && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm">
                <span className="font-medium">Usuario:</span> {selectedModification.user_id}
              </p>
              <p className="text-sm">
                <span className="font-medium">Día:</span> {selectedModification.day_number} - {getMealTypeText(selectedModification.meal_type)}
              </p>
              <p className="text-sm">
                <span className="font-medium">Original:</span> {selectedModification.original_meal?.name} ({selectedModification.original_meal?.calories} kcal)
              </p>
              <p className="text-sm">
                <span className="font-medium">Solicitado:</span> {selectedModification.requested_meal?.name} ({selectedModification.requested_meal?.calories} kcal)
              </p>
              {selectedModification.nutritionist_recommendation && (
                <div className="mt-3 p-2 bg-blue-50 rounded">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Recomendación:</span> {selectedModification.nutritionist_recommendation}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo del rechazo (solo si rechazas)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Explica por qué se rechaza esta modificación..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsApproveModalOpen(false)
                  setSelectedModification(null)
                  setRejectionReason('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleApproveOrReject('rejected')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Rechazar
              </button>
              <button
                type="button"
                onClick={() => handleApproveOrReject('approved')}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
              >
                Aprobar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}


