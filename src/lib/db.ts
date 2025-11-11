/**
 * Utilidades para trabajar con la base de datos Supabase
 * Funciones helper para operaciones comunes
 */

import { supabase } from './supabase'
import type { User } from './types'

// Tipos de base de datos (basados en el esquema SQL)
export interface DatabaseUser {
  id: string
  email: string
  password_hash: string
  role: 'admin' | 'suscriptor' | 'nutricionista' | 'repartidor'
  name: string
  phone?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface DatabaseProfile {
  id: string
  user_id: string
  subscription_status: 'active' | 'inactive' | 'expired'
  subscription_end_date?: string
  goals_weight?: number
  goals_calories?: number
  goals_water?: number
  address?: string
  delivery_instructions?: string
  created_at: string
  updated_at: string
}

export interface DatabaseAppointment {
  id: string
  user_id: string | null
  nutricionista_id?: string | null
  date_time: string
  status: 'pendiente' | 'confirmada' | 'completada' | 'cancelada'
  notes?: string | null
  google_calendar_event_id?: string | null
  created_at: string
  updated_at: string
}

export interface DatabaseOrder {
  id: string
  user_id: string
  status: 'pendiente' | 'preparando' | 'en_camino' | 'entregado' | 'cancelado'
  total_amount: number
  delivery_address?: string
  delivery_instructions?: string
  repartidor_id?: string
  estimated_delivery_time?: string
  actual_delivery_time?: string
  created_at: string
  updated_at: string
}

export interface DatabaseProgress {
  id: string
  user_id: string
  date: string
  weight?: number
  calories?: number
  water?: number
  protein?: number
  carbs?: number
  fats?: number
  mood?: string
  sleep_hours?: number
  steps?: number
  notes?: string
  created_at: string
  updated_at: string
}

// Funciones para usuarios
export async function getUserByEmail(email: string): Promise<DatabaseUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single()

  if (error || !data) return null
  return data as DatabaseUser
}

export async function getUserById(id: string): Promise<DatabaseUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as DatabaseUser
}

export async function createUser(userData: {
  email: string
  password_hash: string
  role: 'admin' | 'suscriptor' | 'nutricionista' | 'repartidor'
  name: string
  phone?: string
}): Promise<DatabaseUser | null> {
  const { data, error } = await supabase
    .from('users')
    .insert({
      email: userData.email.toLowerCase(),
      password_hash: userData.password_hash,
      role: userData.role,
      name: userData.name,
      phone: userData.phone,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating user:', error)
    return null
  }
  return data as DatabaseUser
}

export async function getAllUsers(): Promise<DatabaseUser[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching users:', error)
    return []
  }
  return data as DatabaseUser[]
}

export async function getUsersByRole(
  role: 'admin' | 'suscriptor' | 'nutricionista' | 'repartidor'
): Promise<DatabaseUser[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', role)
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching users by role:', error)
    return []
  }
  return data as DatabaseUser[]
}

// Funciones para perfiles
export async function getProfileByUserId(userId: string): Promise<DatabaseProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null
  return data as DatabaseProfile
}

export async function createOrUpdateProfile(
  userId: string,
  profileData: Partial<DatabaseProfile>
): Promise<DatabaseProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: userId,
        ...profileData,
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating/updating profile:', error)
    return null
  }
  return data as DatabaseProfile
}

// Funciones para citas
export async function createAppointment(
  appointmentData: Omit<DatabaseAppointment, 'id' | 'created_at' | 'updated_at'>
): Promise<DatabaseAppointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .insert(appointmentData)
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating appointment:', error)
    return null
  }
  return data as DatabaseAppointment
}

export async function getAppointmentById(appointmentId: string): Promise<DatabaseAppointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single()

  if (error || !data) {
    if (error?.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching appointment:', error)
    return null
  }
  return data as DatabaseAppointment
}

export async function getAppointmentsByUserId(userId: string): Promise<DatabaseAppointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', userId)
    .order('date_time', { ascending: false })

  if (error || !data) {
    console.error('Error fetching appointments:', error)
    return []
  }
  return data as DatabaseAppointment[]
}

// Funciones para pedidos
export async function createOrder(
  orderData: Omit<DatabaseOrder, 'id' | 'created_at' | 'updated_at'>
): Promise<DatabaseOrder | null> {
  const { data, error } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating order:', error)
    return null
  }
  return data as DatabaseOrder
}

export async function getOrdersByUserId(userId: string): Promise<DatabaseOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching orders:', error)
    return []
  }
  return data as DatabaseOrder[]
}

// Funciones para progreso
export async function createOrUpdateProgress(
  userId: string,
  date: string,
  progressData: Partial<DatabaseProgress>
): Promise<DatabaseProgress | null> {
  const { data, error } = await supabase
    .from('progress')
    .upsert(
      {
        user_id: userId,
        date,
        ...progressData,
      },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating/updating progress:', error)
    return null
  }
  return data as DatabaseProgress
}

export async function getProgressByUserId(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<DatabaseProgress[]> {
  let query = supabase
    .from('progress')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (startDate) {
    query = query.gte('date', startDate)
  }
  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error('Error fetching progress:', error)
    return []
  }
  return data as DatabaseProgress[]
}

// Funciones adicionales para usuarios
export async function updateUser(
  userId: string,
  userData: Partial<DatabaseUser>
): Promise<DatabaseUser | null> {
  const { data, error } = await supabase
    .from('users')
    .update(userData)
    .eq('id', userId)
    .select()
    .single()

  if (error || !data) {
    console.error('Error updating user:', error)
    return null
  }
  return data as DatabaseUser
}

export async function deleteUser(userId: string): Promise<boolean> {
  const { error } = await supabase.from('users').delete().eq('id', userId)
  if (error) {
    console.error('Error deleting user:', error)
    return false
  }
  return true
}

// Funciones para meals (menú)
export interface DatabaseMeal {
  id: string
  name: string
  description?: string
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  calories: number
  protein?: number
  carbs?: number
  fats?: number
  ingredients?: string[]
  instructions?: string
  image_url?: string
  price?: number
  available: boolean
  created_at: string
  updated_at: string
}

export async function getAllMeals(): Promise<DatabaseMeal[]> {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching meals:', error)
    return []
  }
  return data as DatabaseMeal[]
}

export async function getMealById(id: string): Promise<DatabaseMeal | null> {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as DatabaseMeal
}

export async function createMeal(
  mealData: Omit<DatabaseMeal, 'id' | 'created_at' | 'updated_at'>
): Promise<DatabaseMeal | null> {
  const { data, error } = await supabase
    .from('meals')
    .insert(mealData)
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating meal:', error)
    return null
  }
  return data as DatabaseMeal
}

export async function updateMeal(
  mealId: string,
  mealData: Partial<DatabaseMeal>
): Promise<DatabaseMeal | null> {
  const { data, error } = await supabase
    .from('meals')
    .update(mealData)
    .eq('id', mealId)
    .select()
    .single()

  if (error || !data) {
    console.error('Error updating meal:', error)
    return null
  }
  return data as DatabaseMeal
}

export async function deleteMeal(mealId: string): Promise<boolean> {
  const { error } = await supabase.from('meals').delete().eq('id', mealId)
  if (error) {
    console.error('Error deleting meal:', error)
    return false
  }
  return true
}

// Funciones adicionales para pedidos
export async function getAllOrders(): Promise<DatabaseOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching orders:', error)
    return []
  }
  return data as DatabaseOrder[]
}

export async function getOrderById(id: string): Promise<DatabaseOrder | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as DatabaseOrder
}

export interface DatabaseOrderItem {
  id: string
  order_id: string
  meal_id?: string
  quantity: number
  price: number
  created_at: string
}

export async function getOrderItemsByOrderId(orderId: string): Promise<DatabaseOrderItem[]> {
  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)

  if (error || !data) {
    console.error('Error fetching order items:', error)
    return []
  }
  return data as DatabaseOrderItem[]
}

export async function getOrderItemsByOrderIds(orderIds: string[]): Promise<DatabaseOrderItem[]> {
  if (orderIds.length === 0) return []
  
  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .in('order_id', orderIds)

  if (error || !data) {
    console.error('Error fetching order items:', error)
    return []
  }
  return data as DatabaseOrderItem[]
}

export async function updateOrder(
  orderId: string,
  orderData: Partial<DatabaseOrder>
): Promise<DatabaseOrder | null> {
  const { data, error } = await supabase
    .from('orders')
    .update(orderData)
    .eq('id', orderId)
    .select()
    .single()

  if (error || !data) {
    console.error('Error updating order:', error)
    return null
  }
  return data as DatabaseOrder
}

export async function getOrdersByRepartidorId(repartidorId: string): Promise<DatabaseOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('repartidor_id', repartidorId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching orders by repartidor:', error)
    return []
  }
  return data as DatabaseOrder[]
}

// Funciones adicionales para citas
export async function getAllAppointments(): Promise<DatabaseAppointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('date_time', { ascending: false })

  if (error || !data) {
    console.error('Error fetching appointments:', error)
    return []
  }
  return data as DatabaseAppointment[]
}

// Verificar si hay conflictos de horario para una cita
export async function checkAppointmentConflict(
  dateTime: string,
  excludeAppointmentId?: string,
  nutricionistaId?: string | null,
  userId?: string | null
): Promise<{ hasConflict: boolean; conflictReason?: string }> {
  try {
    const appointmentDate = new Date(dateTime)
    
    // Normalizar la fecha para comparación: redondear a minutos (ignorar segundos y milisegundos)
    const normalizedDate = new Date(appointmentDate)
    normalizedDate.setSeconds(0, 0)
    normalizedDate.setMilliseconds(0)
    
    // Calcular rango de tiempo: desde el inicio del minuto hasta el final del minuto
    // Esto asegura que detectemos citas en el mismo minuto, incluso con diferencias de segundos/milisegundos
    const startRange = new Date(normalizedDate)
    const endRange = new Date(normalizedDate)
    endRange.setSeconds(59, 999) // Hasta el final del minuto
    
    // Buscar citas en el mismo rango de tiempo (misma fecha y hora, ignorando segundos y milisegundos)
    // Usamos gte (greater than or equal) y lte (less than or equal) para el rango
    const { data: conflictingAppointments, error } = await supabase
      .from('appointments')
      .select('*')
      .gte('date_time', startRange.toISOString())
      .lte('date_time', endRange.toISOString())
      .neq('status', 'cancelada') // Ignorar citas canceladas

    if (error) {
      console.error('Error checking appointment conflict:', error)
      return { hasConflict: false } // En caso de error, permitir la cita
    }

    if (!conflictingAppointments || conflictingAppointments.length === 0) {
      return { hasConflict: false }
    }

    // Filtrar la cita actual si se está actualizando
    const otherAppointments = excludeAppointmentId
      ? conflictingAppointments.filter(apt => apt.id !== excludeAppointmentId)
      : conflictingAppointments

    if (otherAppointments.length === 0) {
      return { hasConflict: false }
    }

    // IMPORTANTE: No permitir duplicados en la misma fecha y hora, independientemente de los datos
    // Esto previene que se creen múltiples citas en el mismo horario, incluso con los mismos datos
    // Verificar conflictos con el nutricionista
    if (nutricionistaId) {
      const nutricionistaConflict = otherAppointments.find(
        apt => apt.nutricionista_id === nutricionistaId
      )
      if (nutricionistaConflict) {
        return {
          hasConflict: true,
          conflictReason: 'El nutricionista ya tiene una cita en este horario'
        }
      }
    }

    // Verificar conflictos con el usuario
    if (userId) {
      const userConflict = otherAppointments.find(
        apt => apt.user_id === userId
      )
      if (userConflict) {
        return {
          hasConflict: true,
          conflictReason: 'Ya tienes una cita en este horario'
        }
      }
    }

    // REGLA PRINCIPAL: Si hay citas en el mismo horario (misma fecha y hora), es un conflicto
    // Esto previene duplicados incluso si son con los mismos datos o diferentes usuarios/nutricionistas
    // No puede haber múltiples citas en la misma fecha y hora
    return {
      hasConflict: true,
      conflictReason: 'Ya existe una cita en este horario. No se pueden crear citas duplicadas en la misma fecha y hora.'
    }
  } catch (error) {
    console.error('Error checking appointment conflict:', error)
    return { hasConflict: false } // En caso de error, permitir la cita
  }
}

export async function getAppointmentsByNutricionistaId(
  nutricionistaId: string
): Promise<DatabaseAppointment[]> {
  // Incluir citas asignadas a este nutricionista O citas sin nutricionista asignado (pendientes)
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .or(`nutricionista_id.eq.${nutricionistaId},nutricionista_id.is.null`)
    .order('date_time', { ascending: false })

  if (error || !data) {
    console.error('Error fetching appointments by nutricionista:', error)
    return []
  }
  return data as DatabaseAppointment[]
}

export async function updateAppointment(
  appointmentId: string,
  appointmentData: Partial<DatabaseAppointment>
): Promise<DatabaseAppointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .update(appointmentData)
    .eq('id', appointmentId)
    .select()
    .single()

  if (error || !data) {
    console.error('Error updating appointment:', error)
    return null
  }
  return data as DatabaseAppointment
}

export async function deleteAppointment(appointmentId: string): Promise<boolean> {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', appointmentId)

  if (error) {
    console.error('Error deleting appointment:', error)
    return false
  }
  return true
}

// Funciones para mensajes
export interface DatabaseMessage {
  id: string
  from_user_id: string
  to_user_id: string
  subject?: string
  message: string
  reply?: string
  read: boolean
  created_at: string
  updated_at: string
}

export async function createMessage(
  messageData: Omit<DatabaseMessage, 'id' | 'created_at' | 'updated_at'>
): Promise<any | null> {
  try {

    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()

    if (error) {
      console.error('Error creating message:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      return null
    }

    if (!data) {
      console.error('No data returned from message creation')
      return null
    }


    // Enriquecer el mensaje con datos de usuarios
    const userIds = [data.from_user_id, data.to_user_id].filter(Boolean)
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name, email, role')
        .in('id', userIds)

      if (users) {
        const usersMap = new Map(users.map((u: any) => [u.id, u]))
        const fromUser = usersMap.get(data.from_user_id)
        const toUser = usersMap.get(data.to_user_id)

        return {
          ...data,
          from_id: data.from_user_id,
          to_id: data.to_user_id,
          from_name: fromUser?.name || '',
          from_email: fromUser?.email || '',
          from_role: fromUser?.role || '',
          to_name: toUser?.name || '',
          to_email: toUser?.email || '',
          to_role: toUser?.role || '',
        }
      }
    }

    return {
      ...data,
      from_id: data.from_user_id,
      to_id: data.to_user_id,
      from_name: '',
      from_email: '',
      from_role: '',
      to_name: '',
      to_email: '',
      to_role: '',
    }
  } catch (error) {
    console.error('Exception in createMessage:', error)
    return null
  }
}

export async function getMessagesByUserId(userId: string): Promise<any[]> {
  try {
    // Obtener mensajes donde el usuario es remitente o destinatario
    // Usar dos consultas separadas para mayor compatibilidad y claridad
    const { data: messagesSent, error: sentError } = await supabase
      .from('messages')
      .select('*')
      .eq('from_user_id', userId)
      .order('created_at', { ascending: false })

    const { data: messagesReceived, error: receivedError } = await supabase
      .from('messages')
      .select('*')
      .eq('to_user_id', userId)
      .order('created_at', { ascending: false })

    if (sentError) {
      console.error('Error fetching sent messages:', sentError)
    }
    if (receivedError) {
      console.error('Error fetching received messages:', receivedError)
    }


    // Combinar y deduplicar mensajes (un mensaje puede aparecer en ambas listas si from = to, aunque no debería)
    const messagesMap = new Map()
    if (messagesSent) {
      messagesSent.forEach((msg: any) => messagesMap.set(msg.id, msg))
    }
    if (messagesReceived) {
      messagesReceived.forEach((msg: any) => messagesMap.set(msg.id, msg))
    }

    const messages = Array.from(messagesMap.values())
      .sort((a: any, b: any) => {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return dateB - dateA // Orden descendente (más recientes primero)
      })

    if (!messages || messages.length === 0) {
      return []
    }

    // Obtener todos los IDs de usuarios únicos
    const userIds = new Set<string>()
    messages.forEach((msg: any) => {
      if (msg.from_user_id) userIds.add(msg.from_user_id)
      if (msg.to_user_id) userIds.add(msg.to_user_id)
    })

    // Obtener datos de usuarios solo si hay IDs
    let usersMap = new Map<string, any>()
    if (userIds.size > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, role')
        .in('id', Array.from(userIds))

      if (usersError) {
        console.error('Error fetching users for messages:', usersError)
      } else if (users) {
        users.forEach((user: any) => {
          usersMap.set(user.id, user)
        })
      }
    }

    // Combinar mensajes con datos de usuarios
    return messages.map((msg: any) => {
      const fromUser = usersMap.get(msg.from_user_id)
      const toUser = usersMap.get(msg.to_user_id)
      
      return {
        ...msg,
        from_id: msg.from_user_id,
        to_id: msg.to_user_id,
        from_name: fromUser?.name || '',
        from_email: fromUser?.email || '',
        from_role: fromUser?.role || '',
        to_name: toUser?.name || '',
        to_email: toUser?.email || '',
        to_role: toUser?.role || '',
      }
    })
  } catch (error) {
    console.error('Exception in getMessagesByUserId:', error)
    return []
  }
}

export async function updateMessage(
  messageId: string,
  messageData: Partial<DatabaseMessage>
): Promise<any | null> {
  const { data, error } = await supabase
    .from('messages')
    .update(messageData)
    .eq('id', messageId)
    .select()
    .single()

  if (error || !data) {
    console.error('Error updating message:', error)
    return null
  }

  // Enriquecer el mensaje con datos de usuarios
  const userIds = [data.from_user_id, data.to_user_id].filter(Boolean)
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email, role')
      .in('id', userIds)

    if (users) {
      const usersMap = new Map(users.map((u: any) => [u.id, u]))
      const fromUser = usersMap.get(data.from_user_id)
      const toUser = usersMap.get(data.to_user_id)

      return {
        ...data,
        from_id: data.from_user_id,
        to_id: data.to_user_id,
        from_name: fromUser?.name || '',
        from_email: fromUser?.email || '',
        from_role: fromUser?.role || '',
        to_name: toUser?.name || '',
        to_email: toUser?.email || '',
        to_role: toUser?.role || '',
      }
    }
  }

  return {
    ...data,
    from_id: data.from_user_id,
    to_id: data.to_user_id,
    from_name: '',
    from_email: '',
    from_role: '',
    to_name: '',
    to_email: '',
    to_role: '',
  }
}

// Eliminar todos los mensajes de una conversación entre dos usuarios
export async function deleteMessagesByConversation(
  userId1: string,
  userId2: string
): Promise<boolean> {
  // Eliminar mensajes donde userId1 es remitente y userId2 es destinatario
  const { error: error1 } = await supabase
    .from('messages')
    .delete()
    .eq('from_user_id', userId1)
    .eq('to_user_id', userId2)

  // Eliminar mensajes donde userId2 es remitente y userId1 es destinatario
  const { error: error2 } = await supabase
    .from('messages')
    .delete()
    .eq('from_user_id', userId2)
    .eq('to_user_id', userId1)

  if (error1 || error2) {
    console.error('Error deleting messages by conversation:', error1 || error2)
    return false
  }
  return true
}

// Funciones para planes nutricionales
export interface DatabaseMealPlan {
  id: string
  name: string
  description?: string
  nutricionista_id?: string
  user_id?: string
  start_date: string
  end_date: string
  total_calories?: number
  status: 'active' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

export async function createMealPlan(
  planData: Omit<DatabaseMealPlan, 'id' | 'created_at' | 'updated_at'>
): Promise<DatabaseMealPlan | null> {
  const { data, error } = await supabase
    .from('meal_plans')
    .insert(planData)
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating meal plan:', error)
    return null
  }
  return data as DatabaseMealPlan
}

export async function getMealPlanByUserId(userId: string): Promise<DatabaseMealPlan | null> {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)

  // .single() lanza error si no hay resultados, así que usamos el primer elemento del array
  if (error || !data || data.length === 0) return null
  return data[0] as DatabaseMealPlan
}

export async function updateMealPlan(
  planId: string,
  planData: Partial<DatabaseMealPlan>
): Promise<DatabaseMealPlan | null> {
  const { data, error } = await supabase
    .from('meal_plans')
    .update(planData)
    .eq('id', planId)
    .select()
    .single()

  if (error || !data) {
    console.error('Error updating meal plan:', error)
    return null
  }
  return data as DatabaseMealPlan
}

// Eliminar plan asignado a un usuario
export async function deleteMealPlanByUserId(userId: string): Promise<boolean> {
  try {
    // Obtener el plan activo del usuario
    const plan = await getMealPlanByUserId(userId)
    
    if (!plan || !plan.id) {
      console.log('No active plan found for user:', userId)
      // Si no hay plan, consideramos esto como éxito (ya no tiene plan)
      return true
    }

    console.log('Deleting plan:', plan.id, 'for user:', userId)

    // Eliminar el plan (CASCADE eliminará días y comidas automáticamente)
    const { data, error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', plan.id)
      .eq('user_id', userId)
      .select()

    if (error) {
      console.error('Error deleting meal plan:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      return false
    }

    // Verificar que se eliminó correctamente
    if (data && data.length > 0) {
      console.log('Plan deleted successfully. Deleted rows:', data.length)
      
      // Esperar un momento para que la eliminación se propague
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Verificar que ya no existe
      const verifyPlan = await getMealPlanByUserId(userId)
      if (verifyPlan && verifyPlan.id === plan.id) {
        console.warn('Plan still exists after deletion! Plan ID:', verifyPlan.id)
        return false
      }
      
      console.log('Plan deletion verified successfully')
      return true
    } else {
      // No se eliminaron filas, pero puede ser que ya no exista
      console.log('No rows deleted. Verifying if plan still exists...')
      const verifyPlan = await getMealPlanByUserId(userId)
      if (!verifyPlan) {
        console.log('Plan does not exist, deletion successful (already deleted)')
        return true
      }
      console.warn('Plan still exists after delete attempt. Plan ID:', verifyPlan.id)
      return false
    }
  } catch (error: any) {
    console.error('Exception in deleteMealPlanByUserId:', error)
    console.error('Exception details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    return false
  }
}

// Funciones para días del plan
export interface DatabaseMealPlanDay {
  id: string
  meal_plan_id: string
  day_name: string
  day_number: number
  total_calories?: number
  created_at: string
}

export async function createMealPlanDay(
  dayData: Omit<DatabaseMealPlanDay, 'id' | 'created_at'>
): Promise<DatabaseMealPlanDay | null> {
  const { data, error } = await supabase
    .from('meal_plan_days')
    .insert(dayData)
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating meal plan day:', error)
    return null
  }
  return data as DatabaseMealPlanDay
}

// Funciones para comidas en días del plan
export interface DatabaseMealPlanDayMeal {
  id: string
  meal_plan_day_id: string
  meal_id: string
  meal_name: string
  meal_description?: string
  calories?: number
  order_index: number
  created_at: string
}

export async function createMealPlanDayMeal(
  mealData: Omit<DatabaseMealPlanDayMeal, 'id' | 'created_at'>
): Promise<DatabaseMealPlanDayMeal | null> {
  const { data, error } = await supabase
    .from('meal_plan_day_meals')
    .insert(mealData)
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating meal plan day meal:', error)
    return null
  }
  return data as DatabaseMealPlanDayMeal
}

export async function deleteMealPlanDayMeal(mealId: string): Promise<boolean> {
  const { error } = await supabase
    .from('meal_plan_day_meals')
    .delete()
    .eq('id', mealId)

  if (error) {
    console.error('Error deleting meal plan day meal:', error)
    return false
  }
  return true
}

// Función para obtener un plan completo con días y comidas
export async function getMealPlanWithDays(planId: string) {
  const { data: plan, error: planError } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('id', planId)
    .single()

  if (planError || !plan) {
    console.error('Error fetching meal plan:', planError)
    return null
  }

  const { data: days, error: daysError } = await supabase
    .from('meal_plan_days')
    .select(`
      *,
      meal_plan_day_meals (*)
    `)
    .eq('meal_plan_id', planId)
    .order('day_number', { ascending: true })

  if (daysError) {
    console.error('Error fetching meal plan days:', daysError)
    return { plan, days: [] }
  }

  // Normalizar meal_plan_day_meals para asegurar que sea un array
  const normalizedDays = (days || []).map((day: any) => {
    if (day.meal_plan_day_meals) {
      // Si es un array, dejarlo como está
      if (Array.isArray(day.meal_plan_day_meals)) {
        return day
      }
      // Si es un objeto, convertirlo a array
      if (typeof day.meal_plan_day_meals === 'object') {
        return {
          ...day,
          meal_plan_day_meals: Object.values(day.meal_plan_day_meals),
        }
      }
    }
    return { ...day, meal_plan_day_meals: [] }
  })

  return { plan, days: normalizedDays }
}

// Función para obtener planes creados por un nutricionista (sin asignar a cliente)
export async function getMealPlansByNutricionistaId(
  nutricionistaId: string
): Promise<DatabaseMealPlan[]> {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('nutricionista_id', nutricionistaId)
    .is('user_id', null) // Solo planes sin asignar
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching meal plans by nutricionista:', error)
    return []
  }
  return data as DatabaseMealPlan[]
}

// Función para copiar un plan completo (con días y comidas) a un cliente
export async function copyMealPlanToUser(
  sourcePlanId: string,
  userId: string,
  startDate: string,
  endDate: string
): Promise<DatabaseMealPlan | null> {
  try {
    // Obtener el plan fuente con días y comidas
    const sourcePlanData = await getMealPlanWithDays(sourcePlanId)
    if (!sourcePlanData || !sourcePlanData.plan) {
      console.error('Source plan not found for ID:', sourcePlanId)
      return null
    }

    const { plan: sourcePlan, days: sourceDays } = sourcePlanData

    // Crear el nuevo plan para el usuario
    const newPlan = await createMealPlan({
      name: sourcePlan.name,
      description: sourcePlan.description || null,
      nutricionista_id: sourcePlan.nutricionista_id,
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
      total_calories: sourcePlan.total_calories || null,
      status: 'active',
    })

    if (!newPlan || !newPlan.id) {
      console.error('Error creating new plan. Source plan:', sourcePlan)
      return null
    }

    // Copiar días y comidas
    for (const sourceDay of sourceDays || []) {
      // Crear el día
      const newDay = await createMealPlanDay({
        meal_plan_id: newPlan.id,
        day_name: sourceDay.day_name,
        day_number: sourceDay.day_number,
        total_calories: sourceDay.total_calories || null,
      })

      if (!newDay || !newDay.id) {
        console.error('Error creating day:', sourceDay)
        continue
      }

      // Copiar comidas del día
      const dayMeals = sourceDay.meal_plan_day_meals || []
      if (Array.isArray(dayMeals)) {
        for (const meal of dayMeals) {
          const mealResult = await createMealPlanDayMeal({
            meal_plan_day_id: newDay.id,
            meal_id: meal.meal_id,
            meal_name: meal.meal_name,
            meal_description: meal.meal_description || null,
            calories: meal.calories || null,
            order_index: meal.order_index || 0,
          })
          
          if (!mealResult) {
            console.error('Error creating meal for day:', meal, 'Day:', newDay.id)
          }
        }
      } else if (dayMeals && typeof dayMeals === 'object') {
        // Si meal_plan_day_meals es un objeto en lugar de array, convertirlo
        const mealsArray = Object.values(dayMeals)
        for (const meal of mealsArray) {
          const mealData = meal as any
          const mealResult = await createMealPlanDayMeal({
            meal_plan_day_id: newDay.id,
            meal_id: mealData.meal_id,
            meal_name: mealData.meal_name,
            meal_description: mealData.meal_description || null,
            calories: mealData.calories || null,
            order_index: mealData.order_index || 0,
          })
          
          if (!mealResult) {
            console.error('Error creating meal for day:', mealData, 'Day:', newDay.id)
          }
        }
      }
    }

    return newPlan
  } catch (error: any) {
    console.error('Error copying meal plan:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    throw error // Propagar el error para que el endpoint pueda manejarlo
  }
}

// Funciones para plantillas de planes
export interface DatabasePlanTemplate {
  id: string
  name: string
  description?: string
  nutricionista_id?: string
  focus?: string
  duration?: string
  audience?: string
  total_calories?: number
  is_public: boolean
  created_at: string
  updated_at: string
}

export async function getAllPlanTemplates(
  nutricionistaId?: string
): Promise<DatabasePlanTemplate[]> {
  let query = supabase.from('plan_templates').select('*')

  if (nutricionistaId) {
    query = query.or(`nutricionista_id.eq.${nutricionistaId},is_public.eq.true`)
  } else {
    query = query.eq('is_public', true)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching plan templates:', error)
    return []
  }
  return data as DatabasePlanTemplate[]
}

export async function createPlanTemplate(
  templateData: Omit<DatabasePlanTemplate, 'id' | 'created_at' | 'updated_at'>
): Promise<DatabasePlanTemplate | null> {
  console.log('Creating plan template with data:', JSON.stringify(templateData, null, 2))
  
  const { data, error } = await supabase
    .from('plan_templates')
    .insert(templateData)
    .select()
    .single()

  if (error) {
    console.error('Error creating plan template:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    console.error('Error details:', error.details)
    console.error('Error hint:', error.hint)
    // Propagar el error para que el endpoint pueda manejarlo
    throw error
  }
  
  if (!data) {
    console.error('No data returned from insert')
    return null
  }
  
  return data as DatabasePlanTemplate
}

// Función helper para verificar conexión a Supabase
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1)
    return !error
  } catch (error) {
    console.error('Supabase connection error:', error)
    return false
  }
}

// ==================== CREDENCIALES DE GOOGLE CALENDAR ====================

export interface DatabaseCalendarCredentials {
  id: string
  user_id: string
  access_token: string
  refresh_token?: string
  token_expiry?: string
  calendar_id: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export async function getCalendarCredentials(userId: string): Promise<DatabaseCalendarCredentials | null> {
  const { data, error } = await supabase
    .from('calendar_credentials')
    .select('*')
    .eq('user_id', userId)
    .eq('enabled', true)
    .single()

  if (error || !data) {
    if (error?.code === 'PGRST116') {
      // No se encontró registro
      return null
    }
    console.error('Error fetching calendar credentials:', error)
    return null
  }
  return data as DatabaseCalendarCredentials
}

export async function saveCalendarCredentials(
  userId: string,
  credentials: {
    access_token: string
    refresh_token?: string
    token_expiry?: string
    calendar_id?: string
  }
): Promise<DatabaseCalendarCredentials | null> {
  const { data, error } = await supabase
    .from('calendar_credentials')
    .upsert({
      user_id: userId,
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token || null,
      token_expiry: credentials.token_expiry || null,
      calendar_id: credentials.calendar_id || 'primary',
      enabled: true,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('Error saving calendar credentials:', error)
    return null
  }
  return data as DatabaseCalendarCredentials
}

export async function updateCalendarCredentials(
  userId: string,
  updates: Partial<DatabaseCalendarCredentials>
): Promise<DatabaseCalendarCredentials | null> {
  const { data, error } = await supabase
    .from('calendar_credentials')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()

  if (error || !data) {
    console.error('Error updating calendar credentials:', error)
    return null
  }
  return data as DatabaseCalendarCredentials
}

export async function disableCalendarCredentials(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('calendar_credentials')
    .update({ enabled: false })
    .eq('user_id', userId)

  if (error) {
    console.error('Error disabling calendar credentials:', error)
    return false
  }
  return true
}

// ==================== ASIGNACIÓN DE CLIENTES A NUTRICIONISTAS ====================

export interface DatabaseNutricionistaClient {
  id: string
  nutricionista_id: string
  client_id: string
  notes?: string
  created_at: string
  updated_at: string
}

export async function getClientsByNutricionistaId(
  nutricionistaId: string
): Promise<DatabaseNutricionistaClient[]> {
  const { data, error } = await supabase
    .from('nutricionista_clients')
    .select('*')
    .eq('nutricionista_id', nutricionistaId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching clients by nutricionista:', error)
    return []
  }
  return data as DatabaseNutricionistaClient[]
}

export async function assignClientToNutricionista(
  nutricionistaId: string,
  clientId: string,
  notes?: string
): Promise<DatabaseNutricionistaClient | null> {
  const { data, error } = await supabase
    .from('nutricionista_clients')
    .upsert(
      {
        nutricionista_id: nutricionistaId,
        client_id: clientId,
        notes: notes || null,
      },
      { onConflict: 'nutricionista_id,client_id' }
    )
    .select()
    .single()

  if (error || !data) {
    console.error('Error assigning client to nutricionista:', error)
    return null
  }
  return data as DatabaseNutricionistaClient
}

export async function removeClientFromNutricionista(
  nutricionistaId: string,
  clientId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('nutricionista_clients')
    .delete()
    .eq('nutricionista_id', nutricionistaId)
    .eq('client_id', clientId)

  if (error) {
    console.error('Error removing client from nutricionista:', error)
    return false
  }
  return true
}

export async function getNutricionistaByClientId(
  clientId: string
): Promise<DatabaseNutricionistaClient | null> {
  const { data, error } = await supabase
    .from('nutricionista_clients')
    .select('*')
    .eq('client_id', clientId)
    .single()

  if (error || !data) return null
  return data as DatabaseNutricionistaClient
}

// ==================== PREFERENCIAS DE CHAT ====================

export interface DatabaseChatPreference {
  id: string
  user_id: string
  contact_id: string
  is_archived: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export async function getChatPreferencesByUserId(
  userId: string
): Promise<DatabaseChatPreference[]> {
  const { data, error } = await supabase
    .from('user_chat_preferences')
    .select('*')
    .eq('user_id', userId)

  if (error) {
    // Si la tabla no existe, propagar el error para que la API lo maneje
    if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
      throw error
    }
    console.error('Error fetching chat preferences:', error)
    return []
  }
  
  return (data || []) as DatabaseChatPreference[]
}

export async function updateChatPreference(
  userId: string,
  contactId: string,
  preference: { is_archived?: boolean; is_deleted?: boolean }
): Promise<DatabaseChatPreference | null> {
  const { data, error } = await supabase
    .from('user_chat_preferences')
    .upsert(
      {
        user_id: userId,
        contact_id: contactId,
        is_archived: preference.is_archived ?? false,
        is_deleted: preference.is_deleted ?? false,
      },
      { onConflict: 'user_id,contact_id' }
    )
    .select()
    .single()

  if (error) {
    // Si la tabla no existe, propagar el error para que la API lo maneje
    if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
      throw error
    }
    console.error('Error updating chat preference:', error)
    return null
  }
  
  if (!data) return null
  return data as DatabaseChatPreference
}

// ==================== INCIDENCIAS DE PEDIDOS ====================

export interface DatabaseOrderIncident {
  id: string
  order_id: string
  repartidor_id: string
  description: string
  status: 'reported' | 'resolved' | 'cancelled'
  created_at: string
  updated_at: string
}

export async function createOrderIncident(
  incidentData: Omit<DatabaseOrderIncident, 'id' | 'created_at' | 'updated_at'>
): Promise<DatabaseOrderIncident | null> {
  const { data, error } = await supabase
    .from('order_incidents')
    .insert(incidentData)
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating order incident:', error)
    return null
  }
  return data as DatabaseOrderIncident
}

export async function getOrderIncidentsByRepartidorId(
  repartidorId: string
): Promise<DatabaseOrderIncident[]> {
  const { data, error } = await supabase
    .from('order_incidents')
    .select('*')
    .eq('repartidor_id', repartidorId)
    .eq('status', 'reported')
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching order incidents:', error)
    return []
  }
  return data as DatabaseOrderIncident[]
}

export async function getOrderIncidentByOrderId(
  orderId: string
): Promise<DatabaseOrderIncident | null> {
  const { data, error } = await supabase
    .from('order_incidents')
    .select('*')
    .eq('order_id', orderId)
    .eq('status', 'reported')
    .single()

  if (error || !data) return null
  return data as DatabaseOrderIncident
}

// ==================== CONFIGURACIONES DE USUARIO ====================

export interface DatabaseUserSettings {
  id: string
  user_id: string
  notifications_enabled: boolean
  notifications_new_messages: boolean
  notifications_order_updates: boolean
  notifications_plan_assignments: boolean
  notifications_appointments: boolean
  notifications_new_orders: boolean
  preferences_language: string
  preferences_theme: 'light' | 'dark' | 'auto'
  preferences_email_notifications: boolean
  created_at: string
  updated_at: string
}

export async function getUserSettings(userId: string): Promise<DatabaseUserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    // Si no existe, retornar null (se creará automáticamente al actualizar)
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching user settings:', error)
    return null
  }
  
  return data as DatabaseUserSettings
}

export async function updateUserSettings(
  userId: string,
  settings: Partial<Omit<DatabaseUserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<DatabaseUserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .upsert(
      {
        user_id: userId,
        ...settings,
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error || !data) {
    console.error('Error updating user settings:', error)
    return null
  }
  
  return data as DatabaseUserSettings
}

// ==================== HORARIOS DE NUTRICIONISTA ====================

export interface DatabaseNutritionistSchedule {
  id: string
  user_id: string
  monday_start_hour: number | null
  monday_end_hour: number | null
  monday_enabled: boolean
  tuesday_start_hour: number | null
  tuesday_end_hour: number | null
  tuesday_enabled: boolean
  wednesday_start_hour: number | null
  wednesday_end_hour: number | null
  wednesday_enabled: boolean
  thursday_start_hour: number | null
  thursday_end_hour: number | null
  thursday_enabled: boolean
  friday_start_hour: number | null
  friday_end_hour: number | null
  friday_enabled: boolean
  saturday_start_hour: number | null
  saturday_end_hour: number | null
  saturday_enabled: boolean
  sunday_start_hour: number | null
  sunday_end_hour: number | null
  sunday_enabled: boolean
  slot_duration_minutes: number
  created_at: string
  updated_at: string
}

export async function getNutritionistSchedule(
  userId: string
): Promise<DatabaseNutritionistSchedule | null> {
  const { data, error } = await supabase
    .from('nutritionist_schedule')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching nutritionist schedule:', error)
    return null
  }

  return data as DatabaseNutritionistSchedule | null
}

export async function createNutritionistSchedule(
  userId: string,
  schedule: Partial<Omit<DatabaseNutritionistSchedule, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<DatabaseNutritionistSchedule | null> {
  const { data, error } = await supabase
    .from('nutritionist_schedule')
    .insert({
      user_id: userId,
      ...schedule,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating nutritionist schedule:', error)
    return null
  }

  return data as DatabaseNutritionistSchedule
}

export async function updateNutritionistSchedule(
  userId: string,
  schedule: Partial<Omit<DatabaseNutritionistSchedule, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<DatabaseNutritionistSchedule | null> {
  const { data, error } = await supabase
    .from('nutritionist_schedule')
    .update(schedule)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating nutritionist schedule:', error)
    return null
  }

  return data as DatabaseNutritionistSchedule
}

export async function createOrUpdateNutritionistSchedule(
  userId: string,
  schedule: Partial<Omit<DatabaseNutritionistSchedule, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<DatabaseNutritionistSchedule | null> {
  // Primero intentar obtener el schedule existente
  const existing = await getNutritionistSchedule(userId)

  if (existing) {
    // Actualizar
    return await updateNutritionistSchedule(userId, schedule)
  } else {
    // Crear nuevo
    return await createNutritionistSchedule(userId, schedule)
  }
}

