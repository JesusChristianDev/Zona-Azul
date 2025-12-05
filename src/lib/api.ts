/**
 * Funciones cliente para llamar a las APIs
 * Reemplaza el uso de localStorage y datos mock
 */

// Tipos básicos
export interface ApiResponse<T> {
  data?: T
  error?: string
}

// Función helper para hacer requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(endpoint, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || `Error ${response.status}` }
    }

    return { data }
  } catch (error: any) {
    return { error: error.message || 'Error de conexión' }
  }
}

// ==================== USUARIOS ====================

export async function getUsers() {
  const response = await apiRequest<{ users: any[] }>('/api/users')
  return response.data?.users || []
}

export async function getUserById(id: string) {
  const response = await apiRequest<{ user: any }>(`/api/users/${id}`)
  return response.data?.user || null
}

export async function createUser(userData: {
  email: string
  password: string
  role: string
  name: string
  phone?: string
  subscription_status?: 'active' | 'inactive' | 'expired'
}) {
  const response = await apiRequest<{ user: any }>('/api/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  })
  
  if (response.error) {
    throw new Error(response.error)
  }
  
  return response.data?.user || null
}

export async function updateUser(id: string, userData: Partial<any>) {
  const response = await apiRequest<{ user: any }>(`/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(userData),
  })
  return response.data?.user || null
}

export async function deleteUser(id: string) {
  const response = await apiRequest<{ success: boolean }>(`/api/users/${id}`, {
    method: 'DELETE',
  })
  return response.data?.success || false
}

export async function getAvailableContacts() {
  const response = await apiRequest<{ contacts: any[] }>('/api/users/contacts')
  return response.data?.contacts || []
}

export async function getSubscribers() {
  const response = await apiRequest<{ subscribers: any[] }>('/api/subscribers')
  return response.data?.subscribers || []
}

export async function getNutritionists() {
  const response = await apiRequest<{ nutritionists: any[] }>('/api/nutritionists')
  return response.data?.nutritionists || []
}

// ==================== MEALS (CATÁLOGO GENERAL) ====================
// Nota: Las comidas se usan tanto para:
// - Menú del local (/menu): Solo las con available=true aparecen en la carta pública
// - Planes nutricionales: Todas las comidas del catálogo pueden usarse en planes

export async function getMeals() {
  const response = await apiRequest<{ meals: any[] }>('/api/meals')
  return response.data?.meals || []
}

export async function getMealById(id: string) {
  const response = await apiRequest<{ meal: any }>(`/api/meals/${id}`)
  return response.data?.meal || null
}

export async function createMeal(mealData: any) {
  const response = await apiRequest<{ meal: any }>('/api/meals', {
    method: 'POST',
    body: JSON.stringify(mealData),
  })
  return response.data?.meal || null
}

export async function updateMeal(id: string, mealData: Partial<any>) {
  const response = await apiRequest<{ meal: any }>(`/api/meals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(mealData),
  })
  return response.data?.meal || null
}

export async function deleteMeal(id: string) {
  const response = await apiRequest<{ success: boolean }>(`/api/meals/${id}`, {
    method: 'DELETE',
  })
  return response.data?.success || false
}

// ==================== PEDIDOS ====================

export async function getOrders() {
  const response = await apiRequest<{ orders: any[] }>('/api/orders')
  return response.data?.orders || []
}

export async function getOrderById(id: string) {
  const response = await apiRequest<{ order: any }>(`/api/orders/${id}`)
  return response.data?.order || null
}

export async function createOrder(orderData: {
  total_amount: number
  delivery_address?: string
  delivery_instructions?: string
  delivery_mode?: 'delivery' | 'pickup'
  delivery_address_id?: string
  pickup_location?: string
}) {
  const response = await apiRequest<{ order: any }>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  })
  return response.data?.order || null
}

export async function updateOrder(id: string, orderData: Partial<any>) {
  const response = await apiRequest<{ order: any }>(`/api/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(orderData),
  })
  return response.data?.order || null
}

// ==================== CITAS ====================

export async function getAppointments() {
  const response = await apiRequest<{ appointments: any[] }>('/api/appointments')
  return response.data?.appointments || []
}

export async function createAppointment(appointmentData: {
  date_time: string
  nutricionista_id?: string
  notes?: string
}) {
  const response = await apiRequest<{ appointment: any }>('/api/appointments/request', {
    method: 'POST',
    body: JSON.stringify(appointmentData),
  })
  return response.data?.appointment || null
}

export async function updateAppointment(id: string, appointmentData: Partial<any>) {
  const response = await apiRequest<{ appointment: any }>(`/api/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(appointmentData),
  })
  return response.data?.appointment || null
}

export async function deleteAppointment(id: string): Promise<boolean> {
  try {
    const response = await apiRequest<{ success: boolean; message?: string }>(`/api/appointments/${id}`, {
      method: 'DELETE',
    })
    return response.data?.success || false
  } catch (error) {
    console.error('Error deleting appointment:', error)
    return false
  }
}

// ==================== GOOGLE CALENDAR ====================

// Obtener URL de autorización de Google Calendar
export async function getCalendarAuthUrl() {
  try {
    const response = await apiRequest<{ authUrl: string }>('/api/calendar/auth')
    if (response.error) {
      console.error('Error getting auth URL:', response.error)
      throw new Error(response.error)
    }
    return response.data?.authUrl || null
  } catch (error: any) {
    console.error('Error in getCalendarAuthUrl:', error)
    throw error
  }
}

// Obtener disponibilidad del calendario
export async function getCalendarAvailability(nutricionistaId: string, timeMin: string, timeMax: string) {
  const response = await apiRequest<{ busyTimes: Array<{ start: string; end: string }> }>(
    `/api/calendar/availability?nutricionista_id=${nutricionistaId}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
  )
  return response.data?.busyTimes || []
}

// Obtener horarios de trabajo del nutricionista (para el nutricionista actual)
export async function getNutritionistSchedule() {
  const response = await apiRequest<{ schedule: any }>('/api/nutritionist/schedule')
  return response.data?.schedule || null
}

// Obtener horarios de trabajo de un nutricionista específico (público)
export async function getNutritionistScheduleById(nutricionistaId: string) {
  const response = await apiRequest<{ schedule: any }>(`/api/nutritionist/schedule/${nutricionistaId}`)
  return response.data?.schedule || null
}

// Actualizar horarios de trabajo del nutricionista
export async function updateNutritionistSchedule(schedule: any) {
  const response = await apiRequest<{ schedule: any }>('/api/nutritionist/schedule', {
    method: 'PATCH',
    body: JSON.stringify(schedule),
  })
  return response.data?.schedule || null
}

// ==================== PROGRESO ====================

export async function getProgress(startDate?: string, endDate?: string) {
  const params = new URLSearchParams()
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  
  const query = params.toString()
  const url = `/api/progress${query ? `?${query}` : ''}`
  
  const response = await apiRequest<{ progress: any[] }>(url)
  return response.data?.progress || []
}

export async function saveProgress(progressData: {
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
}) {
  const response = await apiRequest<{ progress: any }>('/api/progress', {
    method: 'POST',
    body: JSON.stringify(progressData),
  })
  return response.data?.progress || null
}

// ==================== MENSAJES ====================

export async function getMessages() {
  const response = await apiRequest<{ messages: any[] }>('/api/messages')
  return response.data?.messages || []
}

  export async function sendMessage(messageData: {
    to_user_id: string
    subject?: string
    message: string
  }) {
    try {
      const response = await apiRequest<{ message: any }>('/api/messages', {
        method: 'POST',
        body: JSON.stringify(messageData),
      })

      if (response.error) {
        console.error('API Error sending message:', response.error)
        return null
      }

      if (!response.data?.message) {
        console.error('API: No message returned from server')
        return null
      }

      return response.data.message
    } catch (error) {
      console.error('API: Exception sending message:', error)
      return null
    }
  }

export async function updateMessage(id: string, messageData: { read?: boolean; reply?: string }) {
  const response = await apiRequest<{ message: any }>(`/api/messages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(messageData),
  })
  return response.data?.message || null
}

export async function deleteConversationMessages(contactId: string) {
  const response = await apiRequest<{ success: boolean }>(`/api/messages/conversation?contact_id=${contactId}`, {
    method: 'DELETE',
  })
  return response.data?.success || false
}

// ==================== PLANES ====================

export async function getPlan(userId?: string) {
  const url = userId ? `/api/plans?user_id=${userId}` : '/api/plans'
  const response = await apiRequest<{ plan: any }>(url)
  return response.data?.plan || null
}

export async function createPlan(planData: {
  user_id?: string | null // Opcional - si no se proporciona, se crea un plan template
  name: string
  description?: string
  start_date: string
  end_date: string
  total_calories?: number
  days?: Array<{
    day_number: number
    day_name: string
    meals: string[] // Array de meal IDs
  }>
}) {
  const response = await apiRequest<{ plan: any }>('/api/plans', {
    method: 'POST',
    body: JSON.stringify(planData),
  })
  return response.data?.plan || null
}

export async function addMealToPlanDay(planId: string, dayId: string, mealId: string, orderIndex: number) {
  const response = await apiRequest<{ meal: any }>(`/api/plans/${planId}/days/${dayId}/meals`, {
    method: 'POST',
    body: JSON.stringify({ meal_id: mealId, order_index: orderIndex }),
  })
  return response.data?.meal || null
}

export async function removeMealFromPlanDay(planId: string, dayId: string, mealPlanDayMealId: string) {
  const response = await apiRequest<{ success: boolean }>(`/api/plans/${planId}/days/${dayId}/meals?meal_plan_day_meal_id=${mealPlanDayMealId}`, {
    method: 'DELETE',
  })
  return response.data?.success || false
}

export async function replaceMealInPlanDay(
  planId: string,
  dayId: string,
  oldMealPlanDayMealId: string,
  newMealId: string,
  orderIndex: number
): Promise<boolean> {
  try {
    // Eliminar la comida antigua
    const deleted = await removeMealFromPlanDay(planId, dayId, oldMealPlanDayMealId)
    if (!deleted) {
      return false
    }
    
    // Agregar la nueva comida
    const added = await addMealToPlanDay(planId, dayId, newMealId, orderIndex)
    return added !== null
  } catch (error) {
    console.error('Error replacing meal in plan day:', error)
    return false
  }
}

// Obtener planes creados por nutricionista (sin asignar a cliente)
export async function getMealPlansByNutricionista(nutricionistaId: string) {
  const response = await apiRequest<{ plans: any[] }>(`/api/plans?nutricionista_id=${nutricionistaId}&unassigned=true`)
  return response.data?.plans || []
}

// Copiar un plan completo a un usuario
// Eliminar plan asignado a un usuario
export async function deleteUserPlan(userId: string) {
  const response = await apiRequest<{ success: boolean }>(`/api/plans/user/${userId}`, {
    method: 'DELETE',
  })
  return response.data?.success || false
}

// ==================== PERFILES ====================

export async function getProfile() {
  const response = await apiRequest<{ profile: any }>('/api/profiles')
  return response.data?.profile || null
}

export async function saveProfile(profileData: {
  subscription_status?: string
  subscription_end_date?: string
  goals_weight?: number
  goals_calories?: number
  goals_water?: number
  address?: string
  delivery_instructions?: string
}) {
  const response = await apiRequest<{ profile: any }>('/api/profiles', {
    method: 'POST',
    body: JSON.stringify(profileData),
  })
  return response.data?.profile || null
}

// Actualizar suscripción de un usuario (solo admin)
export async function updateUserSubscription(
  userId: string,
  subscriptionStatus: 'active' | 'inactive' | 'expired',
  subscriptionEndDate?: string
) {
  const response = await apiRequest<{ profile: any; message: string }>(
    `/api/profiles/${userId}/subscription`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        subscription_status: subscriptionStatus,
        subscription_end_date: subscriptionEndDate || null,
      }),
    }
  )
  return response.data?.profile || null
}

// ==================== ASIGNACIÓN DE CLIENTES A NUTRICIONISTAS ====================

export async function getNutricionistaClients(nutricionistaId?: string) {
  const params = new URLSearchParams()
  if (nutricionistaId) params.append('nutricionista_id', nutricionistaId)
  
  const query = params.toString()
  const url = `/api/nutricionista-clients${query ? `?${query}` : ''}`
  
  const response = await apiRequest<{ clients: any[] }>(url)
  return response.data?.clients || []
}

export async function getNutricionistaByClientId(clientId: string) {
  const response = await apiRequest<{ assignment: any }>(`/api/nutricionista-clients?client_id=${clientId}`)
  return response.data?.assignment || null
}

export async function assignClientToNutricionista(nutricionistaId: string, clientId: string, notes?: string) {
  const response = await apiRequest<{ assignment: any }>('/api/nutricionista-clients', {
    method: 'POST',
    body: JSON.stringify({ nutricionista_id: nutricionistaId, client_id: clientId, notes }),
  })
  return response.data?.assignment || null
}

export async function removeClientFromNutricionista(nutricionistaId: string, clientId: string) {
  const response = await apiRequest<{ success: boolean }>(`/api/nutricionista-clients?nutricionista_id=${nutricionistaId}&client_id=${clientId}`, {
    method: 'DELETE',
  })
  return response.data?.success || false
}

// ==================== FICHA TÉCNICA ====================

export async function getFichaTecnica(userId: string) {
  const response = await apiRequest<{ ficha: any }>(`/api/fichas-tecnicas?user_id=${userId}`)
  return response.data?.ficha || null
}

export async function saveFichaTecnica(userId: string, payload: any) {
  const response = await apiRequest<{ ficha: any }>('/api/fichas-tecnicas', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, ...payload }),
  })
  if (response.error) {
    throw new Error(response.error)
  }
  return response.data?.ficha || null
}

export async function calculateNutritionPreview(payload: any) {
  const response = await apiRequest<{ result: any }>('/api/nutrition/calculate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (response.error) {
    throw new Error(response.error)
  }
  return response.data?.result || null
}

// ==================== PLANES BASE & GENERACIÓN ====================

export async function getPlanBases(options?: { includeRecipes?: boolean }) {
  const params = new URLSearchParams()
  if (options?.includeRecipes) {
    params.append('include_recipes', 'true')
  }
  const query = params.toString()
  const url = `/api/planes-base${query ? `?${query}` : ''}`
  const response = await apiRequest<{ planes: any[] }>(url)
  return response.data?.planes || []
}

export async function createPlanBase(payload: any) {
  const response = await apiRequest<{ plan: any }>('/api/planes-base', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (response.error) {
    throw new Error(response.error)
  }
  return response.data?.plan
}

export async function updatePlanBase(id: string, payload: any) {
  const response = await apiRequest<{ plan: any }>('/api/planes-base', {
    method: 'PATCH',
    body: JSON.stringify({ id, ...payload }),
  })
  if (response.error) {
    throw new Error(response.error)
  }
  return response.data?.plan
}

export async function deletePlanBase(id: string) {
  const response = await apiRequest<{ success: boolean }>(`/api/planes-base?id=${id}`, {
    method: 'DELETE',
  })
  if (response.error) {
    throw new Error(response.error)
  }
  return response.data?.success ?? true
}

export async function generateWeeklyPlanForUser(payload: {
  user_id: string
  plan_base_id: string
  week_start_date: string
}) {
  const response = await apiRequest<{ plan: any; meals: any[] }>('/api/planes-semanales/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (response.error) {
    throw new Error(response.error)
  }
  return response.data
}

export async function getWeeklyPlan(params?: { user_id?: string; week_start?: string; include_meals?: boolean }) {
  const searchParams = new URLSearchParams()
  if (params?.user_id) searchParams.append('user_id', params.user_id)
  if (params?.week_start) searchParams.append('week_start', params.week_start)
  if (params && params.include_meals === false) searchParams.append('include_meals', 'false')

  const query = searchParams.toString()
  const response = await apiRequest<{ plan: any }>(`/api/planes-semanales${query ? `?${query}` : ''}`)
  if (response.error) {
    throw new Error(response.error)
  }
  return response.data?.plan || null
}

export async function getPlanBaseRecipes(planBaseId: string) {
  const response = await apiRequest<{ recetas: any[] }>(`/api/recetas?plan_base_id=${planBaseId}`)
  if (response.error) {
    throw new Error(response.error)
  }
  return response.data?.recetas || []
}

export async function createPlanBaseRecipe(payload: any) {
  const response = await apiRequest<{ receta: any }>('/api/recetas', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (response.error) {
    throw new Error(response.error)
  }
  return response.data?.receta
}

export async function updatePlanBaseRecipe(id: string, payload: any) {
  const response = await apiRequest<{ receta: any }>('/api/recetas', {
    method: 'PATCH',
    body: JSON.stringify({ id, ...payload }),
  })
  if (response.error) {
    throw new Error(response.error)
  }
  return response.data?.receta
}

export async function deletePlanBaseRecipe(id: string) {
  const response = await apiRequest<{ success: boolean }>(`/api/recetas?id=${id}`, {
    method: 'DELETE',
  })
  if (response.error) {
    throw new Error(response.error)
  }
  return response.data?.success ?? true
}

// ==================== BIBLIOTECA DE RECETAS ====================

export async function getIngredientesCatalog() {
  const response = await apiRequest<{ ingredientes: any[] }>('/api/ingredientes')
  if (response.error) {
    throw new Error(response.error)
  }
  return response.data?.ingredientes || []
}

export async function saveIngrediente(payload: any) {
  const response = await apiRequest<{ ingrediente: any }>('/api/ingredientes', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (response.error) {
    throw new Error(response.error)
  }
  return response.data?.ingrediente
}

export async function deleteIngrediente(id: string) {
  const response = await apiRequest<{ success: boolean }>(`/api/ingredientes?id=${id}`, {
    method: 'DELETE',
  })
  if (response.error) {
    throw new Error(response.error)
  }
  return response.data?.success ?? true
}

export async function getRecipeLibrary(options?: { meal_type?: 'lunch' | 'dinner' }) {
  const params = new URLSearchParams({ library: 'true' })
  if (options?.meal_type) {
    params.append('meal_type', options.meal_type)
  }
  const response = await apiRequest<{ recetas: any[] }>(`/api/recetas?${params.toString()}`)
  if (response.error) {
    throw new Error(response.error)
  }
  return response.data?.recetas || []
}

export async function createLibraryRecipe(payload: any) {
  const response = await apiRequest<{ receta: any }>('/api/recetas', {
    method: 'POST',
    body: JSON.stringify({ ...payload, es_biblioteca: true }),
  })
  if (response.error) {
    throw new Error(response.error)
  }
  return response.data?.receta
}

export async function updateLibraryRecipe(id: string, payload: any) {
  const response = await apiRequest<{ receta: any }>('/api/recetas', {
    method: 'PATCH',
    body: JSON.stringify({ id, ...payload }),
  })
  if (response.error) {
    throw new Error(response.error)
  }
  return response.data?.receta
}

export async function deleteLibraryRecipe(id: string) {
  const response = await apiRequest<{ success: boolean }>(`/api/recetas?id=${id}`, {
    method: 'DELETE',
  })
  if (response.error) {
    throw new Error(response.error)
  }
  return response.data?.success ?? true
}

export async function assignLibraryRecipeToPlan(
  planBaseId: string,
  recipeId: string,
  overrides?: { nombre?: string; descripcion?: string }
) {
  const response = await apiRequest<{ receta: any }>('/api/recetas', {
    method: 'POST',
    body: JSON.stringify({
      plan_base_id: planBaseId,
      source_receta_id: recipeId,
      ...(overrides || {}),
    }),
  })
  if (response.error) {
    throw new Error(response.error)
  }
  return response.data?.receta
}

// ==================== PREFERENCIAS DE CHAT ====================

export async function getChatPreferences() {
  const response = await apiRequest<{ preferences: any[] }>('/api/chat-preferences')
  return response.data?.preferences || []
}

export async function updateChatPreference(contactId: string, preference: { is_archived?: boolean; is_deleted?: boolean }) {
  const response = await apiRequest<{ preference: any }>('/api/chat-preferences', {
    method: 'POST',
    body: JSON.stringify({ contact_id: contactId, ...preference }),
  })
  return response.data?.preference || null
}

// ==================== INCIDENCIAS DE PEDIDOS ====================

export async function getOrderIncidents(orderId?: string, repartidorId?: string) {
  const params = new URLSearchParams()
  if (orderId) params.append('order_id', orderId)
  if (repartidorId) params.append('repartidor_id', repartidorId)
  
  const query = params.toString()
  const url = `/api/order-incidents${query ? `?${query}` : ''}`
  
  const response = await apiRequest<{ incidents: any[]; incident?: any }>(url)
  return response.data?.incident || response.data?.incidents || []
}

export async function createOrderIncident(incidentData: { order_id: string; description: string }) {
  const response = await apiRequest<{ incident: any }>('/api/order-incidents', {
    method: 'POST',
    body: JSON.stringify(incidentData),
  })
  return response.data?.incident || null
}

// ==================== CONFIGURACIONES DE USUARIO ====================

export async function getUserSettings() {
  const response = await apiRequest<{ settings: any }>('/api/user-settings')
  return response.data?.settings || null
}

export async function updateUserSettings(settings: {
  notifications_enabled?: boolean
  notifications_new_messages?: boolean
  notifications_order_updates?: boolean
  notifications_plan_assignments?: boolean
  notifications_appointments?: boolean
  notifications_new_orders?: boolean
  notifications_weekly_menu?: boolean
  notifications_menu_changes_approved?: boolean
  notifications_order_status?: boolean
  notifications_renewal_reminder?: boolean
  notifications_plan_approval?: boolean
  notifications_consultation_required?: boolean
  preferences_language?: string
  preferences_theme?: 'light' | 'dark' | 'auto'
  preferences_email_notifications?: boolean
  accessibility_font_size?: 'small' | 'medium' | 'large' | 'xlarge'
  accessibility_high_contrast?: boolean
  accessibility_reduce_animations?: boolean
}) {
  const response = await apiRequest<{ settings: any }>('/api/user-settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  })
  return response.data?.settings || null
}
