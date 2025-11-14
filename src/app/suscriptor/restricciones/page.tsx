'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import ActionButton from '@/components/ui/ActionButton'
import ToastMessage from '@/components/ui/ToastMessage'
import EmptyState from '@/components/ui/EmptyState'

interface DietaryRestriction {
  id: string
  user_id: string
  restriction_type: 'allergy' | 'intolerance' | 'preference' | 'religious' | 'medical'
  restriction_name: string
  severity: 'mild' | 'moderate' | 'severe' | 'critical'
  description?: string
  created_at: string
  updated_at: string
}

export default function RestriccionesPage() {
  const { userId } = useAuth()
  const [restrictions, setRestrictions] = useState<DietaryRestriction[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedRestriction, setSelectedRestriction] = useState<DietaryRestriction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    restriction_type: 'preference' as 'allergy' | 'intolerance' | 'preference' | 'religious' | 'medical',
    restriction_name: '',
    severity: 'moderate' as 'mild' | 'moderate' | 'severe' | 'critical',
    description: '',
  })

  useEffect(() => {
    if (userId) {
      loadRestrictions()
    }
  }, [userId])

  const loadRestrictions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/dietary-restrictions?user_id=${userId}`)
      if (!response.ok) throw new Error('Error al cargar restricciones')
      
      const data = await response.json()
      setRestrictions(data)
    } catch (error: any) {
      console.error('Error loading restrictions:', error)
      setError(error.message || 'Error al cargar restricciones')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.restriction_name.trim()) {
      setError('Debes especificar el nombre de la restricción')
      return
    }

    try {
      const response = await fetch('/api/dietary-restrictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          ...formData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear restricción')
      }

      setSuccess('Restricción creada correctamente')
      loadRestrictions()
      setIsCreateModalOpen(false)
      setFormData({
        restriction_type: 'preference',
        restriction_name: '',
        severity: 'moderate',
        description: '',
      })
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error creating restriction:', error)
      setError(error.message || 'Error al crear restricción')
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleUpdate = async () => {
    if (!selectedRestriction || !formData.restriction_name.trim()) {
      setError('Debes especificar el nombre de la restricción')
      return
    }

    try {
      const response = await fetch('/api/dietary-restrictions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restriction_id: selectedRestriction.id,
          restriction_name: formData.restriction_name,
          severity: formData.severity,
          description: formData.description,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar restricción')
      }

      setSuccess('Restricción actualizada correctamente')
      loadRestrictions()
      setIsEditModalOpen(false)
      setSelectedRestriction(null)
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error updating restriction:', error)
      setError(error.message || 'Error al actualizar restricción')
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleDelete = async (restrictionId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta restricción?')) return

    try {
      const response = await fetch(`/api/dietary-restrictions?restriction_id=${restrictionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar restricción')
      }

      setSuccess('Restricción eliminada correctamente')
      loadRestrictions()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error deleting restriction:', error)
      setError(error.message || 'Error al eliminar restricción')
      setTimeout(() => setError(null), 5000)
    }
  }

  const getTypeText = (type: string) => {
    const types = {
      allergy: 'Alergia',
      intolerance: 'Intolerancia',
      preference: 'Preferencia',
      religious: 'Religiosa',
      medical: 'Médica',
    }
    return types[type as keyof typeof types] || type
  }

  const getSeverityBadge = (severity: string) => {
    const badges = {
      mild: 'bg-green-100 text-green-800',
      moderate: 'bg-yellow-100 text-yellow-800',
      severe: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    }
    return badges[severity as keyof typeof badges] || 'bg-gray-100 text-gray-800'
  }

  const getSeverityText = (severity: string) => {
    const texts = {
      mild: 'Leve',
      moderate: 'Moderada',
      severe: 'Severa',
      critical: 'Crítica',
    }
    return texts[severity as keyof typeof texts] || severity
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando restricciones...</p>
        </div>
      </div>
    )
  }

  const plusIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
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
        title="Mis Restricciones Alimentarias"
        description="Gestiona tus alergias, intolerancias y preferencias alimentarias"
        action={
          <ActionButton onClick={() => setIsCreateModalOpen(true)} icon={plusIcon}>
            Agregar Restricción
          </ActionButton>
        }
      />

      {/* Lista de restricciones */}
      {restrictions.length === 0 ? (
        <EmptyState
          title="No tienes restricciones registradas"
          message="Agrega una restricción alimentaria para personalizar tu menú."
          action={
            <ActionButton onClick={() => setIsCreateModalOpen(true)} icon={plusIcon}>
              Agregar Primera Restricción
            </ActionButton>
          }
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {restrictions.map((restriction) => (
              <div key={restriction.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{restriction.restriction_name}</h3>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getTypeText(restriction.restriction_type)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityBadge(restriction.severity)}`}>
                        {getSeverityText(restriction.severity)}
                      </span>
                    </div>
                    {restriction.description && (
                      <p className="text-sm text-gray-600 mt-1">{restriction.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedRestriction(restriction)
                        setFormData({
                          restriction_type: restriction.restriction_type,
                          restriction_name: restriction.restriction_name,
                          severity: restriction.severity,
                          description: restriction.description || '',
                        })
                        setIsEditModalOpen(true)
                      }}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(restriction.id)}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal crear restricción */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setFormData({
            restriction_type: 'preference',
            restriction_name: '',
            severity: 'moderate',
            description: '',
          })
        }}
        title="Agregar Restricción Alimentaria"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Restricción
            </label>
            <select
              value={formData.restriction_type}
              onChange={(e) => setFormData({ ...formData, restriction_type: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="allergy">Alergia</option>
              <option value="intolerance">Intolerancia</option>
              <option value="preference">Preferencia</option>
              <option value="religious">Religiosa</option>
              <option value="medical">Médica</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Restricción <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.restriction_name}
              onChange={(e) => setFormData({ ...formData, restriction_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ej: Gluten, Lactosa, Vegano, etc."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severidad
            </label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="mild">Leve</option>
              <option value="moderate">Moderada</option>
              <option value="severe">Severa</option>
              <option value="critical">Crítica</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción (opcional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Detalles adicionales sobre esta restricción..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false)
                setFormData({
                  restriction_type: 'preference',
                  restriction_name: '',
                  severity: 'moderate',
                  description: '',
                })
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreate}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Crear Restricción
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal editar restricción */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedRestriction(null)
        }}
        title="Editar Restricción Alimentaria"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Restricción <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.restriction_name}
              onChange={(e) => setFormData({ ...formData, restriction_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severidad
            </label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="mild">Leve</option>
              <option value="moderate">Moderada</option>
              <option value="severe">Severa</option>
              <option value="critical">Crítica</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción (opcional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false)
                setSelectedRestriction(null)
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleUpdate}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Actualizar Restricción
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}


