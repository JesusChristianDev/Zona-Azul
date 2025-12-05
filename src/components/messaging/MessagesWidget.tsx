"use client"

import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { User } from '../../lib/types'
import { NotificationHelpers } from '../../lib/notifications'
import { getMessages, sendMessage, getUsers, getUserById, getAvailableContacts, updateMessage } from '../../lib/api'
import * as api from '../../lib/api'
import { usePanel } from '../../contexts/PanelContext'

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
  const { isMessagesOpen, setIsMessagesOpen, setIsNotificationsOpen, setIsSettingsOpen } = usePanel()
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

  // Scroll al final de los mensajes - optimizado para evitar reflows - memoizado
  // IMPORTANTE: Este useCallback debe ejecutarse siempre, incluso si no hay userId/role
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      // Usar requestAnimationFrame para evitar forced reflow
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      })
    }
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      // Delay el scroll para evitar conflictos con el render
      const timeoutId = setTimeout(() => {
        scrollToBottom()
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [selectedConversation?.messages.length, scrollToBottom]) // Solo scroll cuando cambia el número de mensajes

  // Función para obtener contactos disponibles para todos los roles - memoizada
  const getAvailableContactsList = useCallback(async (): Promise<User[]> => {
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
  }, [userId, role])

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
          // Inicializar contador de no leídos correctamente
          const initialUnreadCount = msg.toId === userId && !msg.read ? 1 : 0
          conversationsMap.set(contactId, {
            contactId,
            contactName,
            contactRole,
            contactEmail,
            lastMessage: msg.message,
            lastMessageTime: msg.createdAt,
            unreadCount: initialUnreadCount,
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

        // Contar no leídos (solo mensajes recibidos que no han sido leídos)
        // IMPORTANTE: Recalcular desde cero para evitar duplicados
        conversation.unreadCount = conversation.messages.filter(
          (m) => m.toId === userId && !m.read
        ).length
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
      // Solo contar no leídos de conversaciones no archivadas y no eliminadas
      const totalUnread = conversationsArray
        .filter((conv) => !conv.archived && !conv.deleted)
        .reduce((sum, conv) => sum + conv.unreadCount, 0)

      setUnreadTotal(totalUnread)

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
        // Mostrar notificación si la ventana no está visible O si el widget de mensajes no está abierto
        if (newMessages.length > 0 && (document.hidden || !isMessagesOpen)) {
          newMessages.forEach((msg) => {
            NotificationHelpers.newMessage(
              msg.fromName,
              msg.message.substring(0, 80) + (msg.message.length > 80 ? '...' : ''),
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
      // Usar requestAnimationFrame para optimizar el rendimiento
      requestAnimationFrame(() => {
        if (!isProcessing) {
          // Throttle: solo actualizar si ha pasado suficiente tiempo
          const now = Date.now()
          if (now - lastUpdateTime >= 1000) { // Mínimo 1 segundo entre actualizaciones
            lastUpdateTime = now
            checkForNewMessages()
            // Usar setTimeout para no bloquear el thread principal
            setTimeout(() => {
              loadConversations()
            }, 0)
          }
        }
      })
    }

    window.addEventListener('zona_azul_messages_updated', handleMessagesUpdate, { passive: true })
    const interval = setInterval(() => {
      if (!isProcessing) {
        const now = Date.now()
        if (now - lastUpdateTime >= 3000) { // Throttle: mínimo 3 segundos
          lastUpdateTime = now
          checkForNewMessages()
          // Usar setTimeout para no bloquear el thread principal
          setTimeout(() => {
            loadConversations()
          }, 0)
        }
      }
    }, 3000) // Intervalo de 3 segundos

    return () => {
      window.removeEventListener('zona_azul_messages_updated', handleMessagesUpdate)
      clearInterval(interval)
      isProcessing = false
    }
  }, [userId, role, showArchived, isMessagesOpen]) // Agregar isMessagesOpen para controlar notificaciones

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
        console.error('Failed to send message')
        alert('Error al enviar el mensaje. Por favor, intenta de nuevo.')
        return
      }

      // Disparar evento global para notificar a otros componentes/usuarios
      // Esto ayudará a que el destinatario vea el mensaje más rápido
      window.dispatchEvent(new CustomEvent('zona_azul_messages_updated', {
        detail: { messageId: sentMessage.id, toUserId: sentMessage.to_user_id }
      }))

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

      // Forzar recarga inmediata de conversaciones para el remitente
      // El destinatario verá el mensaje en su próxima actualización automática (cada 3 segundos)
      // Usar requestAnimationFrame para optimizar el rendimiento
      requestAnimationFrame(async () => {
        await new Promise(resolve => setTimeout(resolve, 200)) // Reducir delay

        // Recargar conversaciones para obtener el mensaje recién enviado
        const updatedConversations = await loadConversations()

        // Buscar y seleccionar la conversación con el destinatario
        const targetConversation = updatedConversations.find(c => c.contactId === recipient.id)

        if (targetConversation) {
          // Usar setTimeout para no bloquear el thread principal
          setTimeout(() => {
            setSelectedConversation(targetConversation)
            setIsComposing(false)
            setSelectedRecipient(null)
          }, 0)
        } else {
          // Si no se encontró, esperar un poco más y recargar
          setTimeout(async () => {
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
          }, 500)
        }
      })
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

  // Funciones memoizadas para mejor rendimiento
  const formatTime = useCallback((dateString: string) => {
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
  }, [])

  const getRoleBadgeColor = useCallback((contactRole: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-700',
      nutricionista: 'bg-green-100 text-green-700',
      repartidor: 'bg-blue-100 text-blue-700',
      suscriptor: 'bg-gray-100 text-gray-700',
    }
    return colors[contactRole] || colors.suscriptor
  }, [])

  const getRoleLabel = useCallback((contactRole: string) => {
    const labels: Record<string, string> = {
      admin: 'Admin',
      nutricionista: 'Nutri',
      repartidor: 'Repartidor',
      suscriptor: 'Cliente',
    }
    return labels[contactRole] || contactRole
  }, [])

  // Memoizar conversaciones filtradas para evitar recálculos innecesarios
  const filteredConversations = useMemo(() => {
    if (!conversations.length) return []
    return conversations.filter((conv) => {
      if (showArchived) {
        return conv.archived && !conv.deleted
      }
      return !conv.archived && !conv.deleted
    })
  }, [conversations, showArchived])

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
    if (isMessagesOpen || isComposing) {
      loadContacts()
    }
  }, [userId, role, isMessagesOpen, isComposing])

  if (!userId || !role) return null

  return (
    <>
      {/* Panel completo de mensajería - renderizado como overlay independiente */}
      {isMessagesOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-[45]"
            onClick={(e) => {
              e.stopPropagation()
              setIsMessagesOpen(false)
              // Limpiar estado al cerrar
              setSelectedConversation(null)
              setIsComposing(false)
              setSelectedRecipient(null)
              setShowArchived(false)
            }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ pointerEvents: isMessagesOpen ? 'auto' : 'none' }}
            data-nextjs-scroll-focus-boundary
          />

          <div
            className="fixed inset-0 sm:inset-auto sm:top-16 sm:left-auto sm:right-4 sm:bottom-4 sm:w-[calc(100vw-2rem)] sm:max-w-[720px] md:max-w-[800px] sm:h-[calc(100vh-6rem)] sm:rounded-2xl bg-white/95 dark:bg-slate-900/70 backdrop-blur-2xl shadow-2xl z-[50] flex flex-col border-0 sm:border border-gray-200/70 dark:border-slate-800/70 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            data-nextjs-scroll-focus-boundary
          >
            {/* Header profesional */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary to-primary/90 text-white sm:rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-base sm:text-lg truncate">Mensajes</h3>
                  {unreadTotal > 0 && (
                    <p className="text-xs text-white/90 font-medium mt-0.5">{unreadTotal} {unreadTotal === 1 ? 'mensaje no leído' : 'mensajes no leídos'}</p>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsMessagesOpen(false)
                  setSelectedConversation(null)
                  setIsComposing(false)
                  setSelectedRecipient(null)
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 flex-shrink-0 active:scale-95"
                aria-label="Cerrar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido principal - responsive: móvil fullscreen, desktop dos columnas */}
            <div className="flex flex-1 overflow-hidden bg-gradient-to-br from-white to-gray-50 dark:from-slate-900/60 dark:to-slate-900/30">
              {/* Lista de conversaciones - oculta en móvil cuando hay conversación seleccionada o se está componiendo */}
              <div className={`${selectedConversation || isComposing ? 'hidden sm:flex' : 'flex'} w-full sm:w-[320px] md:w-[360px] border-r border-gray-100/80 dark:border-slate-800/70 bg-white/95 dark:bg-slate-900/45 backdrop-blur-xl overflow-hidden flex-col transition-all duration-300`}>
                {/* Barra de acciones profesional */}
                <div className="px-2 sm:px-3 py-2.5 sm:py-3 border-b border-gray-100/80 dark:border-slate-800/60 bg-white/95 dark:bg-slate-900/50 backdrop-blur-xl">
                  <div className="flex gap-1.5 sm:gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsComposing(true)
                        setSelectedConversation(null)
                        setSelectedRecipient(null)
                      }}
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all duration-200 text-xs sm:text-sm font-semibold shadow-sm hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-1.5 sm:gap-2"
                    >
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="hidden xs:inline">Nuevo Mensaje</span>
                      <span className="xs:hidden">Nuevo</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowArchived(!showArchived)
                        setSelectedConversation(null)
                        setIsComposing(false)
                        setSelectedRecipient(null)
                      }}
                      className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium flex items-center justify-center gap-1 sm:gap-1.5 ${showArchived
                        ? 'btn btn-primary text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700 dark:border-slate-700'
                        }`}
                      title={showArchived ? 'Ver activos' : 'Ver archivados'}
                    >
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      <span className="hidden sm:inline">{showArchived ? 'Activos' : 'Archivados'}</span>
                    </button>
                  </div>
                </div>


                {/* Lista de conversaciones */}
                <div className="flex-1 overflow-y-auto bg-white/90 dark:bg-slate-900/40 rounded-2xl border border-gray-100/80 dark:border-slate-800/60 backdrop-blur-xl">
                  {conversations.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">{showArchived ? 'No hay conversaciones archivadas' : 'No hay conversaciones aún'}</p>
                      <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{showArchived ? 'Las conversaciones archivadas aparecerán aquí' : 'Comienza una nueva conversación'}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-slate-800/60">
                      {filteredConversations.map((conv) => (
                        <div
                          key={conv.contactId}
                          className={`relative group transition-all duration-200 ${selectedConversation?.contactId === conv.contactId
                            ? 'bg-primary/5 dark:bg-primary/15 border-l-4 border-primary/80 dark:border-primary/60'
                            : 'border-l-4 border-transparent hover:bg-white dark:hover:bg-slate-800/60'
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
                            className="w-full p-4 transition-colors text-left bg-transparent"
                            type="button"
                          >
                            <div className="flex items-start gap-2 sm:gap-3">
                              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${selectedConversation?.contactId === conv.contactId
                                ? 'bg-primary text-white'
                                : 'bg-gradient-to-br from-primary/10 to-primary/5 text-primary'
                                }`}>
                                <span className="font-bold text-sm sm:text-base">
                                  {conv.contactName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-1.5 sm:gap-2 mb-1 sm:mb-1.5">
                                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                                    <p className="font-semibold text-gray-900 text-xs sm:text-sm truncate">{conv.contactName}</p>
                                    <span className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium flex-shrink-0 ${getRoleBadgeColor(conv.contactRole)}`}>
                                      {getRoleLabel(conv.contactRole)}
                                    </span>
                                    {conv.archived && !conv.deleted && (
                                      <span className="text-[10px] sm:text-xs text-gray-400 flex-shrink-0">📁</span>
                                    )}
                                  </div>
                                  {conv.unreadCount > 0 && !conv.archived && !conv.deleted && (
                                    <span className="bg-primary text-white text-[10px] sm:text-xs font-bold rounded-full min-w-[18px] sm:min-w-[20px] h-[18px] sm:h-5 px-1 sm:px-1.5 flex items-center justify-center flex-shrink-0 shadow-sm">
                                      {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate mb-0.5 sm:mb-1">{conv.lastMessage || 'Sin mensajes'}</p>
                                <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 font-medium">{formatTime(conv.lastMessageTime)}</p>
                              </div>
                            </div>
                          </button>

                          {/* Botones de acción al hacer hover - diseño profesional */}
                              {hoveredConversation === conv.contactId && !conv.deleted && (
                                <div
                                  className="absolute top-3 right-3 flex gap-1 bg-white dark:bg-slate-900/90 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 p-1.5 z-10"
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
                                  className="p-2 hover:bg-primary/10 rounded-md transition-all duration-200 text-gray-600 hover:text-primary"
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
                                  className="p-2 hover:bg-primary/10 rounded-md transition-all duration-200 text-gray-600 hover:text-primary"
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
                                className="p-2 hover:bg-red-50 rounded-md transition-all duration-200 text-gray-600 hover:text-red-600"
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
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Vista de mensajes - visible en móvil cuando hay conversación seleccionada o se está componiendo */}
              <div className={`${selectedConversation || isComposing ? 'flex' : 'hidden sm:flex'} flex-1 flex-col bg-white/95 dark:bg-slate-900/35 backdrop-blur-lg`}>
                {selectedConversation || isComposing ? (
                  <>
                    {/* Header de conversación profesional */}
                    <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-slate-800 bg-gradient-to-r from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center gap-2 sm:gap-3">
                      {/* Botón volver - solo visible en móvil */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedConversation(null)
                          setIsComposing(false)
                          setSelectedRecipient(null)
                        }}
                        className="sm:hidden p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition-all duration-200 flex-shrink-0 active:scale-95 touch-manipulation"
                        aria-label="Volver"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <div className="flex-1 min-w-0">
                        {selectedConversation ? (
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-primary/80 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                              <span className="text-white font-bold text-sm sm:text-base">
                                {selectedConversation.contactName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-gray-900 text-sm sm:text-base truncate">{selectedConversation.contactName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`inline-block px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-semibold ${getRoleBadgeColor(selectedConversation.contactRole)}`}>
                                  {getRoleLabel(selectedConversation.contactRole)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : selectedRecipient ? (
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-primary/80 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                              <span className="text-white font-bold text-sm sm:text-base">
                                {selectedRecipient.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-gray-900 text-sm sm:text-base truncate">{selectedRecipient.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`inline-block px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-semibold ${getRoleBadgeColor(selectedRecipient.role)}`}>
                                  {getRoleLabel(selectedRecipient.role)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : isComposing ? (
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-gray-900 text-sm sm:text-base">Nuevo mensaje</p>
                              <p className="text-[10px] sm:text-xs text-gray-500 font-medium mt-0.5">Selecciona un destinatario</p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Mensajes o Lista de contactos */}
                    <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 bg-gray-50/50 dark:bg-slate-900/30">
                      {/* Lista de contactos cuando se está componiendo sin destinatario */}
                      {isComposing && !selectedRecipient && !selectedConversation && (
                        <div className="space-y-2 sm:space-y-3">
                          <div className="mb-3 sm:mb-4">
                            <p className="text-sm sm:text-base font-bold text-gray-900 mb-1">Seleccionar destinatario</p>
                            <p className="text-[10px] sm:text-xs text-gray-500">Elige con quién quieres iniciar una conversación</p>
                          </div>
                          {availableContacts.length === 0 ? (
                            <div className="text-center py-8 sm:py-12">
                              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                              </div>
                              <p className="text-gray-500 font-medium text-xs sm:text-sm">No hay contactos disponibles</p>
                              <p className="text-gray-400 text-[10px] sm:text-xs mt-1">Cargando contactos...</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                              {availableContacts.map((contact) => (
                                <button
                                  key={contact.id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleStartNewConversation(contact)
                                  }}
                                  className="w-full p-3 sm:p-4 hover:bg-white dark:hover:bg-slate-800 rounded-lg sm:rounded-xl text-left transition-all duration-200 border border-gray-200 dark:border-slate-700 hover:border-primary/30 dark:hover:border-primary/40 hover:shadow-md active:scale-[0.98] bg-white dark:bg-slate-900/60 touch-manipulation"
                                  type="button"
                                >
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                                      <span className="text-primary text-sm sm:text-base font-bold">
                                        {contact.name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{contact.name}</p>
                                      <span className={`inline-block px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium mt-0.5 sm:mt-1 ${getRoleBadgeColor(contact.role)}`}>
                                        {getRoleLabel(contact.role)}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {selectedConversation && selectedConversation.messages.length === 0 && !isComposing && (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                          <p className="text-gray-500 font-medium text-sm">No hay mensajes en esta conversación</p>
                          <p className="text-gray-400 text-xs mt-1">Inicia la conversación enviando un mensaje</p>
                        </div>
                      )}
                      {isComposing && selectedRecipient && !selectedConversation && (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                          <p className="text-gray-500 font-medium text-sm">Inicia la conversación</p>
                          <p className="text-gray-400 text-xs mt-1">Escribe un mensaje para comenzar</p>
                        </div>
                      )}
                      {selectedConversation?.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.fromId === userId ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}
                        >
                          <div
                            className={`max-w-[90%] xs:max-w-[85%] sm:max-w-[75%] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-sm ${msg.fromId === userId
                              ? 'bg-gradient-to-br from-primary to-primary/90 text-white'
                              : 'bg-slate-50 dark:bg-slate-800/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-slate-700'
                              }`}
                          >
                            {msg.subject && msg.subject !== 'Mensaje' && (
                              <p className={`text-[10px] sm:text-xs font-bold mb-1.5 sm:mb-2 pb-1.5 sm:pb-2 border-b ${msg.fromId === userId ? 'text-white/90 border-white/20' : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700'}`}>
                                {msg.subject}
                              </p>
                            )}
                            <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words">{msg.message}</p>
                            <p className={`text-[10px] sm:text-xs mt-1.5 sm:mt-2 font-medium ${msg.fromId === userId ? 'text-white/70' : 'text-gray-400'}`}>
                              {formatTime(msg.createdAt)}
                            </p>
                            {msg.reply && (
                              <div className={`mt-2 sm:mt-3 p-2 sm:p-3 rounded-lg border ${msg.fromId === userId ? 'bg-white/20 border-white/30' : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700'}`}>
                                <p className={`text-[10px] sm:text-xs font-bold mb-1 sm:mb-1.5 ${msg.fromId === userId ? 'text-white/90' : 'text-gray-600 dark:text-gray-300'}`}>Respuesta:</p>
                                <p className={`text-[10px] sm:text-xs leading-relaxed break-words ${msg.fromId === userId ? 'text-white/90' : 'text-gray-700 dark:text-gray-200'}`}>{msg.reply}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input de mensaje profesional */}
                    <form onSubmit={handleSendMessage} className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/45 backdrop-blur-xl safe-area-inset-bottom">
                      {isComposing && !selectedConversation && (
                        <div className="mb-2 sm:mb-3">
                          <label className="block text-[10px] sm:text-xs font-semibold text-gray-600 mb-1 sm:mb-1.5">Asunto (opcional)</label>
                          <input
                            type="text"
                            value={newMessageSubject}
                            onChange={(e) => setNewMessageSubject(e.target.value)}
                            placeholder="Ej: Consulta sobre plan nutricional"
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                          />
                        </div>
                      )}
                      <div className="flex gap-2 sm:gap-3 items-end">
                        <div className="flex-1">
                          <textarea
                            value={newMessageText}
                            onChange={(e) => setNewMessageText(e.target.value)}
                            placeholder={selectedRecipient ? "Escribe tu mensaje aquí..." : "Selecciona un destinatario primero"}
                            disabled={!selectedRecipient && isComposing}
                            rows={1}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-slate-800/40 disabled:cursor-not-allowed resize-none transition-all min-h-[44px] sm:min-h-[48px] max-h-[120px] touch-manipulation bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                if (newMessageText.trim() && selectedRecipient) {
                                  handleSendMessage(e as any)
                                }
                              }
                            }}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={!newMessageText.trim() || (!selectedRecipient && isComposing)}
                          className="btn btn-primary flex-shrink-0 touch-manipulation min-w-[44px] min-h-[44px]"
                          aria-label="Enviar mensaje"
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    </>
  )
}
