"use client"

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { mockUsers, User } from '../../lib/mockUsers'
import { NotificationHelpers } from '../../lib/notifications'

interface Message {
  id: string
  from: string
  fromName: string
  fromId: string
  to: string
  toName: string
  toId: string
  toRole: 'admin' | 'nutricionista' | 'repartidor' | 'suscriptor'
  subject: string
  message: string
  read: boolean
  createdAt: string
  reply?: string
}

interface Conversation {
  contactId: string
  contactName: string
  contactRole: string
  contactEmail: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  messages: Message[]
  archived?: boolean
  deleted?: boolean
}

interface Delivery {
  id: string
  customerId: string
  status: 'asignado' | 'en_camino' | 'entregado' | 'incidencia'
}

// Funciones helper para suscriptores
function hasOrderIncidents(subscriberId: string): { hasIncident: boolean; repartidorId: string | null } {
  const repartidores = mockUsers.filter((u) => u.role === 'repartidor')
  for (const repartidor of repartidores) {
    try {
      const stored = localStorage.getItem(`zona_azul_deliveries_user_${repartidor.id}`)
      if (stored) {
        const deliveries: Delivery[] = JSON.parse(stored)
        const incident = deliveries.find(
          (delivery) => delivery.customerId === subscriberId && delivery.status === 'incidencia'
        )
        if (incident) {
          return { hasIncident: true, repartidorId: repartidor.id }
        }
      }
    } catch (error) {
      console.error(`Error checking deliveries:`, error)
    }
  }
  return { hasIncident: false, repartidorId: null }
}

function getAssignedNutricionista(subscriberId: string): User | null {
  // Obtener todos los usuarios (mock + localStorage)
  const stored = localStorage.getItem('zona_azul_users')
  let allUsers: User[] = []
  
  if (stored) {
    try {
      allUsers = JSON.parse(stored)
    } catch (e) {
      // Error al parsear
    }
  }
  
  // Combinar nutricionistas, priorizando los de localStorage sobre mockUsers
  // Usar un Map para evitar duplicados por ID
  const nutricionistasMap = new Map<string, User>()
  
  // Primero agregar los de localStorage (tienen prioridad)
  allUsers
    .filter((u) => u.role === 'nutricionista')
    .forEach((nutri) => nutricionistasMap.set(nutri.id, nutri))
  
  // Luego agregar los de mockUsers solo si no existen ya
  mockUsers
    .filter((u) => u.role === 'nutricionista')
    .forEach((nutri) => {
      if (!nutricionistasMap.has(nutri.id)) {
        nutricionistasMap.set(nutri.id, nutri)
      }
    })
  
  const allNutricionistas = Array.from(nutricionistasMap.values())
  
  // Buscar en los clientes de cada nutricionista
  for (const nutricionista of allNutricionistas) {
    try {
      const stored = localStorage.getItem(`zona_azul_clients_user_${nutricionista.id}`)
      if (stored) {
        const clients = JSON.parse(stored)
        if (Array.isArray(clients) && clients.some((client: any) => client.id === subscriberId)) {
          return nutricionista
        }
      }
    } catch (error) {
      console.error(`Error checking clients for nutricionista ${nutricionista.id}:`, error)
    }
  }
  
  // Si no se encuentra, NO devolver un nutricionista por defecto
  // Devolver null para que no se muestre información incorrecta
  return null
}

export default function MessagesWidget() {
  const { userId, userName, userEmail, role } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [newMessageText, setNewMessageText] = useState('')
  const [newMessageSubject, setNewMessageSubject] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const [selectedRecipient, setSelectedRecipient] = useState<User | null>(null)
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [showArchived, setShowArchived] = useState(false)
  const [hoveredConversation, setHoveredConversation] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll al final de los mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (selectedConversation) {
      scrollToBottom()
    }
  }, [selectedConversation])

  // Función para obtener contactos disponibles para suscriptores
  const getAvailableContactsForSubscriber = (): User[] => {
    if (role !== 'suscriptor' || !userId) return []

    const contacts: User[] = []
    const admin = mockUsers.find((u) => u.role === 'admin')
    if (admin) contacts.push(admin)

    const nutricionista = getAssignedNutricionista(userId)
    if (nutricionista) contacts.push(nutricionista)

    const incidentInfo = hasOrderIncidents(userId)
    if (incidentInfo.hasIncident && incidentInfo.repartidorId) {
      const repartidor = mockUsers.find((u) => u.id === incidentInfo.repartidorId)
      if (repartidor) contacts.push(repartidor)
    }

    return contacts
  }

  // Función para obtener contactos disponibles para todos los roles
  const getAvailableContacts = (): User[] => {
    if (!userId || !role) return []

    // Para suscriptores, usar la lógica específica
    if (role === 'suscriptor') {
      return getAvailableContactsForSubscriber()
    }

    // Obtener usuarios de localStorage también
    let allUsersFromStorage: User[] = []
    try {
      const stored = localStorage.getItem('zona_azul_users')
      if (stored) {
        allUsersFromStorage = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Error loading users from storage:', error)
    }
    
    // Combinar mockUsers y usuarios de localStorage, eliminando duplicados
    const allUsersMap = new Map<string, User>()
    mockUsers.forEach((u) => allUsersMap.set(u.id, u))
    allUsersFromStorage.forEach((u) => allUsersMap.set(u.id, u))
    
    const allUsers = Array.from(allUsersMap.values()).filter((u) => u.id !== userId)
    
    if (role === 'admin') {
      // Admin puede contactar a todos
      return allUsers
    } else if (role === 'nutricionista') {
      // Nutricionista puede contactar a sus clientes, admin y otros nutricionistas
      const clients: User[] = []
      try {
        const stored = localStorage.getItem(`zona_azul_clients_user_${userId}`)
        if (stored) {
          const clientList = JSON.parse(stored)
          clientList.forEach((client: any) => {
            const clientUser = mockUsers.find((u) => u.id === client.id)
            if (clientUser) clients.push(clientUser)
          })
        }
      } catch (error) {
        console.error('Error loading clients:', error)
      }
      
      const otherContacts = allUsers.filter(
        (u) => u.role === 'admin' || u.role === 'nutricionista' || u.role === 'repartidor'
      )
      
      return [...clients, ...otherContacts]
    } else if (role === 'repartidor') {
      // Repartidor puede contactar a admin y suscriptores con pedidos asignados
      const assignedSubscribers: User[] = []
      try {
        const stored = localStorage.getItem('zona_azul_admin_orders')
        if (stored) {
          const orders = JSON.parse(stored)
          const subscriberIds = new Set(orders.map((o: any) => o.customerId))
          subscriberIds.forEach((subscriberId: string) => {
            const subscriber = mockUsers.find((u) => u.id === subscriberId && u.role === 'suscriptor')
            if (subscriber) assignedSubscribers.push(subscriber)
          })
        }
      } catch (error) {
        console.error('Error loading assigned subscribers:', error)
      }
      
      const admin = allUsers.find((u) => u.role === 'admin')
      const otherRepartidores = allUsers.filter((u) => u.role === 'repartidor')
      
      return admin ? [admin, ...assignedSubscribers, ...otherRepartidores] : [...assignedSubscribers, ...otherRepartidores]
    }

    return []
  }

  // Función para obtener chats archivados/eliminados del usuario
  const getUserChatStatus = () => {
    if (!userId) return { archived: new Set<string>(), deleted: new Set<string>() }
    try {
      const stored = localStorage.getItem(`zona_azul_chat_status_user_${userId}`)
      if (stored) {
        const status = JSON.parse(stored)
        return {
          archived: new Set<string>(status.archived || []),
          deleted: new Set<string>(status.deleted || []),
        }
      }
    } catch (error) {
      console.error('Error loading chat status:', error)
    }
    return { archived: new Set<string>(), deleted: new Set<string>() }
  }

  // Función para guardar estado de chats
  const saveUserChatStatus = (archived: Set<string>, deleted: Set<string>) => {
    if (!userId) return
    try {
      localStorage.setItem(
        `zona_azul_chat_status_user_${userId}`,
        JSON.stringify({
          archived: Array.from(archived),
          deleted: Array.from(deleted),
        })
      )
    } catch (error) {
      console.error('Error saving chat status:', error)
    }
  }

  // Función para cargar conversaciones
  const loadConversations = () => {
    if (!userId || !role) return

    try {
      const stored = localStorage.getItem('zona_azul_messages')
      if (!stored) {
        setConversations([])
        setUnreadTotal(0)
        return
      }

      const allMessages: Message[] = JSON.parse(stored)
      const chatStatus = getUserChatStatus()
      
      // Filtrar mensajes relevantes según el rol
      let relevantMessages: Message[] = []
      
      if (role === 'admin') {
        relevantMessages = allMessages.filter(
          (msg) => msg.toRole === 'admin' || msg.toId === userId || msg.fromId === userId
        )
      } else if (role === 'nutricionista') {
        relevantMessages = allMessages.filter(
          (msg) => (msg.toRole === 'nutricionista' && msg.toId === userId) || msg.fromId === userId
        )
      } else if (role === 'repartidor') {
        relevantMessages = allMessages.filter(
          (msg) => (msg.toRole === 'repartidor' && msg.toId === userId) || msg.fromId === userId
        )
      } else if (role === 'suscriptor') {
        relevantMessages = allMessages.filter(
          (msg) => msg.fromId === userId || msg.toId === userId
        )
      }

      // Filtrar mensajes de chats eliminados
      const filteredMessages = relevantMessages.filter((msg) => {
        const contactId = msg.fromId === userId ? msg.toId : msg.fromId
        return !chatStatus.deleted.has(contactId)
      })

      // Agrupar mensajes por contacto
      const conversationsMap = new Map<string, Conversation>()

      filteredMessages.forEach((msg) => {
        const contactId = msg.fromId === userId ? msg.toId : msg.fromId
        const isArchived = chatStatus.archived.has(contactId)

        // Si estamos mostrando archivados, solo mostrar los archivados
        // Si no, solo mostrar los no archivados
        if (showArchived && !isArchived) return
        if (!showArchived && isArchived) return
        
        const contactName = msg.fromId === userId ? msg.toName : msg.fromName
        const contactEmail = msg.fromId === userId ? msg.to : msg.from
        const contactRole = msg.fromId === userId ? msg.toRole : (mockUsers.find((u) => u.id === msg.fromId)?.role || 'suscriptor')

        if (!conversationsMap.has(contactId)) {
          conversationsMap.set(contactId, {
            contactId,
            contactName,
            contactRole,
            contactEmail,
            lastMessage: msg.message,
            lastMessageTime: msg.createdAt,
            unreadCount: 0,
            messages: [],
            archived: isArchived,
          })
        }

        const conversation = conversationsMap.get(contactId)!
        conversation.messages.push(msg)

        // Actualizar último mensaje si es más reciente
        const msgTime = new Date(msg.createdAt).getTime()
        const lastTime = new Date(conversation.lastMessageTime).getTime()
        if (msgTime > lastTime) {
          conversation.lastMessage = msg.message
          conversation.lastMessageTime = msg.createdAt
        }

        // Contar no leídos (solo mensajes recibidos)
        if (msg.toId === userId && !msg.read) {
          conversation.unreadCount++
        }
      })

      // Ordenar mensajes dentro de cada conversación
      conversationsMap.forEach((conv) => {
        conv.messages.sort((a, b) => {
          const timeA = new Date(a.createdAt).getTime()
          const timeB = new Date(b.createdAt).getTime()
          return timeA - timeB
        })
      })

      // Convertir a array y ordenar por último mensaje
      const conversationsArray = Array.from(conversationsMap.values()).sort((a, b) => {
        const timeA = new Date(a.lastMessageTime).getTime()
        const timeB = new Date(b.lastMessageTime).getTime()
        return timeB - timeA
      })

      setConversations(conversationsArray)
      // Solo contar no leídos de conversaciones no archivadas
      setUnreadTotal(
        conversationsArray
          .filter((conv) => !conv.archived)
          .reduce((sum, conv) => sum + conv.unreadCount, 0)
      )
      
      // Actualizar conversación seleccionada si existe (solo si realmente cambió)
      if (selectedConversation) {
        const updatedConv = conversationsArray.find((c) => c.contactId === selectedConversation.contactId)
        if (updatedConv) {
          // Solo actualizar si hay diferencias reales para evitar bucles
          const hasChanges = 
            updatedConv.messages.length !== selectedConversation.messages.length ||
            updatedConv.unreadCount !== selectedConversation.unreadCount ||
            updatedConv.lastMessage !== selectedConversation.lastMessage
          
          if (hasChanges) {
            setSelectedConversation(updatedConv)
          }
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
      setConversations([])
      setUnreadTotal(0)
    }
  }

  useEffect(() => {
    if (!userId || !role) return

    let previousMessages: Message[] = []
    let isProcessing = false // Flag para prevenir bucles infinitos
    let lastUpdateTime = 0 // Timestamp del último update para throttling

    const checkForNewMessages = () => {
      // Prevenir ejecuciones simultáneas
      if (isProcessing) return
      
      // Throttling: no ejecutar más de una vez cada 500ms
      const now = Date.now()
      if (now - lastUpdateTime < 500) return
      lastUpdateTime = now
      
      isProcessing = true

      try {
        const stored = localStorage.getItem('zona_azul_messages')
        if (stored) {
          try {
            const allMessages: Message[] = JSON.parse(stored)
            // Detectar nuevos mensajes recibidos
            const newMessages = allMessages.filter(
              (msg) =>
                msg.toId === userId &&
                !msg.read &&
                !previousMessages.some((prev) => prev.id === msg.id)
            )

            // Mostrar notificación para nuevos mensajes no leídos
            if (newMessages.length > 0 && document.hidden) {
              // Solo mostrar notificación si la ventana no está visible
              newMessages.forEach((msg) => {
                NotificationHelpers.newMessage(
                  msg.fromName,
                  msg.message.substring(0, 50) + (msg.message.length > 50 ? '...' : ''),
                  '/',
                  userId
                )
              })
            }

            previousMessages = allMessages
          } catch (error) {
            console.error('Error loading messages:', error)
          }
        }
      } finally {
        isProcessing = false
      }
    }

    // Cargar conversaciones inicialmente
    loadConversations()
    checkForNewMessages()

    const handleMessagesUpdate = () => {
      // Usar setTimeout para evitar bucles infinitos
      setTimeout(() => {
        if (!isProcessing) {
          checkForNewMessages()
          // Solo recargar conversaciones si no hay una seleccionada
          if (!selectedConversation) {
            loadConversations()
          }
        }
      }, 200)
    }
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'zona_azul_messages' || e.key?.startsWith('zona_azul_chat_status_user_')) {
        // Usar setTimeout para evitar bucles infinitos
        setTimeout(() => {
          if (!isProcessing) {
            checkForNewMessages()
            // Solo recargar conversaciones si no hay una seleccionada
            if (!selectedConversation) {
              loadConversations()
            }
          }
        }, 200)
      }
    }

    window.addEventListener('zona_azul_messages_updated', handleMessagesUpdate)
    window.addEventListener('storage', handleStorageChange)
    const interval = setInterval(() => {
      if (!isProcessing) {
        checkForNewMessages()
        // Solo recargar conversaciones si no hay una seleccionada
        if (!selectedConversation) {
          loadConversations()
        }
      }
    }, 3000) // Aumentar intervalo a 3 segundos para reducir carga

    return () => {
      window.removeEventListener('zona_azul_messages_updated', handleMessagesUpdate)
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
      isProcessing = false
    }
  }, [userId, role, showArchived]) // Agregar showArchived como dependencia

  // Marcar mensajes como leídos al abrir conversación
  useEffect(() => {
    if (selectedConversation && userId) {
      const stored = localStorage.getItem('zona_azul_messages')
      if (stored) {
        const allMessages: Message[] = JSON.parse(stored)
        const hasUnread = allMessages.some(
          (msg) => msg.toId === userId && msg.fromId === selectedConversation.contactId && !msg.read
        )
        
        // Solo actualizar si hay mensajes no leídos para evitar bucles
        if (hasUnread) {
          const updated = allMessages.map((msg) =>
            msg.toId === userId && msg.fromId === selectedConversation.contactId && !msg.read
              ? { ...msg, read: true }
              : msg
          )
          localStorage.setItem('zona_azul_messages', JSON.stringify(updated))
          
          // Usar setTimeout para evitar disparar eventos inmediatamente
          setTimeout(() => {
            window.dispatchEvent(new Event('zona_azul_messages_updated'))
            // Recargar conversaciones sin actualizar selectedConversation
            loadConversations()
          }, 50)
        }
      }
    }
  }, [selectedConversation?.contactId, userId]) // Solo usar contactId para evitar re-renders innecesarios

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !userName || !userEmail) return

    const recipient = selectedRecipient || (selectedConversation ? mockUsers.find((u) => u.id === selectedConversation.contactId) : null)
    if (!recipient) return

    if (!newMessageText.trim()) return

    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from: userEmail,
      fromName: userName,
      fromId: userId,
      to: recipient.email,
      toName: recipient.name || recipient.email,
      toId: recipient.id,
      toRole: recipient.role as 'admin' | 'nutricionista' | 'repartidor' | 'suscriptor',
      subject: newMessageSubject.trim() || 'Mensaje',
      message: newMessageText.trim(),
      read: false,
      createdAt: new Date().toISOString(),
    }

    try {
      const stored = localStorage.getItem('zona_azul_messages')
      const allMessages: Message[] = stored ? JSON.parse(stored) : []
      allMessages.push(newMessage)
      localStorage.setItem('zona_azul_messages', JSON.stringify(allMessages))
      window.dispatchEvent(new Event('zona_azul_messages_updated'))
      
      // Actualizar conversaciones y seleccionar la nueva
      setTimeout(() => {
        if (!selectedConversation) {
          // Buscar la conversación recién creada
          const stored = localStorage.getItem('zona_azul_messages')
          if (stored) {
            const allMessages: Message[] = JSON.parse(stored)
            const convMessages = allMessages.filter(
              (msg) => (msg.fromId === userId && msg.toId === recipient.id) || (msg.toId === userId && msg.fromId === recipient.id)
            )
            if (convMessages.length > 0) {
              const newConv: Conversation = {
                contactId: recipient.id,
                contactName: recipient.name || recipient.email,
                contactRole: recipient.role,
                contactEmail: recipient.email,
                lastMessage: newMessage.message,
                lastMessageTime: newMessage.createdAt,
                unreadCount: 0,
                messages: convMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
              }
              setSelectedConversation(newConv)
              // Cargar conversaciones después de establecer la selección
              setTimeout(() => loadConversations(), 50)
            }
          }
        } else {
          // Si ya hay una conversación seleccionada, solo recargar
          loadConversations()
        }
      }, 100)
      
      setNewMessageText('')
      setNewMessageSubject('')
      setIsComposing(false)
      setSelectedRecipient(null)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleStartNewConversation = (contact: User) => {
    setSelectedRecipient(contact)
    setIsComposing(true)
    setSelectedConversation(null)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Ahora'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  const getRoleBadgeColor = (contactRole: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-700',
      nutricionista: 'bg-green-100 text-green-700',
      repartidor: 'bg-blue-100 text-blue-700',
      suscriptor: 'bg-gray-100 text-gray-700',
    }
    return colors[contactRole] || colors.suscriptor
  }

  const getRoleLabel = (contactRole: string) => {
    const labels: Record<string, string> = {
      admin: 'Admin',
      nutricionista: 'Nutri',
      repartidor: 'Repartidor',
      suscriptor: 'Cliente',
    }
    return labels[contactRole] || contactRole
  }

  // Función para archivar conversación
  const handleArchiveConversation = (contactId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    if (!userId) return
    const chatStatus = getUserChatStatus()
    chatStatus.archived.add(contactId)
    chatStatus.deleted.delete(contactId) // Si estaba eliminada, restaurarla como archivada
    saveUserChatStatus(chatStatus.archived, chatStatus.deleted)
    
    if (selectedConversation?.contactId === contactId) {
      setSelectedConversation(null)
    }
    
    // Recargar conversaciones inmediatamente
    loadConversations()
  }

  // Función para desarchivar conversación
  const handleUnarchiveConversation = (contactId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    if (!userId) return
    const chatStatus = getUserChatStatus()
    chatStatus.archived.delete(contactId)
    saveUserChatStatus(chatStatus.archived, chatStatus.deleted)
    
    // Si estamos viendo archivados, cambiar a vista normal
    if (showArchived) {
      setShowArchived(false)
    }
    
    // Recargar conversaciones inmediatamente
    loadConversations()
  }

  // Función para eliminar conversación
  const handleDeleteConversation = (contactId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    if (!userId) return
    if (!confirm('¿Estás seguro de que quieres eliminar esta conversación? Esta acción no se puede deshacer.')) {
      return
    }
    
    const chatStatus = getUserChatStatus()
    chatStatus.deleted.add(contactId)
    chatStatus.archived.delete(contactId) // Si estaba archivada, eliminarla
    saveUserChatStatus(chatStatus.archived, chatStatus.deleted)
    
    // Eliminar mensajes de localStorage
    try {
      const stored = localStorage.getItem('zona_azul_messages')
      if (stored) {
        const allMessages: Message[] = JSON.parse(stored)
        const filteredMessages = allMessages.filter(
          (msg) => !(msg.fromId === userId && msg.toId === contactId) && !(msg.toId === userId && msg.fromId === contactId)
        )
        localStorage.setItem('zona_azul_messages', JSON.stringify(filteredMessages))
        window.dispatchEvent(new Event('zona_azul_messages_updated'))
      }
    } catch (error) {
      console.error('Error deleting messages:', error)
    }
    
    if (selectedConversation?.contactId === contactId) {
      setSelectedConversation(null)
    }
    loadConversations()
  }

  if (!userId || !role) return null

  const availableContacts = getAvailableContacts()

  return (
    <div className="relative">
      {/* Botón del widget */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
          // Si se está cerrando, limpiar estado
          if (isOpen) {
            setSelectedConversation(null)
            setIsComposing(false)
            setSelectedRecipient(null)
          }
        }}
        className="relative p-2 text-gray-600 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
        aria-label="Mensajes"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        {unreadTotal > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadTotal > 9 ? '9+' : unreadTotal}
          </span>
        )}
      </button>

      {/* Panel completo de mensajería */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(false)
              // Limpiar estado al cerrar
              setSelectedConversation(null)
              setIsComposing(false)
              setSelectedRecipient(null)
              setShowArchived(false)
            }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
          />
          
          <div 
            className="fixed top-16 right-2 sm:right-4 w-[calc(100vw-1rem)] sm:w-[600px] md:w-[700px] h-[calc(100vh-5rem)] bg-white rounded-2xl shadow-2xl z-[60] flex flex-col border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-primary text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Mensajes</h3>
                  {unreadTotal > 0 && (
                    <p className="text-xs text-white/80">{unreadTotal} no leídos</p>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsOpen(false)
                  // Limpiar estado al cerrar
                  setSelectedConversation(null)
                  setIsComposing(false)
                  setSelectedRecipient(null)
                }}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Cerrar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido principal - dos columnas */}
            <div className="flex flex-1 overflow-hidden">
              {/* Lista de conversaciones */}
              <div className="w-1/3 border-r bg-gray-50 overflow-y-auto flex flex-col">
                {/* Botones de acción */}
                <div className="p-2 border-b bg-white flex gap-2">
                  {availableContacts.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsComposing(true)
                        setSelectedConversation(null)
                        setSelectedRecipient(null)
                      }}
                      className="flex-1 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm font-medium"
                    >
                      + Nuevo
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowArchived(!showArchived)
                      setSelectedConversation(null)
                      setIsComposing(false)
                      setSelectedRecipient(null)
                    }}
                    className={`px-3 py-2 rounded-lg transition text-sm font-medium ${
                      showArchived
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {showArchived ? '📂 Archivados' : '📁 Ver archivados'}
                  </button>
                </div>
                
                {isComposing && availableContacts.length > 0 && (
                  <div className="p-2 border-b bg-white">
                    <p className="text-xs font-semibold text-gray-500 mb-2 px-2">Seleccionar destinatario:</p>
                    {availableContacts.map((contact) => (
                      <button
                        key={contact.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartNewConversation(contact)
                        }}
                        className="w-full p-2 hover:bg-gray-100 rounded-lg text-left"
                        type="button"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-primary text-xs font-semibold">
                              {contact.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                            <p className="text-xs text-gray-500">{getRoleLabel(contact.role)}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="divide-y flex-1 overflow-y-auto">
                  {conversations.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                      {showArchived ? 'No hay conversaciones archivadas' : 'No hay conversaciones aún'}
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <div
                        key={conv.contactId}
                        className={`relative group ${
                          selectedConversation?.contactId === conv.contactId ? 'bg-primary/5' : ''
                        }`}
                        onMouseEnter={() => setHoveredConversation(conv.contactId)}
                        onMouseLeave={() => setHoveredConversation(null)}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedConversation(conv)
                            setIsComposing(false)
                            setSelectedRecipient(null)
                          }}
                          className="w-full p-3 hover:bg-gray-100 transition-colors text-left"
                          type="button"
                        >
                          <div className="flex items-start gap-2">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-primary font-semibold text-sm">
                                {conv.contactName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-gray-900 text-sm truncate">{conv.contactName}</p>
                                  {conv.archived && (
                                    <span className="text-xs text-gray-400">📁</span>
                                  )}
                                </div>
                                {conv.unreadCount > 0 && !conv.archived && (
                                  <span className="bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                                    {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 truncate">{conv.lastMessage}</p>
                              <p className="text-xs text-gray-400 mt-1">{formatTime(conv.lastMessageTime)}</p>
                            </div>
                          </div>
                        </button>
                        
                        {/* Botones de acción al hacer hover */}
                        {hoveredConversation === conv.contactId && (
                          <div 
                            className="absolute top-2 right-2 flex gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1 z-10"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            {conv.archived ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  handleUnarchiveConversation(conv.contactId, e)
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="p-1.5 hover:bg-gray-100 rounded transition text-gray-600 hover:text-primary"
                                title="Desarchivar"
                                type="button"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  handleArchiveConversation(conv.contactId, e)
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="p-1.5 hover:bg-gray-100 rounded transition text-gray-600 hover:text-primary"
                                title="Archivar"
                                type="button"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                handleDeleteConversation(conv.contactId, e)
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="p-1.5 hover:bg-red-50 rounded transition text-gray-600 hover:text-red-600"
                              title="Eliminar"
                              type="button"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Vista de mensajes */}
              <div className="flex-1 flex flex-col bg-white">
                {selectedConversation || (isComposing && selectedRecipient) ? (
                  <>
                    {/* Header de conversación */}
                    <div className="p-4 border-b bg-gray-50">
                      {selectedConversation ? (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-primary font-semibold">
                              {selectedConversation.contactName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{selectedConversation.contactName}</p>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(selectedConversation.contactRole)}`}>
                              {getRoleLabel(selectedConversation.contactRole)}
                            </span>
                          </div>
                        </div>
                      ) : selectedRecipient ? (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-primary font-semibold">
                              {selectedRecipient.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{selectedRecipient.name}</p>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(selectedRecipient.role)}`}>
                              {getRoleLabel(selectedRecipient.role)}
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Mensajes */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {selectedConversation && selectedConversation.messages.length === 0 && !isComposing && (
                        <div className="text-center text-gray-400 text-sm py-8">
                          <p>No hay mensajes en esta conversación</p>
                        </div>
                      )}
                      {isComposing && selectedRecipient && !selectedConversation && (
                        <div className="text-center text-gray-400 text-sm py-8">
                          <p>Inicia la conversación escribiendo un mensaje</p>
                        </div>
                      )}
                      {selectedConversation?.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.fromId === userId ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                              msg.fromId === userId
                                ? 'bg-primary text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            {msg.subject && msg.subject !== 'Mensaje' && (
                              <p className={`text-xs font-semibold mb-1 ${msg.fromId === userId ? 'text-white/80' : 'text-gray-500'}`}>
                                {msg.subject}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            <p className={`text-xs mt-1 ${msg.fromId === userId ? 'text-white/70' : 'text-gray-400'}`}>
                              {formatTime(msg.createdAt)}
                            </p>
                            {msg.reply && (
                              <div className={`mt-2 p-2 rounded-lg ${msg.fromId === userId ? 'bg-white/20' : 'bg-gray-200'}`}>
                                <p className="text-xs font-semibold mb-1">Respuesta:</p>
                                <p className="text-xs">{msg.reply}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input de mensaje */}
                    <form onSubmit={handleSendMessage} className="p-4 border-t bg-gray-50">
                      {isComposing && !selectedConversation && (
                        <input
                          type="text"
                          value={newMessageSubject}
                          onChange={(e) => setNewMessageSubject(e.target.value)}
                          placeholder="Asunto (opcional)"
                          className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newMessageText}
                          onChange={(e) => setNewMessageText(e.target.value)}
                          placeholder="Escribe un mensaje..."
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                          type="submit"
                          disabled={!newMessageText.trim()}
                          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      <p className="text-sm">Selecciona una conversación para comenzar</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
