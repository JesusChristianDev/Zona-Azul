// Tipos compartidos para toda la aplicación
// Migrados desde archivos mock que ya no se usan

export interface User {
  id: string
  email: string
  password?: string // Solo para tipos, en producción esto sería un hash
  role: 'admin' | 'suscriptor' | 'nutricionista' | 'repartidor'
  name: string
  createdAt: string
}

export interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  avatar?: string
  subscriptionStatus: 'active' | 'inactive' | 'expired'
  subscriptionEndDate?: string
  goals: {
    weight?: number
    calories?: number
    water?: number
  }
}

export interface Meal {
  id: string
  name: string
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  calories: number
  protein: number
  carbs: number
  fats: number
  ingredients: string[]
  instructions?: string
}

export interface MealPlanDay {
  id?: string // ID del día del plan (meal_plan_days.id)
  day: string
  totalCalories: number
  meals: Array<{
    id?: string // ID de la comida en el día del plan (meal_plan_day_meals.id)
    name: string
    calories: number
    description: string
  }>
}

export interface MealPlan {
  id: string
  name: string
  description: string
  startDate: string
  endDate: string
  meals: Meal[]
  totalCalories: number
  createdBy: string
  days: MealPlanDay[]
}

// ============================================
// TIPOS PARA SUSCRIPCIONES Y PLANES
// ============================================

export interface SubscriptionPlan {
  id: string
  name: 'Mensual' | 'Trimestral' | 'Anual'
  duration_months: number
  base_price: number
  discount_percentage: number
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SubscriptionGroup {
  id: string
  name?: string
  group_type: 'individual' | 'pareja' | 'familiar'
  primary_user_id: string
  discount_percentage: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SubscriptionGroupMember {
  id: string
  group_id: string
  user_id: string
  is_primary: boolean
  meals_per_week: number
  added_by?: string
  added_at: string
  removed_at?: string
  removed_by?: string
}

export interface Subscription {
  id: string
  user_id: string
  plan_id: string
  group_id?: string
  status: 'pending_approval' | 'active' | 'expired' | 'cancelled'
  start_date?: string
  end_date?: string
  price: number
  discount_applied: number
  admin_approved: boolean
  admin_approved_by?: string
  admin_approved_at?: string
  nutricionista_approved: boolean
  nutricionista_approved_by?: string
  nutricionista_approved_at?: string
  requires_consultation: boolean
  consultation_completed: boolean
  created_at: string
  updated_at: string
}

export interface SubscriptionContract {
  id: string
  subscription_id: string
  contract_text: string
  contract_type: 'mensual' | 'trimestral' | 'anual'
  signed: boolean
  signed_at?: string
  signed_by?: string
  signature_method?: 'electronic_signature' | 'checkbox_acceptance'
  ip_address?: string
  user_agent?: string
  created_at: string
  updated_at: string
}

export interface PaymentHistory {
  id: string
  subscription_id: string
  user_id: string
  amount: number
  payment_date: string
  payment_method?: string
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
  external_payment_id?: string
  installment_number?: number
  total_installments?: number
  notes?: string
  created_at: string
  updated_at: string
}

// ============================================
// TIPOS PARA MENÚS SEMANALES
// ============================================

export interface WeeklyMenu {
  id: string
  user_id: string
  group_id?: string
  week_start_date: string
  week_end_date: string
  status: 'generated' | 'modified' | 'approved' | 'delivered'
  generated_at: string
  generated_by: string
  notification_sent: boolean
  notification_sent_at?: string
  created_at: string
  updated_at: string
}

export interface WeeklyMenuDay {
  id: string
  weekly_menu_id: string
  day_name: string
  day_number: number
  date: string
  created_at: string
}

export interface WeeklyMenuDayMeal {
  id: string
  weekly_menu_day_id: string
  meal_id: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  order_index: number
  is_original: boolean
  original_meal_id?: string
  created_at: string
}

export interface MenuModification {
  id: string
  weekly_menu_id: string
  user_id: string
  day_number: number
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  original_meal_id: string
  requested_meal_id: string
  nutritionist_recommendation?: string
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
}

// ============================================
// TIPOS PARA ENTREGAS Y LOGÍSTICA
// ============================================

export interface DeliveryAddress {
  id: string
  user_id: string
  address_line1: string
  address_line2?: string
  city: string
  postal_code: string
  country: string
  is_primary: boolean
  is_active: boolean
  delivery_instructions?: string
  created_at: string
  updated_at: string
}

export interface DeliveryRating {
  id: string
  order_id: string
  user_id: string
  repartidor_id?: string
  rating: number
  comment?: string
  is_visible_to_repartidor: boolean
  is_visible_to_admin: boolean
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface OrderTracking {
  id: string
  order_id: string
  status: 'preparando' | 'en_camino' | 'entregado' | 'cancelado'
  location_latitude?: number
  location_longitude?: number
  estimated_delivery_time?: string
  updated_by?: string
  created_at: string
}

// ============================================
// TIPOS PARA NOTIFICACIONES
// ============================================

export interface NotificationPreferences {
  notifications_weekly_menu: boolean
  notifications_menu_changes_approved: boolean
  notifications_order_status: boolean
  notifications_renewal_reminder: boolean
  notifications_plan_approval: boolean
  notifications_consultation_required: boolean
}

// ============================================
// TIPOS PARA REPORTES
// ============================================

export interface Report {
  id: string
  report_type: 'nutritionist_weekly' | 'nutritionist_monthly' | 'nutritionist_manual' | 'delivery_satisfaction_weekly' | 'delivery_satisfaction_monthly' | 'payment_history' | 'menu_compliance'
  generated_by?: string
  target_user_id?: string
  period_start?: string
  period_end?: string
  report_data: Record<string, any>
  is_shared_with_repartidores: boolean
  file_url?: string
  created_at: string
}

