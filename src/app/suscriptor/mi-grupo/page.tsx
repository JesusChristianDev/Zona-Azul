'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import ActionButton from '@/components/ui/ActionButton'
import ToastMessage from '@/components/ui/ToastMessage'
import LoadingState from '@/components/ui/LoadingState'
import EmptyState from '@/components/ui/EmptyState'
import type { SubscriptionGroup, SubscriptionGroupMember } from '@/lib/types'

export default function MiGrupoPage() {
  const { userId } = useAuth()
  const [group, setGroup] = useState<SubscriptionGroup | null>(null)
  const [myMember, setMyMember] = useState<SubscriptionGroupMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    meals_per_week: '7',
  })

  useEffect(() => {
    if (userId) {
      loadMyGroup()
    }
  }, [userId])

  const loadMyGroup = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/subscription-groups?user_id=${userId}`)
      if (!response.ok) throw new Error('Error al cargar grupo')
      
      const data = await response.json()
      if (data && data.length > 0) {
        const myGroup = data[0]
        setGroup(myGroup)
        
        // Encontrar mi información como miembro
        const member = myGroup.subscription_group_members?.find(
          (m: any) => m.user_id === userId && !m.removed_at
        )
        if (member) {
          setMyMember(member)
          setFormData({
            meals_per_week: member.meals_per_week?.toString() || '7',
          })
        }
      } else {
        setGroup(null)
        setMyMember(null)
      }
    } catch (error: any) {
      console.error('Error loading group:', error)
      setError(error.message || 'Error al cargar información del grupo')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePreferences = async () => {
    if (!myMember || !group) return

    try {
      const response = await fetch(`/api/subscription-groups/${group.id}/members/${myMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meals_per_week: parseInt(formData.meals_per_week),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar preferencias')
      }

      setSuccess('Preferencias actualizadas correctamente')
      loadMyGroup()
      setIsEditModalOpen(false)
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error updating preferences:', error)
      setError(error.message || 'Error al actualizar preferencias')
      setTimeout(() => setError(null), 5000)
    }
  }

  const getGroupTypeText = (type: string) => {
    const texts = {
      individual: 'Individual',
      pareja: 'Pareja',
      familiar: 'Familiar',
    }
    return texts[type as keyof typeof texts] || type
  }

  if (loading) {
    return <LoadingState message="Cargando información del grupo..." />
  }

  if (!group || !myMember) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <EmptyState
          title="No estás en un grupo de suscripción"
          message="Si deberías estar en un grupo, contacta con el administrador."
        />
      </div>
    )
  }

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
        title="Mi Grupo de Suscripción"
        description="Gestiona tus preferencias y configuración personal"
      />

      {/* Información del grupo */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {group.name || `Grupo ${getGroupTypeText(group.group_type)}`}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Tipo: {getGroupTypeText(group.group_type)} • Descuento: {group.discount_percentage}%
            </p>
          </div>
          {myMember.is_primary && (
            <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
              Usuario Principal
            </span>
          )}
        </div>

        {/* Miembros del grupo */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Miembros del Grupo</h3>
          <div className="space-y-2">
            {group.subscription_group_members
              ?.filter((m: any) => !m.removed_at)
              .map((member: any) => (
              <div
                key={member.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  member.user_id === userId
                    ? 'bg-primary/10 border border-primary/20'
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      {member.users?.name || member.user_id}
                      {member.user_id === userId && ' (Tú)'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {member.meals_per_week} comidas/semana
                    </p>
                  </div>
                  {member.is_primary && (
                    <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded-full">
                      Principal
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mis preferencias */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Mis Preferencias</h2>
            <p className="text-sm text-gray-600 mt-1">
              Controla tu número de comidas y configuración personal
            </p>
          </div>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm font-medium"
          >
            Editar Preferencias
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Comidas por Semana</p>
              <p className="text-sm text-gray-600 mt-1">
                Número de comidas que recibirás cada semana
              </p>
            </div>
            <div className="text-2xl font-bold text-primary">
              {myMember.meals_per_week}
            </div>
          </div>
        </div>
      </div>

      {/* Información adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Información</h3>
        <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
          <li>Puedes modificar tu número de comidas por semana en cualquier momento.</li>
          <li>Los cambios se aplicarán en el próximo ciclo de menú semanal.</li>
          <li>El usuario principal del grupo puede gestionar la composición del grupo.</li>
          <li>Los descuentos del grupo son gestionados exclusivamente por el administrador.</li>
        </ul>
      </div>

      {/* Modal editar preferencias */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Mis Preferencias"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comidas por Semana
            </label>
            <input
              type="number"
              min="1"
              max="21"
              value={formData.meals_per_week}
              onChange={(e) => setFormData({ ...formData, meals_per_week: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-gray-500 mt-1">
              Puedes recibir entre 1 y 21 comidas por semana
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleUpdatePreferences}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}


