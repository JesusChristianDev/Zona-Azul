"use client"

import { useState, useEffect } from 'react'
import Modal from '../../../components/ui/Modal'
import { User, mockUsers } from '../../../lib/mockUsers'
import { assignPlanToSubscriber, getAllAvailableTemplates, PlanTemplate, hasPlanAssigned } from '../../../lib/planAssignment'
import { getSubscribers } from '../../../lib/subscribers'
import { getUserData, setUserData } from '../../../lib/storage'

interface TeamMember extends User {
  clients: number
  status: string
}

export default function AdminUsuariosPage() {
  const [activeTab, setActiveTab] = useState<'team' | 'clients'>('team')
  const [users, setUsers] = useState<TeamMember[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAssignPlanModalOpen, setIsAssignPlanModalOpen] = useState(false)
  const [isAssignClientsModalOpen, setIsAssignClientsModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null)
  const [availableTemplates, setAvailableTemplates] = useState<PlanTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [isCreatingFromClientsTab, setIsCreatingFromClientsTab] = useState(false)
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

  // Función para contar clientes asignados reales
  const countAssignedClients = (userId: string, role: string): number => {
    if (role === 'nutricionista') {
      // Contar clientes asignados al nutricionista
      try {
        const stored = localStorage.getItem(`zona_azul_clients_user_${userId}`)
        if (stored) {
          const clients = JSON.parse(stored)
          return Array.isArray(clients) ? clients.length : 0
        }
      } catch (error) {
        console.error('Error counting nutricionista clients:', error)
      }
      return 0
    } else if (role === 'repartidor') {
      // Contar suscriptores únicos con pedidos activos (no cancelados)
      try {
        const ordersStr = localStorage.getItem('zona_azul_admin_orders')
        if (ordersStr) {
          const orders = JSON.parse(ordersStr)
          const activeOrders = orders.filter(
            (order: any) => order.status !== 'Cancelado' && order.status !== 'Entregado'
          )
          const uniqueCustomerIds = new Set(activeOrders.map((order: any) => order.customerId))
          return uniqueCustomerIds.size
        }
      } catch (error) {
        console.error('Error counting repartidor clients:', error)
      }
      return 0
    }
    return 0
  }

  // Función para cargar usuarios
  const loadUsers = () => {
    const stored = localStorage.getItem('zona_azul_users')
    if (stored) {
      const parsed = JSON.parse(stored)
      // Asegurar que los nuevos usuarios de mockUsers también estén incluidos
      const existingIds = new Set(parsed.map((u: TeamMember) => u.id))
      const newUsers = mockUsers
        .filter((u) => !existingIds.has(u.id))
        .map((user) => ({
          ...user,
          clients: countAssignedClients(user.id, user.role),
          status: 'Activa',
        }))
      
      if (newUsers.length > 0) {
        const updated = [...parsed, ...newUsers]
        // Recalcular clientes asignados para todos los usuarios
        const updatedWithRealClients = updated.map((user) => ({
          ...user,
          clients: countAssignedClients(user.id, user.role),
        }))
        setUsers(updatedWithRealClients)
        localStorage.setItem('zona_azul_users', JSON.stringify(updatedWithRealClients))
        // Notificar que hay nuevos suscriptores para que otros roles se actualicen
        window.dispatchEvent(new Event('zona_azul_subscribers_updated'))
      } else {
        // Recalcular clientes asignados para todos los usuarios
        const updatedWithRealClients = parsed.map((user: TeamMember) => ({
          ...user,
          clients: countAssignedClients(user.id, user.role),
        }))
        setUsers(updatedWithRealClients)
      }
    } else {
      // Convertir mockUsers a TeamMember con datos reales
      const initialUsers: TeamMember[] = mockUsers.map((user) => ({
        ...user,
        clients: countAssignedClients(user.id, user.role),
        status: 'Activa',
      }))
      setUsers(initialUsers)
      localStorage.setItem('zona_azul_users', JSON.stringify(initialUsers))
    }
  }

  // Cargar usuarios y templates
  useEffect(() => {
    loadUsers()
    setAvailableTemplates(getAllAvailableTemplates())

    // Escuchar cambios en localStorage para actualizar en tiempo real (otras pestañas)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'zona_azul_users') {
        loadUsers()
      }
      // Actualizar cuando cambian las asignaciones de clientes
      if (e.key?.startsWith('zona_azul_clients_user_')) {
        loadUsers()
      }
      // Actualizar cuando cambian los pedidos (afecta a repartidores)
      if (e.key === 'zona_azul_admin_orders') {
        loadUsers()
      }
      // Recargar templates si cambian los planes de nutricionistas
      if (e.key?.startsWith('zona_azul_plans_user_')) {
        setAvailableTemplates(getAllAvailableTemplates())
      }
    }

    // Escuchar cambios locales (misma pestaña)
    const handleCustomUsersChange = () => {
      loadUsers()
    }
    const handleClientsUpdate = () => {
      loadUsers()
    }
    const handleOrdersUpdate = () => {
      loadUsers()
    }
    const handlePlansUpdate = () => {
      setAvailableTemplates(getAllAvailableTemplates())
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('zona_azul_users_updated', handleCustomUsersChange)
    window.addEventListener('zona_azul_clients_updated', handleClientsUpdate)
    window.addEventListener('zona_azul_admin_orders_updated', handleOrdersUpdate)
    window.addEventListener('zona_azul_plans_updated', handlePlansUpdate)

    // Polling cada 2 segundos para detectar cambios (fallback)
    const interval = setInterval(() => {
      loadUsers()
      setAvailableTemplates(getAllAvailableTemplates())
    }, 2000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('zona_azul_users_updated', handleCustomUsersChange)
      window.removeEventListener('zona_azul_clients_updated', handleClientsUpdate)
      window.removeEventListener('zona_azul_admin_orders_updated', handleOrdersUpdate)
      window.removeEventListener('zona_azul_plans_updated', handlePlansUpdate)
      clearInterval(interval)
    }
  }, [])

  const showToast = (message: string, isError = false) => {
    if (isError) {
      setError(message)
      setTimeout(() => setError(null), 5000)
    } else {
      setSuccess(message)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  // Notificar a otras pestañas/componentes que los usuarios fueron actualizados
  const notifyUsersUpdate = () => {
    window.dispatchEvent(new Event('zona_azul_users_updated'))
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

  const handleDelete = (userId: string) => {
    if (confirm('¿Estás seguro de eliminar este usuario?')) {
      const userToDelete = users.find((u) => u.id === userId)
      const updated = users.filter((u) => u.id !== userId)
      setUsers(updated)
      localStorage.setItem('zona_azul_users', JSON.stringify(updated))
      notifyUsersUpdate()
      
      // Si se eliminó un suscriptor, notificar a otros roles para limpiar sus datos
      if (userToDelete?.role === 'suscriptor') {
        window.dispatchEvent(new Event('zona_azul_subscribers_updated'))
      }
      
      showToast('Usuario eliminado correctamente')
    }
  }

  const handleAssignPlan = (user: TeamMember) => {
    if (user.role !== 'suscriptor') {
      showToast('Solo se pueden asignar planes a suscriptores', true)
      return
    }
    setSelectedUser(user)
    setSelectedTemplate('')
    setError(null)
    setIsAssignPlanModalOpen(true)
  }

  const handleAssignClients = (nutricionista: TeamMember) => {
    if (nutricionista.role !== 'nutricionista') {
      showToast('Solo se pueden asignar clientes a nutricionistas', true)
      return
    }
    setSelectedUser(nutricionista)
    
    // Cargar clientes actualmente asignados al nutricionista
    const currentClients = getUserData<any[]>('zona_azul_clients', nutricionista.id, [])
    setSelectedClientIds(currentClients.map((c: any) => c.id))
    
    setError(null)
    setIsAssignClientsModalOpen(true)
  }

  const handleSubmitAssignClients = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || selectedUser.role !== 'nutricionista') return

    const subscribers = getSubscribers()
    const selectedClients = subscribers
      .filter((s) => selectedClientIds.includes(s.id))
      .map((subscriber) => ({
        id: subscriber.id,
        name: subscriber.name,
        email: subscriber.email,
        plan: '',
        progress: '0%',
        lastCheck: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        notes: '',
      }))

    // Obtener todos los nutricionistas para desasignar de otros
    const stored = localStorage.getItem('zona_azul_users')
    let allUsers: User[] = []
    if (stored) {
      try {
        allUsers = JSON.parse(stored)
      } catch (e) {
        // Error al parsear
      }
    }
    
    // Combinar usuarios de mockUsers y localStorage
    const usersMap = new Map<string, User>()
    mockUsers.forEach((u) => usersMap.set(u.id, u))
    allUsers.forEach((u) => {
      if (u.email && u.password && u.role) {
        usersMap.set(u.id, u)
      }
    })
    
    const allNutricionistas = Array.from(usersMap.values()).filter((u) => u.role === 'nutricionista')
    
    // Remover estos clientes de otros nutricionistas (reasignación)
    allNutricionistas.forEach((nutri) => {
      if (nutri.id === selectedUser.id) return // No modificar el nutricionista actual
      
      try {
        const stored = localStorage.getItem(`zona_azul_clients_user_${nutri.id}`)
        if (stored) {
          const clients = JSON.parse(stored)
          if (Array.isArray(clients)) {
            // Filtrar los clientes que ahora están asignados al nutricionista actual
            const remainingClients = clients.filter((client: any) => !selectedClientIds.includes(client.id))
            
            // Guardar la lista actualizada
            setUserData('zona_azul_clients', remainingClients, nutri.id)
          }
        }
      } catch (error) {
        console.error(`Error updating clients for nutricionista ${nutri.id}:`, error)
      }
    })

    // Guardar clientes asignados al nutricionista actual
    setUserData('zona_azul_clients', selectedClients, selectedUser.id)
    
    // Notificar actualización
    window.dispatchEvent(new Event('zona_azul_clients_updated'))
    
    // Recargar usuarios para actualizar el contador
    loadUsers()
    
    setIsAssignClientsModalOpen(false)
    setSelectedUser(null)
    setSelectedClientIds([])
    showToast(`Clientes asignados correctamente a ${selectedUser.name}`)
  }

  const handleSubmitAssignPlan = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || !selectedTemplate) {
      setError('Por favor selecciona un plan')
      return
    }

    const template = availableTemplates.find((t) => t.id === selectedTemplate)
    if (!template) {
      setError('Plan no encontrado')
      return
    }

    const success = assignPlanToSubscriber(selectedUser.id, template, 'Admin')
    if (success) {
      showToast(`Plan "${template.name}" asignado correctamente a ${selectedUser.name}`)
      setIsAssignPlanModalOpen(false)
      setSelectedUser(null)
      setSelectedTemplate('')
    } else {
      showToast('Error al asignar el plan', true)
    }
  }

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validar email único
    if (users.some((u) => u.email.toLowerCase() === formData.email.toLowerCase())) {
      setError('Este email ya está registrado')
      return
    }

    // Si se está creando desde la pestaña de clientes, forzar rol suscriptor y clients = 0
    const finalRole = isCreatingFromClientsTab ? 'suscriptor' : formData.role
    const finalClients = isCreatingFromClientsTab ? 0 : formData.clients

    const newUser: TeamMember = {
      id: `user-${Date.now()}`,
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: finalRole as User['role'],
      createdAt: new Date().toISOString(),
      clients: finalClients,
      status: formData.status,
    }

    const updated = [...users, newUser]
    setUsers(updated)
    localStorage.setItem('zona_azul_users', JSON.stringify(updated))
    notifyUsersUpdate()
    
    // Si se creó un nuevo suscriptor, notificar a otros roles
    if (newUser.role === 'suscriptor') {
      window.dispatchEvent(new Event('zona_azul_subscribers_updated'))
    }
    
    setIsCreateModalOpen(false)
    setIsCreatingFromClientsTab(false)
    showToast(isCreatingFromClientsTab ? 'Cliente creado correctamente' : 'Usuario creado correctamente')
  }

  const handleSubmitEdit = (e: React.FormEvent) => {
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

    const updated = users.map((u) =>
      u.id === selectedUser.id
        ? {
            ...u,
            name: formData.name,
            email: formData.email,
            role: formData.role,
            // Recalcular clientes asignados basado en el rol (no usar formData.clients)
            clients: countAssignedClients(selectedUser.id, formData.role),
            status: formData.status,
            ...(formData.password && { password: formData.password }),
          }
        : u
    )

    setUsers(updated)
    localStorage.setItem('zona_azul_users', JSON.stringify(updated))
    notifyUsersUpdate()
    setIsEditModalOpen(false)
    setSelectedUser(null)
    showToast('Usuario actualizado correctamente')
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

      <header className="rounded-2xl border border-accent/30 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Usuarios y roles</h2>
            <p className="mt-2 text-sm text-gray-600">
              Coordina permisos y asignaciones para cada perfil. Esta vista se integra con el flujo de onboarding
              digital y seguimiento de desempeño.
            </p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('team')}
          className={`py-2 px-4 text-sm font-medium ${
            activeTab === 'team'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Equipo
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={`py-2 px-4 text-sm font-medium ${
            activeTab === 'clients'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Clientes
        </button>
      </div>

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
            {users
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
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {member.status}
                    </span>
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
            {users.filter((member) => member.role !== 'suscriptor').length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                No hay miembros del equipo registrados aún.
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
            {users
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
                    <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                      {member.status}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className={`font-medium ${hasPlanAssigned(member.id) ? 'text-green-600' : 'text-gray-500'}`}>
                      Plan: {hasPlanAssigned(member.id) ? '✓ Asignado' : 'No asignado'}
                    </span>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleAssignPlan(member)}
                        className="rounded-full border border-primary px-3 py-1 font-medium text-primary hover:bg-primary hover:text-white transition text-xs"
                      >
                        {hasPlanAssigned(member.id) ? 'Cambiar plan' : 'Asignar plan'}
                      </button>
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
            {users.filter((member) => member.role === 'suscriptor').length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                No hay clientes registrados aún.
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
          setSelectedTemplate('')
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
            {availableTemplates.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">
                No hay planes disponibles. Los nutricionistas pueden crear planes desde su dashboard.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableTemplates.map((template) => (
                  <label
                    key={template.id}
                    className={`block p-3 border rounded-lg cursor-pointer transition ${
                      selectedTemplate === template.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-primary/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="template"
                      value={template.id}
                      checked={selectedTemplate === template.id}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{template.name}</p>
                        <p className="text-xs text-gray-600 mt-1">{template.focus}</p>
                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                          <span>Duración: {template.duration}</span>
                          {template.calories && <span>• {template.calories} kcal/día</span>}
                        </div>
                        {template.description && (
                          <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                        )}
                      </div>
                      {selectedTemplate === template.id && (
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
                setSelectedTemplate('')
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!selectedTemplate || availableTemplates.length === 0}
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
            {(() => {
              // Obtener todos los suscriptores
              const allSubscribers = getSubscribers()
              
              // Obtener todos los nutricionistas
              const stored = localStorage.getItem('zona_azul_users')
              let allUsers: User[] = []
              if (stored) {
                try {
                  allUsers = JSON.parse(stored)
                } catch (e) {
                  // Error al parsear
                }
              }
              
              // Combinar usuarios de mockUsers y localStorage
              const usersMap = new Map<string, User>()
              mockUsers.forEach((u) => usersMap.set(u.id, u))
              allUsers.forEach((u) => {
                if (u.email && u.password && u.role) {
                  usersMap.set(u.id, u)
                }
              })
              
              const allNutricionistas = Array.from(usersMap.values()).filter((u) => u.role === 'nutricionista')
              
              // Crear un mapa de suscriptor -> nutricionista asignado
              const subscriberToNutricionista = new Map<string, { nutricionistaId: string; nutricionistaName: string }>()
              
              allNutricionistas.forEach((nutri) => {
                try {
                  const stored = localStorage.getItem(`zona_azul_clients_user_${nutri.id}`)
                  if (stored) {
                    const clients = JSON.parse(stored)
                    if (Array.isArray(clients)) {
                      clients.forEach((client: any) => {
                        if (client.id) {
                          subscriberToNutricionista.set(client.id, {
                            nutricionistaId: nutri.id,
                            nutricionistaName: nutri.name,
                          })
                        }
                      })
                    }
                  }
                } catch (error) {
                  console.error(`Error checking clients for nutricionista ${nutri.id}:`, error)
                }
              })
              
              // El admin puede ver TODOS los suscriptores, incluso los asignados a otros nutricionistas
              // para poder reasignarlos
              if (allSubscribers.length === 0) {
                return (
                  <p className="text-sm text-gray-500 py-4">
                    No hay suscriptores disponibles. Crea suscriptores desde la pestaña "Clientes".
                  </p>
                )
              }
              
              return (
                <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {allSubscribers.map((subscriber) => {
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
              )
            })()}
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
