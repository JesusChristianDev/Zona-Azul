/**
 * Utilidades para asignar planes a suscriptores
 */

import { MealPlan, MealPlanDay } from './mockPlan'
import { mockMealPlan } from './mockPlan'
import { getSubscribers } from './subscribers'
import { setUserData, getUserData } from './storage'
import { mockUsers } from './mockUsers'

export interface PlanTemplate {
  id: string
  name: string
  focus: string
  duration: string
  audience: string
  description?: string
  calories?: number
}

// Templates globales por defecto para Admin
export const defaultGlobalTemplates: PlanTemplate[] = [
  {
    id: 'global-template-1',
    name: 'Plan Azul Energía',
    focus: 'Balance mente-cuerpo',
    duration: '4 semanas',
    audience: 'Suscriptores nuevos',
    description: 'Plan equilibrado para iniciar el camino hacia el bienestar integral.',
    calories: 2000,
  },
  {
    id: 'global-template-2',
    name: 'Plan Fortaleza',
    focus: 'Ganancia de masa magra',
    duration: '6 semanas',
    audience: 'Atletas recreativos',
    description: 'Enfoque en proteína y entrenamiento para desarrollo muscular.',
    calories: 2500,
  },
  {
    id: 'global-template-3',
    name: 'Plan Ligereza',
    focus: 'Déficit calórico sostenible',
    duration: '8 semanas',
    audience: 'Clientes con sobrepeso moderado',
    description: 'Reducción gradual y saludable de peso corporal.',
    calories: 1800,
  },
  {
    id: 'global-template-4',
    name: 'Plan Flexitariano',
    focus: 'Alimentación basada en plantas',
    duration: '4 semanas',
    audience: 'Suscriptores flexitarianos',
    description: 'Plan rico en vegetales con proteína animal ocasional.',
    calories: 1900,
  },
]

/**
 * Obtiene todos los templates disponibles (globales + de todos los nutricionistas)
 * Elimina duplicados tanto por ID como por nombre+focus (para evitar planes con mismo nombre)
 */
export function getAllAvailableTemplates(): PlanTemplate[] {
  const templates: PlanTemplate[] = []
  const seenIds = new Set<string>()
  const seenNames = new Set<string>()
  
  // Agregar templates globales primero (tienen prioridad)
  defaultGlobalTemplates.forEach((template) => {
    const nameKey = `${template.name.toLowerCase()}_${template.focus.toLowerCase()}`
    if (!seenIds.has(template.id) && !seenNames.has(nameKey)) {
      templates.push(template)
      seenIds.add(template.id)
      seenNames.add(nameKey)
    }
  })
  
  if (typeof window === 'undefined') return templates
  
  try {
    // Obtener todos los nutricionistas
    const allUsers = JSON.parse(localStorage.getItem('zona_azul_users') || '[]')
    const nutritionists = allUsers.filter((u: any) => u.role === 'nutricionista')
    
    // Obtener templates de cada nutricionista
    nutritionists.forEach((nutritionist: any) => {
      const userTemplates = getUserData<PlanTemplate[]>('zona_azul_plans', nutritionist.id)
      if (userTemplates && Array.isArray(userTemplates)) {
        userTemplates.forEach((template) => {
          const nameKey = `${template.name.toLowerCase()}_${template.focus.toLowerCase()}`
          
          // Solo agregar si no existe por ID ni por nombre+focus
          if (!seenIds.has(template.id) && !seenNames.has(nameKey)) {
            templates.push(template)
            seenIds.add(template.id)
            seenNames.add(nameKey)
          }
        })
      }
    })
    
    return templates
  } catch (error) {
    console.error('Error loading templates:', error)
    return defaultGlobalTemplates
  }
}

/**
 * Genera un plan semanal completo basado en un template
 * Usa el plan mockMealPlan como base y lo personaliza según el template
 */
export function generatePlanFromTemplate(template: PlanTemplate, subscriberId: string): MealPlan {
  // Usar mockMealPlan como base y personalizarlo
  const plan: MealPlan = {
    ...mockMealPlan,
    id: `plan-${subscriberId}-${Date.now()}`,
    name: template.name,
    description: template.description || `Plan personalizado: ${template.focus}`,
    createdBy: 'Sistema Zona Azul',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalCalories: template.calories || 2000,
  }

  // Ajustar calorías de los días si el template tiene un objetivo calórico diferente
  if (template.calories && template.calories !== 2000) {
    const adjustmentFactor = template.calories / 2000
    plan.days = plan.days.map((day) => {
      const adjustedMeals = day.meals.map((meal) => ({
        ...meal,
        calories: Math.round(meal.calories * adjustmentFactor),
      }))
      const newTotal = adjustedMeals.reduce((sum, meal) => sum + meal.calories, 0)
      return {
        ...day,
        meals: adjustedMeals,
        totalCalories: newTotal,
      }
    })
  }

  return plan
}

/**
 * Asigna un plan a un suscriptor
 */
export function assignPlanToSubscriber(
  subscriberId: string,
  template: PlanTemplate,
  assignedBy?: string
): boolean {
  try {
    // Verificar que el suscriptor existe
    const subscribers = getSubscribers()
    const subscriber = subscribers.find((s) => s.id === subscriberId)
    
    if (!subscriber) {
      console.error(`Subscriber ${subscriberId} not found`)
      return false
    }

    // Generar el plan desde el template
    const plan = generatePlanFromTemplate(template, subscriberId)
    
    // Guardar el plan para el suscriptor
    setUserData('zona_azul_suscriptor_plan', plan, subscriberId)
    
    // Notificar actualización
    window.dispatchEvent(new Event('zona_azul_plan_updated'))
    
    // Mostrar notificación si está disponible
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      import('./notifications').then(({ NotificationHelpers }) => {
        NotificationHelpers.planAssigned(template.name, '/suscriptor/plan', subscriberId)
      }).catch(() => {
        // Silenciar error si no se puede cargar
      })
    }
    
    return true
  } catch (error) {
    console.error('Error assigning plan:', error)
    return false
  }
}

/**
 * Obtiene el plan actual de un suscriptor
 */
export function getSubscriberPlan(subscriberId: string): MealPlan | null {
  try {
    if (typeof window === 'undefined') return null
    
    return getUserData<MealPlan>('zona_azul_suscriptor_plan', subscriberId)
  } catch (error) {
    console.error('Error getting subscriber plan:', error)
    return null
  }
}

/**
 * Verifica si un suscriptor tiene un plan asignado
 */
export function hasPlanAssigned(subscriberId: string): boolean {
  const plan = getSubscriberPlan(subscriberId)
  return plan !== null && plan.days && plan.days.length > 0
}

