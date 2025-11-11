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

