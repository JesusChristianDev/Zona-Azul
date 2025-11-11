"use client"

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { User } from '../../lib/types'
import { NotificationHelpers } from '../../lib/notifications'
import { getMessages, sendMessage, getUsers, getUserById, getAvailableContacts, updateMessage } from '../../lib/api'
import * as api from '../../lib/api'

interface Message {
  id: string
  from: string
  fromName: string
  fromId: string
  fromRole?: 'admin' | 'nutricionista' | 'repartidor' | 'suscriptor'
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
async function hasOrderIncidents(subscriberId: string): Promise<{ hasIncident: boolean; repartidorId: string | null }> {
  try {
    // Obtener todos los pedidos del suscriptor
    const orders = await api.getOrders()
    const subscriberOrders = orders.filter((order: any) => order.user_id === subscriberId)
    
    // Verificar si alguno tiene incidencias
    for (const order of subscriberOrders) {
      const incidents = await api.getOrderIncidents(order.id)
      if (incidents && incidents.length > 0) {
        const reportedIncident = incidents.find((inc: any) => inc.status === 'reported')
        if (reportedIncident) {
          return { hasIncident: true, repartidorId: reportedIncident.repartidor_id }
        }
      }
    }
  } catch (error) {
    console.error('Error checking order incidents:', error)
  }
  return { hasIncident: false, repartidorId: null }
}

async function getAssignedNutricionista(subscriberId: string): Promise<User | null> {
  try {
    // Obtener asignación desde la API
    const assignment = await api.getNutricionistaByClientId(subscriberId)
    if (assignment && assignment.nutricionista_id) {
      // Obtener información del nutricionista específico
      const nutricionista = await getUserById(assignment.nutricionista_id)
      return nutricionista as User || null
    }
    return null
  } catch (error) {
    console.error('Error getting assigned nutricionista:', error)
    return null
  }
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
  const [availableContacts, setAvailableContacts] = useState<User[]>([])
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

  // Función para obtener contactos disponibles para todos los roles
  const getAvailableContactsList = async (): Promise<User[]> => {
    if (!userId || !role) return []

    try {
      // Usar la nueva ruta de API que devuelve contactos según el rol
      const contacts = await getAvailableContacts()
      return contacts.map((u: any) => u as User).filter((u) => u.id !== userId)
    } catch (error) {
      console.error('Error getting available contacts:', error)
      // Fallback: intentar obtener contactos de forma manual si la API falla
      try {
        if (role === 'admin') {
          const allUsers = await getUsers()
          return allUsers.map((u: any) => u as User).filter((u) => u.id !== userId)
        }
      } catch (fallbackError) {
        console.error('Error in fallback:', fallbackError)
      }
      return []
    }
  }

  // Función para obtener chats archivados/eliminados del usuario desde la API
  const getUserChatStatus = async (): Promise<{ archived: Set<string>; deleted: Set<string> }> => {
    if (!userId) return { archived: new Set<string>(), deleted: new Set<string>() }
    try {
      const preferences = await api.getChatPreferences()
      const archived = new Set<string>()
      const deleted = new Set<string>()
      
      preferences.forEach((pref: any) => {
        if (pref.is_archived) {
          archived.add(pref.contact_id)
        }
        if (pref.is_deleted) {
          deleted.add(pref.contact_id)
        }
      })
      
      return { archived, deleted }
    } catch (error) {
      console.error('Error loading chat status:', error)
      return { archived: new Set<string>(), deleted: new Set<string>() }
    }
  }

  // Función para guardar estado de chats en la API
  const saveUserChatStatus = async (archived: Set<string>, deleted: Set<string>) => {
    if (!userId) return
    try {
      // Obtener todas las preferencias actuales
      const preferences = await api.getChatPreferences()
      const preferenceMap = new Map(preferences.map((p: any) => [p.contact_id, p]))
      
      // Actualizar cada preferencia
      const allContactIds = new Set([...Array.from(archived), ...Array.from(deleted)])
      for (const contactId of Array.from(allContactIds)) {
        await api.updateChatPreference(contactId, {
          is_archived: archived.has(contactId),
          is_deleted: deleted.has(contactId),
        })
      }
    } catch (error) {
      console.error('Error saving chat status:', error)
    }
  }

  // Función para cargar conversaciones desde la API
  const loadConversations = async (): Promise<Conversation[]> => {
    if (!userId || !role) {
      return []
    }

    try {
      const apiMessages = await getMessages()
      
      // Convertir mensajes de API a formato Message
      const allMessages: Message[] = apiMessages.map((msg: any) => ({
        id: msg.id,
        from: msg.from_email || '',
        fromName: msg.from_name || '',
        fromId: msg.from_id,
        fromRole: msg.from_role || (msg.from_id === userId ? role : 'suscriptor'),
        to: msg.to_email || '',
        toName: msg.to_name || '',
        toId: msg.to_id,
        toRole: msg.to_role as 'admin' | 'nutricionista' | 'repartidor' | 'suscriptor',
        subject: msg.subject || 'Mensaje',
        message: msg.message || '',
        read: msg.read || false,
        createdAt: msg.created_at,
        reply: msg.reply || undefined,
      }))
      
      const chatStatus = await getUserChatStatus()
      
      // Filtrar mensajes relevantes: todos los mensajes donde el usuario es remitente o destinatario
      const relevantMessages = allMessages.filter(
        (msg) => msg.fromId === userId || msg.toId === userId
      )

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
        const isDeleted = chatStatus.deleted.has(contactId)

        if (showArchived && !isArchived && !isDeleted) return
        if (!showArchived && isArchived) return
        
        const contactName = msg.fromId === userId ? msg.toName : msg.fromName
        const contactEmail = msg.fromId === userId ? msg.to : msg.from
        // Obtener el rol del contacto desde el mensaje
        const contactRole = msg.fromId === userId ? msg.toRole : (msg.fromRole || 'suscriptor')

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
            deleted: isDeleted,
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
      
      return conversationsArray
    } catch (error) {
      console.error('Error loading conversations:', error)
      setConversations([])
      setUnreadTotal(0)
      return []
    }
  }

  useEffect(() => {
    if (!userId || !role) return

    let previousMessages: Message[] = []
    let isProcessing = false // Flag para prevenir bucles infinitos
    let lastUpdateTime = 0 // Timestamp del último update para throttling

    const checkForNewMessages = async () => {
      // Prevenir ejecuciones simultáneas
      if (isProcessing) return
      
      // Throttling: no ejecutar más de una vez cada 500ms
      const now = Date.now()
      if (now - lastUpdateTime < 500) return
      lastUpdateTime = now
      
      isProcessing = true

      try {
        // Obtener mensajes desde la API
        const allApiMessages = await getMessages()
        const allMessages: Message[] = allApiMessages.map((msg: any) => ({
          id: msg.id,
          from: msg.from_email || '',
          fromName: msg.from_name || '',
          fromId: msg.from_id,
          fromRole: msg.from_role || (msg.from_id === userId ? role : 'suscriptor'),
          to: msg.to_email || '',
          toName: msg.to_name || '',
          toId: msg.to_id,
          toRole: msg.to_role as 'admin' | 'nutricionista' | 'repartidor' | 'suscriptor',
          subject: msg.subject || 'Mensaje',
          message: msg.message || '',
          read: msg.read || false,
          createdAt: msg.created_at,
          reply: msg.reply || undefined,
        }))
        
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
          // Siempre recargar conversaciones para mostrar nuevos mensajes
          loadConversations()
        }
      }, 200)
      }
    
            window.addEventListener('zona_azul_messages_updated', handleMessagesUpdate)
            const interval = setInterval(() => {
              if (!isProcessing) {
                checkForNewMessages()
                // Recargar conversaciones periódicamente para mantener actualizado
                loadConversations()
              }
            }, 3000) // Aumentar intervalo a 3 segundos para reducir carga

            return () => {
              window.removeEventListener('zona_azul_messages_updated', handleMessagesUpdate)
              clearInterval(interval)
              isProcessing = false
            }
  }, [userId, role, showArchived]) // Agregar showArchived como dependencia

  // Marcar mensajes como leídos al abrir conversación
  useEffect(() => {
    const markAsRead = async () => {
      if (!selectedConversation || !userId) return

      try {
        const apiMessages = await getMessages()
        const unreadMessages = apiMessages.filter(
          (msg: any) => 
            msg.to_id === userId && 
            msg.from_id === selectedConversation.contactId && 
            !msg.read
        )
        
        // Marcar todos los mensajes no leídos como leídos
        if (unreadMessages.length > 0) {
          await Promise.all(
            unreadMessages.map((msg: any) => 
              updateMessage(msg.id, { read: true })
            )
          )
          
          // Recargar conversaciones
          await loadConversations()
        }
      } catch (error) {
        console.error('Error marking messages as read:', error)
      }
    }

    markAsRead()
  }, [selectedConversation?.contactId, userId])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !userName || !userEmail) {
      console.error('Missing user data')
      return
    }

    if (!newMessageText.trim()) {
      console.error('Message text is empty')
      return
    }

    try {
      // Obtener el destinatario
      let recipient = selectedRecipient
      if (!recipient && selectedConversation) {
        // Intentar obtener el usuario específico
        try {
          recipient = await getUserById(selectedConversation.contactId) as User
        } catch (error) {
          console.error('Error getting recipient:', error)
          // Fallback: buscar en contactos disponibles
          const contacts = await getAvailableContactsList()
          recipient = contacts.find((u: any) => u.id === selectedConversation.contactId) as User
        }
      }
      
      if (!recipient) {
        console.error('No recipient selected')
        alert('Por favor, selecciona un destinatario')
        return
      }

      const messageText = newMessageText.trim()
      const messageSubject = newMessageSubject.trim() || 'Mensaje'

      // Enviar mensaje a través de la API
      const sentMessage = await sendMessage({
        to_user_id: recipient.id,
        subject: messageSubject,
        message: messageText,
      })

      if (!sentMessage) {
        alert('Error al enviar el mensaje. Por favor, intenta de nuevo.')
        return
      }

      // Limpiar campos
      setNewMessageText('')
      setNewMessageSubject('')
      
      // Si el destinatario está marcado como eliminado, restaurarlo automáticamente
      const chatStatus = await getUserChatStatus()
      if (chatStatus.deleted.has(recipient.id)) {
        await api.updateChatPreference(recipient.id, {
          is_archived: false,
          is_deleted: false,
        })
      }
      
      // Esperar un poco para que la base de datos se actualice
      await new Promise(resolve => setTimeout(resolve, 600))
      
      // Recargar conversaciones para obtener el mensaje recién enviado
      const updatedConversations = await loadConversations()
      
      // Buscar y seleccionar la conversación con el destinatario
      const targetConversation = updatedConversations.find(c => c.contactId === recipient.id)
      
      if (targetConversation) {
        setSelectedConversation(targetConversation)
        setIsComposing(false)
        setSelectedRecipient(null)
      } else {
        // Si no se encontró, esperar un poco más y recargar
        await new Promise(resolve => setTimeout(resolve, 500))
        const retryConversations = await loadConversations()
        const retryTarget = retryConversations.find(c => c.contactId === recipient.id)
        
        if (retryTarget) {
          setSelectedConversation(retryTarget)
          setIsComposing(false)
          setSelectedRecipient(null)
        } else {
          // Si aún no se encuentra, crear una conversación temporal
          let recipientUser: User | null = null
          try {
            recipientUser = await getUserById(recipient.id) as User
          } catch (error) {
            console.error('Error getting recipient user:', error)
            // Fallback: buscar en contactos disponibles
            const contacts = await getAvailableContactsList()
            recipientUser = contacts.find((u: any) => u.id === recipient.id) as User || null
          }
          
          if (recipientUser) {
            const apiMessages = await getMessages()
            const convMessages = apiMessages
              .filter((msg: any) => 
                (msg.from_id === userId && msg.to_id === recipient.id) || 
                (msg.to_id === userId && msg.from_id === recipient.id)
              )
              .map((msg: any) => ({
                id: msg.id,
                from: msg.from_email || '',
                fromName: msg.from_name || '',
                fromId: msg.from_id,
                to: msg.to_email || '',
                toName: msg.to_name || '',
                toId: msg.to_id,
                toRole: msg.to_role,
                subject: msg.subject || 'Mensaje',
                message: msg.message || '',
                read: msg.read || false,
                createdAt: msg.created_at,
                reply: msg.reply || undefined,
              } as Message))
            
            if (convMessages.length > 0) {
              const currentChatStatus = await getUserChatStatus()
              const newConv: Conversation = {
                contactId: recipient.id,
                contactName: recipientUser.name || recipientUser.email,
                contactRole: recipientUser.role,
                contactEmail: recipientUser.email,
                lastMessage: convMessages[convMessages.length - 1].message,
                lastMessageTime: convMessages[convMessages.length - 1].createdAt,
                unreadCount: convMessages.filter(m => m.toId === userId && !m.read).length,
                messages: convMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
                archived: currentChatStatus.archived.has(recipient.id),
                deleted: currentChatStatus.deleted.has(recipient.id),
              }
              setSelectedConversation(newConv)
              setIsComposing(false)
              setSelectedRecipient(null)
              
              setTimeout(() => {
                loadConversations()
              }, 300)
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      alert('Error al enviar el mensaje: ' + (error.message || 'Error desconocido'))
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
  const handleArchiveConversation = async (contactId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    if (!userId) return
    
    const chatStatus = await getUserChatStatus()
    const isArchived = chatStatus.archived.has(contactId)
    
    // Actualizar en la API
    await api.updateChatPreference(contactId, {
      is_archived: !isArchived,
      is_deleted: false, // Si estaba eliminada, restaurarla como archivada
    })
    
    if (selectedConversation?.contactId === contactId) {
      setSelectedConversation(null)
    }
    
    // Recargar conversaciones inmediatamente
    loadConversations()
  }

  // Función para desarchivar conversación
  const handleUnarchiveConversation = async (contactId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    if (!userId) return
    
    // Actualizar en la API
    await api.updateChatPreference(contactId, {
      is_archived: false,
      is_deleted: false,
    })
    
    // Si estamos viendo archivados, cambiar a vista normal
    if (showArchived) {
      setShowArchived(false)
    }
    
    // Recargar conversaciones inmediatamente
    loadConversations()
  }

  // Función para eliminar conversación
  const handleDeleteConversation = async (contactId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    if (!userId) return
    if (!confirm('¿Estás seguro de que quieres eliminar esta conversación? Se borrarán todos los mensajes y no podrás recuperarlos.')) {
      return
    }
    
    try {
      // Primero eliminar todos los mensajes de la conversación
      const messagesDeleted = await api.deleteConversationMessages(contactId)
      
      if (!messagesDeleted) {
        console.error('Error deleting conversation messages')
        alert('Error al eliminar los mensajes. Por favor, intenta de nuevo.')
        return
      }
      
      // Luego marcar la conversación como eliminada
      await api.updateChatPreference(contactId, {
        is_archived: false,
        is_deleted: true,
      })
      
      if (selectedConversation?.contactId === contactId) {
        setSelectedConversation(null)
      }
      
      // Recargar conversaciones
      await loadConversations()
    } catch (error) {
      console.error('Error deleting conversation:', error)
      alert('Error al eliminar la conversación. Por favor, intenta de nuevo.')
    }
  }


  // Cargar contactos disponibles cuando se abre el widget o cambia el usuario/rol
  useEffect(() => {
    if (!userId || !role) {
      setAvailableContacts([])
      return
    }

    const loadContacts = async () => {
      try {
        const contacts = await getAvailableContactsList()
        setAvailableContacts(contacts)
      } catch (error) {
        console.error('Error loading available contacts:', error)
        setAvailableContacts([])
      }
    }

    // Cargar contactos cuando se abre el widget o cuando se está componiendo
    if (isOpen || isComposing) {
      loadContacts()
    }
  }, [userId, role, isOpen, isComposing])

  if (!userId || !role) return null

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
            className="fixed top-0 left-0 right-0 bottom-0 sm:top-16 sm:left-auto sm:right-2 sm:bottom-2 sm:w-[600px] md:w-[700px] sm:h-[calc(100vh-5rem)] sm:rounded-2xl bg-white shadow-2xl z-[60] flex flex-col border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-primary text-white sm:rounded-t-2xl">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm sm:text-base truncate">Mensajes</h3>
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
                className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                aria-label="Cerrar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido principal - responsive: móvil fullscreen, desktop dos columnas */}
            <div className="flex flex-1 overflow-hidden">
              {/* Lista de conversaciones - oculta en móvil cuando hay conversación seleccionada */}
              <div className={`${selectedConversation || (isComposing && selectedRecipient) ? 'hidden sm:flex' : 'flex'} w-full sm:w-1/3 border-r bg-gray-50 overflow-y-auto flex-col`}>
                {/* Botones de acción */}
                <div className="p-2 border-b bg-white flex gap-2">
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
                
                {isComposing && (
                  <div className="p-2 border-b bg-white">
                    <p className="text-xs font-semibold text-gray-500 mb-2 px-2">Seleccionar destinatario:</p>
                    {availableContacts.length === 0 ? (
                      <div className="p-4 text-center text-gray-400 text-sm">
                        <p>No hay contactos disponibles</p>
                        <p className="text-xs mt-1">Cargando contactos...</p>
                      </div>
                    ) : (
                      availableContacts.map((contact) => (
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
                      ))
                    )}
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
                                  {conv.archived && !conv.deleted && (
                                    <span className="text-xs text-gray-400">📁</span>
                                  )}
                                </div>
                                {conv.unreadCount > 0 && !conv.archived && !conv.deleted && (
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
                        {hoveredConversation === conv.contactId && !conv.deleted && (
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

              {/* Vista de mensajes - oculta en móvil cuando no hay conversación seleccionada */}
              <div className={`${selectedConversation || isComposing ? 'flex' : 'hidden sm:flex'} flex-1 flex-col bg-white`}>
                {selectedConversation || isComposing ? (
                  <>
                    {/* Header de conversación */}
                    <div className="p-3 sm:p-4 border-b bg-gray-50 flex items-center gap-2 sm:gap-0">
                      {/* Botón volver - solo visible en móvil */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedConversation(null)
                          setIsComposing(false)
                          setSelectedRecipient(null)
                        }}
                        className="sm:hidden p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                        aria-label="Volver"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <div className="flex-1">
                        {selectedConversation ? (
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-primary font-semibold text-sm sm:text-base">
                                {selectedConversation.contactName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{selectedConversation.contactName}</p>
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(selectedConversation.contactRole)}`}>
                                {getRoleLabel(selectedConversation.contactRole)}
                              </span>
                            </div>
                          </div>
                        ) : selectedRecipient ? (
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-primary font-semibold text-sm sm:text-base">
                                {selectedRecipient.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{selectedRecipient.name}</p>
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(selectedRecipient.role)}`}>
                                {getRoleLabel(selectedRecipient.role)}
                              </span>
                            </div>
                          </div>
                        ) : isComposing ? (
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-gray-500 font-semibold text-sm sm:text-base">+</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 text-sm sm:text-base">Nuevo mensaje</p>
                              <p className="text-xs text-gray-500">Selecciona un destinatario</p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Mensajes */}
                    <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                      {selectedConversation && selectedConversation.messages.length === 0 && !isComposing && (
                        <div className="text-center text-gray-400 text-sm py-8">
                          <p>No hay mensajes en esta conversación</p>
                        </div>
                      )}
                      {isComposing && !selectedRecipient && !selectedConversation && (
                        <div className="text-center text-gray-400 text-sm py-8">
                          <p>Selecciona un destinatario de la lista para comenzar</p>
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
                            className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 py-2 sm:px-4 sm:py-2 ${
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
                    <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t bg-gray-50">
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
                          placeholder={selectedRecipient ? "Escribe un mensaje..." : "Selecciona un destinatario primero"}
                          disabled={!selectedRecipient && isComposing}
                          className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        <button
                          type="submit"
                          disabled={!newMessageText.trim() || (!selectedRecipient && isComposing)}
                          className="px-3 sm:px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
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
