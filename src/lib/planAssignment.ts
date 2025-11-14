/**
 * Utilidades para asignar planes a suscriptores
 */

import { MealPlan, MealPlanDay } from './types'
import { getSubscribers } from './subscribers'
import * as api from './api'

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
export async function getAllAvailableTemplates(): Promise<PlanTemplate[]> {
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
    // Obtener todos los nutricionistas desde la API
    const nutritionists = await api.getNutritionists()
    
    // Obtener templates de cada nutricionista desde la API
    for (const nutritionist of nutritionists) {
      const userTemplates = await api.getPlanTemplates(nutritionist.id)
      if (userTemplates && Array.isArray(userTemplates)) {
        userTemplates.forEach((template: any) => {
          const formattedTemplate: PlanTemplate = {
            id: template.id,
            name: template.name,
            focus: template.focus || '',
            duration: template.duration || '',
            audience: template.audience || '',
            description: template.description || undefined,
            calories: template.total_calories || undefined,
          }
          const nameKey = `${formattedTemplate.name.toLowerCase()}_${formattedTemplate.focus.toLowerCase()}`
          
          // Solo agregar si no existe por ID ni por nombre+focus
          if (!seenIds.has(formattedTemplate.id) && !seenNames.has(nameKey)) {
            templates.push(formattedTemplate)
            seenIds.add(formattedTemplate.id)
            seenNames.add(nameKey)
          }
        })
      }
    }
    
    return templates
  } catch (error) {
    console.error('Error loading templates:', error)
    return defaultGlobalTemplates
  }
}


/**
 * Asigna un plan completo a un suscriptor
 * Copia un plan ya creado (con días y comidas) al suscriptor
 */
export async function assignPlanToSubscriber(
  subscriberId: string,
  planId: string, // ID del plan completo a copiar
  assignedBy?: string
): Promise<boolean> {
  try {
    // Verificar que el suscriptor existe
    const subscribers = await getSubscribers()
    const subscriber = subscribers.find((s) => s.id === subscriberId)
    
    if (!subscriber) {
      console.error(`Subscriber ${subscriberId} not found`)
      throw new Error('El suscriptor no existe')
    }

    // Nota: No verificamos el plan aquí porque getPlan() espera un userId, no un planId
    // La verificación se hará en el backend al intentar copiar el plan

    // Calcular fechas (plan de 5 días: lunes a viernes únicamente)
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 4) // 5 días: lunes a viernes
    
    // Copiar el plan completo (con días y comidas) al suscriptor
    const copiedPlan = await api.copyPlanToUser(
      planId,
      subscriberId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    )
    
    if (!copiedPlan || !copiedPlan.id) {
      console.error('Error copying plan to subscriber')
      throw new Error('Error al copiar el plan. Verifica que el plan tenga días y comidas asignadas.')
    }
    
    // Mostrar notificación si está disponible
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      import('./notifications').then(({ NotificationHelpers }) => {
        NotificationHelpers.planAssigned(copiedPlan.name || 'Plan', '/suscriptor/plan', subscriberId)
      }).catch(() => {
        // Silenciar error si no se puede cargar
      })
    }
    
    return true
  } catch (error: any) {
    console.error('Error assigning plan:', error)
    // Re-lanzar el error para que el componente pueda mostrar el mensaje
    throw error
  }
}

/**
 * Obtiene el plan actual de un suscriptor desde la API
 */
export async function getSubscriberPlan(subscriberId: string): Promise<MealPlan | null> {
  try {
    if (typeof window === 'undefined') return null
    
    const plan = await api.getPlan()
    if (plan && plan.user_id === subscriberId) {
      // Convertir plan de API a formato MealPlan
      // TODO: Implementar conversión completa cuando la API devuelva días y comidas
      return {
        id: plan.id,
        name: plan.name,
        description: plan.description || '',
        createdBy: plan.nutricionista_id || 'Sistema',
        startDate: plan.start_date,
        endDate: plan.end_date,
        totalCalories: plan.total_calories || 2000,
        days: [], // Se puede obtener de meal_plan_days si es necesario
      } as MealPlan
    }
    return null
  } catch (error) {
    console.error('Error getting subscriber plan:', error)
    return null
  }
}

/**
 * Verifica si un suscriptor tiene un plan asignado
 * Nota: Solo verifica si existe un plan activo, no si tiene días completos
 */
export async function hasPlanAssigned(subscriberId: string): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false
    
    // Obtener el plan del suscriptor específico usando el parámetro user_id
    const plan = await api.getPlan(subscriberId)
    
    // Si hay un plan activo para el suscriptor, entonces tiene plan asignado
    return plan !== null
  } catch (error) {
    console.error('Error checking if subscriber has plan:', error)
    return false
  }
}

