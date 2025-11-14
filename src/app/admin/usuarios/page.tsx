"use client"

import { useState, useEffect, useRef } from 'react'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import SearchFilters from '@/components/ui/SearchFilters'
import ToastMessage from '@/components/ui/ToastMessage'
import LoadingState from '@/components/ui/LoadingState'
import { User } from '@/lib/types'
import { assignPlanToSubscriber, hasPlanAssigned } from '@/lib/planAssignment'
import { useUsers, useOrders } from '@/hooks/useApi'
import * as api from '@/lib/api'
import { getSubscribers } from '@/lib/subscribers'

interface TeamMember extends User {
  clients: number
  status: string
}

export default function AdminUsuariosPage() {
  const { users: apiUsers, loading: usersLoading, error: usersError, refetch: refetchUsers } = useUsers()
  const { orders: apiOrders } = useOrders()
  const [activeTab, setActiveTab] = useState<'team' | 'clients'>('team')
  const [users, setUsers] = useState<TeamMember[]>([])
  const [filteredUsers, setFilteredUsers] = useState<TeamMember[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('todos')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAssignPlanModalOpen, setIsAssignPlanModalOpen] = useState(false)
  const [isAssignClientsModalOpen, setIsAssignClientsModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null)
  const [availablePlans, setAvailablePlans] = useState<any[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [isCreatingFromClientsTab, setIsCreatingFromClientsTab] = useState(false)
  const [availableSubscribers, setAvailableSubscribers] = useState<User[]>([])
  const [subscribersLoading, setSubscribersLoading] = useState(false)
  const [subscriberToNutricionista, setSubscriberToNutricionista] = useState<Map<string, { nutricionistaId: string; nutricionistaName: string }>>(new Map())
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'suscriptor' as User['role'],
    clients: 0,
    status: 'Activa',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [usersWithPlans, setUsersWithPlans] = useState<Set<string>>(new Set())
  const recentlyDeletedPlansRef = useRef<Set<string>>(new Set()) // Para evitar que el polling recargue planes recién eliminados

  // Función para contar clientes asignados reales desde la API
  const countAssignedClients = async (userId: string, role: string): Promise<number> => {
    if (role === 'nutricionista') {
      try {
        const clients = await api.getNutricionistaClients(userId)
        return clients.length
      } catch (error) {
        console.error('Error counting clients:', error)
        return 0
      }
    } else if (role === 'repartidor') {
      // Contar pedidos activos del repartidor desde la API
      try {
        const orders = await api.getOrders()
        const repartidorOrders = orders.filter(
          (order: any) => order.repartidor_id === userId &&
          order.status !== 'cancelado' && order.status !== 'entregado'
        )
        const uniqueCustomerIds = new Set(repartidorOrders.map((order: any) => order.user_id))
        return uniqueCustomerIds.size
      } catch (error) {
        console.error('Error counting repartidor clients:', error)
        return 0
      }
    }
    return 0
  }

  // Convertir usuarios de API a TeamMember con conteo de clientes
  useEffect(() => {
    const loadUsersWithClients = async () => {
      if (apiUsers && apiUsers.length > 0) {
        const usersWithClientsPromises = apiUsers.map(async (user: any) => {
          const clientsCount = await countAssignedClients(user.id, user.role)
          return {
            id: user.id,
            email: user.email,
            password: '', // No incluir password en el frontend
            role: user.role,
            name: user.name,
            createdAt: user.created_at,
            clients: clientsCount,
            status: 'Activa',
          } as TeamMember
        })
        const usersWithClients = await Promise.all(usersWithClientsPromises)
        setUsers(usersWithClients)
      } else if (!usersLoading) {
        setUsers([])
      }
    }
    loadUsersWithClients()
  }, [apiUsers, usersLoading, apiOrders])

  // Filtrar y buscar usuarios
  useEffect(() => {
    let filtered = [...users]

    // Filtrar por tab activo (team o clients)
    if (activeTab === 'team') {
      filtered = filtered.filter(user => user.role !== 'suscriptor')
    } else {
      filtered = filtered.filter(user => user.role === 'suscriptor')
    }

    // Filtrar por rol (solo en tab team)
    if (activeTab === 'team' && filterRole !== 'todos') {
      filtered = filtered.filter(user => user.role === filterRole)
    }

    // El filtro por estado de suscripción se maneja en /admin/suscripciones

    // Buscar por nombre, email o rol
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term)
      )
    }

    setFilteredUsers(filtered)
  }, [users, activeTab, filterRole, searchTerm])

  // Cargar planes completos disponibles (sin asignar) de todos los nutricionistas
  useEffect(() => {
    const loadAvailablePlans = async () => {
      try {
        // Obtener todos los nutricionistas
        const nutritionists = await api.getNutritionists()
        
        // Obtener planes sin asignar de cada nutricionista
        const allPlans: any[] = []
        for (const nutritionist of nutritionists) {
          const plans = await api.getMealPlansByNutricionista(nutritionist.id)
          allPlans.push(...plans)
        }
        
        setAvailablePlans(allPlans)
      } catch (error) {
        console.error('Error loading available plans:', error)
        setAvailablePlans([])
      }
    }
    
    loadAvailablePlans()

    // Polling cada 30 segundos para actualizar planes
    const interval = setInterval(loadAvailablePlans, 30000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  // Cargar información de planes asignados para suscriptores
  useEffect(() => {
    const loadPlansInfo = async () => {
      if (!apiUsers || apiUsers.length === 0) return
      
      const subscribers = apiUsers.filter((u: any) => u.role === 'suscriptor')
      if (subscribers.length === 0) return

      try {
        const plansPromises = subscribers.map(async (subscriber: any) => {
          try {
            // Si el plan fue eliminado recientemente, no verificar
            if (recentlyDeletedPlansRef.current.has(subscriber.id)) {
              return null
            }
            const hasPlan = await hasPlanAssigned(subscriber.id)
            return hasPlan ? subscriber.id : null
          } catch (error) {
            console.error(`Error checking plan for subscriber ${subscriber.id}:`, error)
            return null
          }
        })
        
        const usersWithPlansArray = await Promise.all(plansPromises)
        const usersWithPlansSet = new Set(usersWithPlansArray.filter(Boolean) as string[])
        setUsersWithPlans(usersWithPlansSet)
      } catch (error) {
        console.error('Error loading plans info:', error)
      }
    }
    
    loadPlansInfo()
    
    // Polling cada 60 segundos para actualizar información
    const interval = setInterval(loadPlansInfo, 60000)
    
    return () => {
      clearInterval(interval)
    }
  }, [apiUsers])

  const showToast = (message: string, isError = false) => {
    if (isError) {
      setError(message)
      setTimeout(() => setError(null), 5000)
    } else {
      setSuccess(message)
      setTimeout(() => setSuccess(null), 3000)
    }
  }


  const handleCreate = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'suscriptor',
      clients: 0,
      status: 'Activa',
    })
    setIsCreatingFromClientsTab(true) // Por defecto, si se llama desde fuera, asumir que es cliente
    setError(null)
    setIsCreateModalOpen(true)
  }

  const handleEdit = (user: TeamMember) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // No mostrar password existente
      role: user.role,
      clients: user.clients,
      status: user.status,
    })
    setError(null)
    setIsEditModalOpen(true)
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) {
      return
    }

    const userToDelete = users.find((u) => u.id === userId)

    try {
      await api.deleteUser(userId)
      await refetchUsers() // Recargar usuarios
      
      // Si se eliminó un suscriptor, notificar a otros roles para limpiar sus datos
      if (userToDelete?.role === 'suscriptor') {
        window.dispatchEvent(new Event('zona_azul_subscribers_updated'))
      }
      
      showToast('Usuario eliminado correctamente')
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar usuario', true)
    }
  }

  const handleAssignPlan = (user: TeamMember) => {
    if (user.role !== 'suscriptor') {
      showToast('Solo se pueden asignar planes a suscriptores', true)
      return
    }
    setSelectedUser(user)
    setSelectedPlanId('')
    setError(null)
    setIsAssignPlanModalOpen(true)
  }

  const handleAssignClients = async (nutricionista: TeamMember) => {
    if (nutricionista.role !== 'nutricionista') {
      showToast('Solo se pueden asignar clientes a nutricionistas', true)
      return
    }
    setSelectedUser(nutricionista)
    setSubscribersLoading(true)
    
    // Cargar suscriptores disponibles
    try {
      const subscribers = await getSubscribers()
      setAvailableSubscribers(subscribers)
    } catch (error) {
      console.error('Error loading subscribers:', error)
      setAvailableSubscribers([])
    } finally {
      setSubscribersLoading(false)
    }
    
    // Cargar clientes actualmente asignados al nutricionista desde la API
    try {
      const currentClients = await api.getNutricionistaClients(nutricionista.id)
      setSelectedClientIds(currentClients.map((c: any) => c.client_id))
    } catch (error) {
      console.error('Error loading clients:', error)
      setSelectedClientIds([])
    }
    
    // Cargar asignaciones de todos los nutricionistas para mostrar qué clientes están asignados a otros
    const loadNutricionistaAssignments = async () => {
      try {
        const allUsers = await api.getUsers()
        const allNutricionistas = allUsers.filter((u: any) => u.role === 'nutricionista')
        const assignmentMap = new Map<string, { nutricionistaId: string; nutricionistaName: string }>()
        
        for (const nutri of allNutricionistas) {
          try {
            const clients = await api.getNutricionistaClients(nutri.id)
            clients.forEach((client: any) => {
              if (client.client_id) {
                assignmentMap.set(client.client_id, {
                  nutricionistaId: nutri.id,
                  nutricionistaName: nutri.name,
                })
              }
            })
          } catch (error) {
            console.error(`Error checking clients for nutricionista ${nutri.id}:`, error)
          }
        }
        
        setSubscriberToNutricionista(assignmentMap)
      } catch (error) {
        console.error('Error loading nutricionista assignments:', error)
        setSubscriberToNutricionista(new Map())
      }
    }
    
    loadNutricionistaAssignments()
    
    setError(null)
    setIsAssignClientsModalOpen(true)
  }

  const handleSubmitAssignClients = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || selectedUser.role !== 'nutricionista') return

    try {
      // Obtener todos los nutricionistas para desasignar de otros
      const allUsers = await api.getUsers()
      const allNutricionistas = allUsers.filter((u: any) => u.role === 'nutricionista')
      
      // Remover estos clientes de otros nutricionistas (reasignación)
      for (const nutri of allNutricionistas) {
        if (nutri.id === selectedUser.id) continue // No modificar el nutricionista actual
        
        // Obtener clientes actuales del nutricionista
        const currentClients = await api.getNutricionistaClients(nutri.id)
        
        // Filtrar los clientes que ahora están asignados al nutricionista actual
        const clientsToRemove = currentClients.filter((client: any) => 
          selectedClientIds.includes(client.client_id)
        )
        
        // Remover cada cliente
        for (const client of clientsToRemove) {
          await api.removeClientFromNutricionista(nutri.id, client.client_id)
        }
      }

      // Asignar clientes al nutricionista actual
      for (const clientId of selectedClientIds) {
        await api.assignClientToNutricionista(selectedUser.id, clientId)
      }
      
      // Recargar usuarios para actualizar el contador
      await refetchUsers()
      
      setIsAssignClientsModalOpen(false)
      setSelectedUser(null)
      setSelectedClientIds([])
      showToast(`Clientes asignados correctamente a ${selectedUser.name}`)
    } catch (error: any) {
      console.error('Error assigning clients:', error)
      showToast('Error al asignar clientes', true)
    }
  }

  const handleSubmitAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || !selectedPlanId) {
      setError('Por favor selecciona un plan')
      return
    }

    const plan = availablePlans.find((p) => p.id === selectedPlanId)
    if (!plan) {
      setError('Plan no encontrado')
      return
    }

    // assignPlanToSubscriber espera un planId (string)
    const success = await assignPlanToSubscriber(selectedUser.id, selectedPlanId, 'Admin')
    if (success) {
      // Actualizar el estado de planes asignados
      setUsersWithPlans(prev => new Set([...Array.from(prev), selectedUser.id]))
      showToast(`Plan "${plan.name}" asignado correctamente a ${selectedUser.name}`)
      setIsAssignPlanModalOpen(false)
      setSelectedUser(null)
      setSelectedPlanId('')
    } else {
      showToast('Error al asignar el plan', true)
    }
  }

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name || !formData.email || !formData.password) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    // Si se está creando desde la pestaña de clientes, forzar rol suscriptor
    const finalRole = isCreatingFromClientsTab ? 'suscriptor' : formData.role

    try {
      await api.createUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: finalRole,
      })

      await refetchUsers() // Recargar usuarios
      
      // Si se creó un nuevo suscriptor, notificar a otros roles
      if (finalRole === 'suscriptor') {
        window.dispatchEvent(new Event('zona_azul_subscribers_updated'))
      }
      
      setIsCreateModalOpen(false)
      setIsCreatingFromClientsTab(false)
      showToast(isCreatingFromClientsTab ? 'Cliente creado correctamente' : 'Usuario creado correctamente')
    } catch (err: any) {
      setError(err.message || 'Error al crear usuario')
      showToast(err.message || 'Error al crear usuario', true)
    }
  }

  const handleRemovePlan = async (userId: string, userName: string) => {
    if (!confirm(`¿Estás seguro de quitar el plan asignado a ${userName}?`)) {
      return
    }

    try {
      // Verificar primero si realmente tiene un plan antes de intentar eliminarlo
      const currentPlan = await api.getPlan(userId)
      if (!currentPlan || !currentPlan.id) {
        showToast('El usuario no tiene un plan asignado', true)
        // Actualizar estado local de todas formas
        setUsersWithPlans(prev => {
          const updated = new Set(prev)
          updated.delete(userId)
          return updated
        })
        return
      }

      const success = await api.deleteUserPlan(userId)
      
      if (!success) {
        showToast('Error al quitar el plan', true)
        return
      }
      
      // Marcar como eliminado recientemente para evitar que el polling lo recargue
      recentlyDeletedPlansRef.current.add(userId)
      
      // Actualizar estado local inmediatamente - remover de usersWithPlans
      setUsersWithPlans(prev => {
        const updated = new Set(prev)
        updated.delete(userId)
        return updated
      })
      
      showToast(`Plan de ${userName} eliminado correctamente`)
      
      // Remover de recentlyDeletedPlansRef después de 10 segundos
      setTimeout(() => {
        recentlyDeletedPlansRef.current.delete(userId)
      }, 10000)
      
      // Verificar después de un delay que el plan fue eliminado
      setTimeout(async () => {
        try {
          // Verificar directamente si el usuario todavía tiene plan
          const planAfterDelete = await api.getPlan(userId)
          if (planAfterDelete && planAfterDelete.id) {
            console.warn(`Plan todavía existe para usuario ${userId} después de eliminarlo`)
            // Si todavía existe, recargar todos los planes
            const subscribers = apiUsers?.filter((u: any) => u.role === 'suscriptor') || []
            const plansSet = new Set<string>()
            
            for (const subscriber of subscribers) {
              try {
                const plan = await api.getPlan(subscriber.id)
                if (plan && plan.id) {
                  plansSet.add(subscriber.id)
                }
              } catch (error) {
                console.error('Error checking plan for subscriber:', subscriber.id, error)
              }
            }
            
            setUsersWithPlans(plansSet)
          } else {
            // Confirmar que el usuario ya no tiene plan
            setUsersWithPlans(prev => {
              const updated = new Set(prev)
              updated.delete(userId)
              return updated
            })
          }
        } catch (error) {
          console.error('Error verifying plan deletion:', error)
        }
      }, 1500)
    } catch (err: any) {
      console.error('Error removing plan:', err)
      showToast(err.message || 'Error al quitar el plan', true)
    }
  }

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedUser) return

    // Validar email único (excepto el usuario actual)
    if (
      users.some(
        (u) => u.id !== selectedUser.id && u.email.toLowerCase() === formData.email.toLowerCase()
      )
    ) {
      setError('Este email ya está registrado')
      return
    }

    try {
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
      }

      if (formData.password) {
        updateData.password = formData.password
      }

      await api.updateUser(selectedUser.id, updateData)
      await refetchUsers() // Recargar usuarios

      setIsEditModalOpen(false)
      setSelectedUser(null)
      showToast('Usuario actualizado correctamente')
    } catch (err: any) {
      setError(err.message || 'Error al actualizar usuario')
      showToast(err.message || 'Error al actualizar usuario', true)
    }
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

      {/* Estados de carga */}
      {usersLoading && <LoadingState message="Cargando usuarios..." />}
      
      {usersError && (
        <ToastMessage
          message={`Error al cargar usuarios: ${usersError}`}
          type="error"
        />
      )}

      {/* Header */}
      <PageHeader
        title="Usuarios y roles"
        description="Coordina permisos y asignaciones para cada perfil. Esta vista se integra con el flujo de onboarding digital y seguimiento de desempeño."
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => {
            setActiveTab('team')
            setFilterRole('todos')
            setSearchTerm('')
          }}
          className={`py-2 px-4 text-sm font-medium transition-colors ${
            activeTab === 'team'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Equipo
        </button>
        <button
          onClick={() => {
            setActiveTab('clients')
            setSearchTerm('')
          }}
          className={`py-2 px-4 text-sm font-medium transition-colors ${
            activeTab === 'clients'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Clientes
        </button>
      </div>

      {/* Búsqueda y filtros */}
      {!usersLoading && users.length > 0 && (
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder={`Buscar por nombre, email${activeTab === 'team' ? ' o rol' : ''}...`}
          filters={
            activeTab === 'team' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                >
                  <option value="todos">Todos</option>
                  <option value="admin">Administrador</option>
                  <option value="nutricionista">Nutricionista</option>
                  <option value="repartidor">Repartidor</option>
                </select>
              </div>
            ) : null
          }
          resultsCount={
            (searchTerm || (activeTab === 'team' && filterRole !== 'todos'))
              ? {
                  showing: filteredUsers.length,
                  total: users.filter(u => activeTab === 'team' ? u.role !== 'suscriptor' : u.role === 'suscriptor').length
                }
              : undefined
          }
        />
      )}

      {activeTab === 'team' && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Equipo Zona Azul</h3>
              <p className="text-sm text-gray-500">
                Administradores, nutricionistas y repartidores. Roles operativos del sistema.
              </p>
            </div>
            <button
              onClick={() => {
                setFormData({
                  name: '',
                  email: '',
                  password: '',
                  role: 'nutricionista', // Default para equipo
                  clients: 0,
                  status: 'Activa',
                })
                setIsCreatingFromClientsTab(false) // Marcar que se está creando desde la pestaña de equipo
                setError(null)
                setIsCreateModalOpen(true)
              }}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition"
            >
              Agregar al equipo
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            {filteredUsers
              .filter((member) => member.role !== 'suscriptor')
              .map((member) => (
                <article
                  key={member.id}
                  className="rounded-2xl border border-gray-200 p-4 transition hover:border-primary/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">
                        {member.email} ·{' '}
                        <span className="capitalize">
                          {member.role === 'admin'
                            ? 'Administrador'
                            : member.role === 'nutricionista'
                            ? 'Nutricionista'
                            : 'Repartidor'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                    <span>Clientes asignados: {member.clients}</span>
                    <div className="flex gap-2">
                      {member.role === 'nutricionista' && (
                        <button
                          onClick={() => handleAssignClients(member)}
                          className="rounded-full border border-accent px-3 py-1 font-medium text-accent hover:bg-accent hover:text-white transition"
                        >
                          Asignar clientes
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(member)}
                        className="rounded-full border border-gray-200 px-3 py-1 font-medium text-gray-600 hover:border-primary hover:text-primary transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="rounded-full border border-gray-200 px-3 py-1 font-medium text-gray-600 hover:border-highlight hover:text-highlight transition"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            {filteredUsers.filter((member) => member.role !== 'suscriptor').length === 0 && (
              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl p-6">
                {users.filter((member) => member.role !== 'suscriptor').length === 0 ? (
                  <>
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-600 mb-1">No hay miembros del equipo registrados aún.</p>
                  </>
                ) : (
                  <>
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-600 mb-1">No se encontraron miembros del equipo</p>
                    <p className="text-xs text-gray-500">Intenta ajustar los filtros o la búsqueda</p>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'clients' && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Clientes (Suscriptores)</h3>
              <p className="text-sm text-gray-500">
                Usuarios con suscripción activa. Acceden a planes nutricionales y seguimiento personalizado.
              </p>
            </div>
            <button
              onClick={() => {
                setFormData({
                  name: '',
                  email: '',
                  password: '',
                  role: 'suscriptor', // Siempre suscriptor para clientes
                  clients: 0, // Los suscriptores no tienen clientes
                  status: 'Activa',
                })
                setIsCreatingFromClientsTab(true) // Marcar que se está creando desde la pestaña de clientes
                setError(null)
                setIsCreateModalOpen(true)
              }}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition"
            >
              Agregar cliente
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            {filteredUsers
              .filter((member) => member.role === 'suscriptor')
              .map((member) => (
                <article
                  key={member.id}
                  className="rounded-2xl border border-gray-200 p-4 transition hover:border-accent/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.email} · Suscriptor</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className={`font-medium ${usersWithPlans.has(member.id) ? 'text-green-600' : 'text-gray-500'}`}>
                      Plan: {usersWithPlans.has(member.id) ? '✓ Asignado' : 'No asignado'}
                    </span>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleAssignPlan(member)}
                        className="rounded-full border border-primary px-3 py-1 font-medium text-primary hover:bg-primary hover:text-white transition text-xs"
                      >
                        {usersWithPlans.has(member.id) ? 'Cambiar plan' : 'Asignar plan'}
                      </button>
                      {usersWithPlans.has(member.id) && (
                        <button
                          onClick={() => handleRemovePlan(member.id, member.name)}
                          className="rounded-full border border-red-300 px-3 py-1 font-medium text-red-600 hover:bg-red-50 transition text-xs"
                        >
                          Quitar plan
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(member)}
                        className="rounded-full border border-gray-200 px-3 py-1 font-medium text-gray-600 hover:border-accent hover:text-accent transition text-xs"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="rounded-full border border-gray-200 px-3 py-1 font-medium text-gray-600 hover:border-red-500 hover:text-red-500 transition text-xs"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            {filteredUsers.filter((member) => member.role === 'suscriptor').length === 0 && (
              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl p-6">
                {users.filter((member) => member.role === 'suscriptor').length === 0 ? (
                  <>
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-600 mb-1">No hay clientes registrados aún.</p>
                  </>
                ) : (
                  <>
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-600 mb-1">No se encontraron clientes</p>
                    <p className="text-xs text-gray-500">Intenta ajustar los filtros o la búsqueda</p>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Modal Crear Usuario */}
      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => {
          setIsCreateModalOpen(false)
          setIsCreatingFromClientsTab(false)
        }} 
        title={isCreatingFromClientsTab ? "Crear nuevo cliente" : "Crear nuevo usuario"}
      >
        <form onSubmit={handleSubmitCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre completo</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ej: María García"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="usuario@zonaazul.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Mínimo 6 caracteres"
              minLength={6}
            />
          </div>
          {!isCreatingFromClientsTab && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="nutricionista">Nutricionista</option>
                <option value="repartidor">Repartidor</option>
                <option value="admin">Administrador</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Los suscriptores se crean desde la pestaña "Clientes"
              </p>
            </div>
          )}
          {isCreatingFromClientsTab && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
              <input
                type="text"
                value="Suscriptor"
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                Los clientes siempre son suscriptores
              </p>
            </div>
          )}
          {!isCreatingFromClientsTab && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Clientes asignados</label>
              <input
                type="number"
                min="0"
                value={formData.clients}
                onChange={(e) => setFormData({ ...formData, clients: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50"
                disabled
                title="Este valor se calcula automáticamente según las asignaciones reales"
              />
              <p className="text-xs text-gray-500 mt-1">
                Se calcula automáticamente según las asignaciones reales
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Activa">Activa</option>
              <option value="Inactiva">Inactiva</option>
              <option value="Entrenamiento">Entrenamiento</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false)
                setIsCreatingFromClientsTab(false)
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              {isCreatingFromClientsTab ? 'Crear cliente' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Asignar Plan */}
      <Modal
        isOpen={isAssignPlanModalOpen}
        onClose={() => {
          setIsAssignPlanModalOpen(false)
          setSelectedUser(null)
          setSelectedPlanId('')
        }}
        title={`Asignar plan a ${selectedUser?.name || ''}`}
        size="md"
      >
        <form onSubmit={handleSubmitAssignPlan} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">{error}</div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecciona un plan nutricional
            </label>
            {availablePlans.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">
                No hay planes disponibles. Los nutricionistas pueden crear planes desde su dashboard.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availablePlans.map((plan) => (
                  <label
                    key={plan.id}
                    className={`block p-3 border rounded-lg cursor-pointer transition ${
                      selectedPlanId === plan.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-primary/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={plan.id}
                      checked={selectedPlanId === plan.id}
                      onChange={(e) => setSelectedPlanId(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{plan.name}</p>
                        {plan.description && (
                          <p className="text-xs text-gray-600 mt-1">{plan.description}</p>
                        )}
                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                          {plan.total_calories && <span>• {plan.total_calories} kcal/día</span>}
                          {plan.days && <span>• {plan.days.length} días</span>}
                        </div>
                      </div>
                      {selectedPlanId === plan.id && (
                        <svg className="w-5 h-5 text-primary ml-2" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setIsAssignPlanModalOpen(false)
                setSelectedUser(null)
                setSelectedPlanId('')
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!selectedPlanId || availablePlans.length === 0}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Asignar plan
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Usuario */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar usuario">
        <form onSubmit={handleSubmitEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre completo</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nueva contraseña (dejar vacío para mantener la actual)
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Mínimo 6 caracteres"
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="suscriptor">Suscriptor</option>
              <option value="nutricionista">Nutricionista</option>
              <option value="repartidor">Repartidor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Clientes asignados</label>
            <input
              type="number"
              min="0"
              value={formData.clients}
              onChange={(e) => setFormData({ ...formData, clients: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50"
              disabled
              title="Este valor se calcula automáticamente según las asignaciones reales"
            />
            <p className="text-xs text-gray-500 mt-1">
              Se calcula automáticamente según las asignaciones reales
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Activa">Activa</option>
              <option value="Inactiva">Inactiva</option>
              <option value="Entrenamiento">Entrenamiento</option>
            </select>
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
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Asignar Clientes a Nutricionista */}
      <Modal
        isOpen={isAssignClientsModalOpen}
        onClose={() => {
          setIsAssignClientsModalOpen(false)
          setSelectedUser(null)
          setSelectedClientIds([])
        }}
        title={`Asignar clientes a ${selectedUser?.name || ''}`}
        size="lg"
      >
        <form onSubmit={handleSubmitAssignClients} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">{error}</div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Selecciona los clientes (suscriptores) a asignar
            </label>
            {subscribersLoading ? (
              <p className="text-sm text-gray-500 py-4">Cargando suscriptores...</p>
            ) : availableSubscribers.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">
                No hay suscriptores disponibles. Crea suscriptores desde la pestaña "Clientes".
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {availableSubscribers.map((subscriber) => {
                  // Verificar si este suscriptor está asignado al nutricionista actual
                  const isAssignedToCurrent = selectedClientIds.includes(subscriber.id)
                  
                  // Verificar si está asignado a otro nutricionista
                  const assignedToOther = subscriberToNutricionista.get(subscriber.id)
                  const isAssignedToOther = assignedToOther && assignedToOther.nutricionistaId !== selectedUser?.id
                  
                  return (
                    <label
                      key={subscriber.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                        isAssignedToCurrent
                          ? 'bg-primary/10 border-2 border-primary'
                          : isAssignedToOther
                          ? 'bg-yellow-50 border-2 border-yellow-300 hover:bg-yellow-100'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isAssignedToCurrent}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClientIds([...selectedClientIds, subscriber.id])
                          } else {
                            setSelectedClientIds(selectedClientIds.filter((id) => id !== subscriber.id))
                          }
                        }}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{subscriber.name}</p>
                          {isAssignedToOther && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full">
                              Asignado a {assignedToOther.nutricionistaName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{subscriber.email}</p>
                        {isAssignedToOther && (
                          <p className="text-xs text-yellow-700 mt-1">
                            ⚠️ Al seleccionarlo, será reasignado a este nutricionista
                          </p>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setIsAssignClientsModalOpen(false)
                setSelectedUser(null)
                setSelectedClientIds([])
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Guardar asignación
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
