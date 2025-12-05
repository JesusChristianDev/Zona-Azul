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

export default function AdminGruposPage() {
  const { userId } = useAuth()
  const [groups, setGroups] = useState<SubscriptionGroup[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<SubscriptionGroup | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    group_type: 'individual' as 'individual' | 'pareja' | 'familiar',
    primary_user_id: '',
    discount_percentage: '0',
  })
  const [memberFormData, setMemberFormData] = useState({
    user_id: '',
    meals_per_week: '7',
  })

  useEffect(() => {
    loadGroups()
    loadUsers()
  }, [])

  const loadGroups = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/subscription-groups')
      if (!response.ok) throw new Error('Error al cargar grupos')
      const data = await response.json()
      setGroups(data)
    } catch (error: any) {
      console.error('Error loading groups:', error)
      setError(error.message || 'Error al cargar grupos')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (!response.ok) throw new Error('Error al cargar usuarios')
      const data = await response.json()
      // La API devuelve { users: [...] }, extraer el array
      const usersArray = data.users || (Array.isArray(data) ? data : [])
      // Filtrar solo suscriptores
      const suscriptores = Array.isArray(usersArray) 
        ? usersArray.filter((u: any) => u.role === 'suscriptor')
        : []
      setUsers(suscriptores)
    } catch (error: any) {
      console.error('Error loading users:', error)
      setUsers([]) // En caso de error, establecer array vacío
    }
  }

  const handleCreateGroup = async () => {
    if (!formData.primary_user_id) {
      setError('Debes seleccionar un usuario principal')
      return
    }

    try {
      const response = await fetch('/api/subscription-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          discount_percentage: parseFloat(formData.discount_percentage),
          added_by: userId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear grupo')
      }

      setSuccess('Grupo creado correctamente')
      loadGroups()
      setIsCreateModalOpen(false)
      setFormData({
        name: '',
        group_type: 'individual',
        primary_user_id: '',
        discount_percentage: '0',
      })
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error creating group:', error)
      setError(error.message || 'Error al crear grupo')
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleUpdateDiscount = async (groupId: string, discount: number) => {
    try {
      // Actualizar descuento del grupo
      const response = await fetch('/api/subscription-groups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: groupId,
          discount_percentage: discount,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar descuento')
      }

      // Sincronizar pagos automáticamente
      const syncResponse = await fetch(`/api/subscription-groups/${groupId}/sync-payments`, {
        method: 'POST',
      })

      if (!syncResponse.ok) {
        console.warn('Warning: No se pudieron sincronizar los pagos automáticamente')
      }

      setSuccess('Descuento actualizado y pagos sincronizados correctamente')
      loadGroups()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error updating discount:', error)
      setError(error.message || 'Error al actualizar descuento')
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleAddMember = async (groupId: string) => {
    if (!memberFormData.user_id) {
      setError('Debes seleccionar un usuario')
      return
    }

    try {
      const response = await fetch(`/api/subscription-groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...memberFormData,
          meals_per_week: parseInt(memberFormData.meals_per_week),
          added_by: userId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al agregar miembro')
      }

      setSuccess('Miembro agregado correctamente')
      loadGroups()
      setIsMemberModalOpen(false)
      setMemberFormData({
        user_id: '',
        meals_per_week: '7',
      })
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error adding member:', error)
      setError(error.message || 'Error al agregar miembro')
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleRemoveMember = async (groupId: string, memberId: string) => {
    if (!confirm('¿Estás seguro de remover este miembro del grupo?')) return

    try {
      const response = await fetch(`/api/subscription-groups/${groupId}/members?member_id=${memberId}&removed_by=${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al remover miembro')
      }

      setSuccess('Miembro removido correctamente')
      loadGroups()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error removing member:', error)
      setError(error.message || 'Error al remover miembro')
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleSetPrimary = async (groupId: string, memberId: string, userId: string) => {
    try {
      const response = await fetch(`/api/subscription-groups/${groupId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          is_primary: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al designar usuario principal')
      }

      setSuccess('Usuario principal actualizado')
      loadGroups()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error setting primary:', error)
      setError(error.message || 'Error al designar usuario principal')
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

  const plusIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )

  if (loading) {
    return <LoadingState message="Cargando grupos..." />
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
        title="Gestión de Grupos de Suscripción"
        description="Crear y gestionar grupos (Individual, Pareja, Familiar)"
        action={
          <ActionButton onClick={() => setIsCreateModalOpen(true)} icon={plusIcon}>
            Crear Grupo
          </ActionButton>
        }
      />

      {/* Lista de grupos */}
      {groups.length === 0 ? (
        <EmptyState
          title="No hay grupos creados"
          message="Crea un grupo para comenzar."
          action={
            <ActionButton onClick={() => setIsCreateModalOpen(true)} icon={plusIcon}>
              Crear Primer Grupo
            </ActionButton>
          }
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {groups.map((group) => (
              <div key={group.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {group.name || `Grupo ${getGroupTypeText(group.group_type)}`}
                      </h3>
                      <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                        {getGroupTypeText(group.group_type)}
                      </span>
                      {!group.is_active && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      Descuento: {group.discount_percentage}%
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={group.discount_percentage}
                      onChange={(e) => {
                        const newDiscount = parseFloat(e.target.value) || 0
                        handleUpdateDiscount(group.id, newDiscount)
                      }}
                      className="w-24 px-3 py-1 border border-gray-300 rounded-lg text-sm"
                      placeholder="Descuento %"
                    />
                    <span className="text-sm text-gray-600">%</span>
                  </div>
                </div>

                {/* Miembros del grupo */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Miembros:</h4>
                  {group.subscription_group_members && group.subscription_group_members.length > 0 ? (
                    <div className="space-y-2">
                      {group.subscription_group_members
                        .filter((m: any) => !m.removed_at)
                        .map((member: any) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-medium text-gray-900">
                                {member.users?.name || member.user_id}
                              </p>
                              <p className="text-xs text-gray-500">
                                {member.meals_per_week} comidas/semana
                              </p>
                            </div>
                            {member.is_primary && (
                              <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                                Principal
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {!member.is_primary && (
                              <ActionButton
                                onClick={() => handleSetPrimary(group.id, member.id, member.user_id)}
                                variant="muted"
                                size="sm"
                              >
                                Hacer Principal
                              </ActionButton>
                            )}
                            <ActionButton
                              onClick={() => handleRemoveMember(group.id, member.id)}
                              variant="soft-danger"
                              size="sm"
                            >
                              Remover
                            </ActionButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No hay miembros en este grupo</p>
                  )}
                  <ActionButton
                    onClick={() => {
                      setSelectedGroup(group)
                      setIsMemberModalOpen(true)
                    }}
                    variant="muted"
                    size="sm"
                    className="mt-2"
                  >
                    + Agregar Miembro
                  </ActionButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal crear grupo */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setFormData({
            name: '',
            group_type: 'individual',
            primary_user_id: '',
            discount_percentage: '0',
          })
        }}
        title="Crear Grupo de Suscripción"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Grupo (opcional)
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ej: Familia García"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Grupo
            </label>
            <select
              value={formData.group_type}
              onChange={(e) => setFormData({ ...formData, group_type: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="individual">Individual</option>
              <option value="pareja">Pareja</option>
              <option value="familiar">Familiar</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuario Principal <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.primary_user_id}
              onChange={(e) => setFormData({ ...formData, primary_user_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
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
              Descuento (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.discount_percentage}
              onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <ActionButton
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              variant="muted-outline"
              fullWidth
            >
              Cancelar
            </ActionButton>
            <ActionButton
              type="button"
              onClick={handleCreateGroup}
              fullWidth
            >
              Crear Grupo
            </ActionButton>
          </div>
        </div>
      </Modal>

      {/* Modal agregar miembro */}
      <Modal
        isOpen={isMemberModalOpen}
        onClose={() => {
          setIsMemberModalOpen(false)
          setMemberFormData({
            user_id: '',
            meals_per_week: '7',
          })
          setSelectedGroup(null)
        }}
        title="Agregar Miembro al Grupo"
        size="md"
      >
        {selectedGroup && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuario <span className="text-red-500">*</span>
              </label>
              <select
                value={memberFormData.user_id}
                onChange={(e) => setMemberFormData({ ...memberFormData, user_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">Seleccionar usuario...</option>
                {users
                  .filter((u) => 
                    !selectedGroup.subscription_group_members?.some((m: any) => 
                      m.user_id === u.id && !m.removed_at
                    )
                  )
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comidas por Semana
              </label>
              <input
                type="number"
                min="1"
                max="21"
                value={memberFormData.meals_per_week}
                onChange={(e) => setMemberFormData({ ...memberFormData, meals_per_week: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <ActionButton
                type="button"
                onClick={() => {
                  setIsMemberModalOpen(false)
                  setMemberFormData({
                    user_id: '',
                    meals_per_week: '7',
                  })
                  setSelectedGroup(null)
                }}
                variant="muted-outline"
                fullWidth
              >
                Cancelar
              </ActionButton>
              <ActionButton
                type="button"
                onClick={() => handleAddMember(selectedGroup.id)}
                fullWidth
              >
                Agregar Miembro
              </ActionButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

