/**
 * Utilidades para trabajar con suscriptores
 * Ahora usa la API en lugar de localStorage/mock
 */

import { User } from './types'
import { getSubscribers as getSubscribersFromApi } from './api'

/**
 * Obtiene todos los usuarios con rol 'suscriptor' desde la API
 * Según el rol del usuario:
 * - Admin: obtiene todos los suscriptores
 * - Nutricionista: obtiene solo sus clientes asignados
 * - Otros: devuelve array vacío
 * @returns Promise con array de suscriptores
 */
export async function getSubscribers(): Promise<User[]> {
  try {
    const subscribers = await getSubscribersFromApi()
    return subscribers.map((user: any) => user as User)
  } catch (error) {
    console.error('Error loading subscribers:', error)
    return []
  }
}

/**
 * Genera direcciones de ejemplo para suscriptores
 */
export function getSubscriberAddress(subscriberId: string): string {
  const addresses: Record<string, string> = {
    'suscriptor-1': 'Av. Horizonte 234, Torre B, Piso 5',
    'suscriptor-2': 'Cowork Distrito Azul, Oficina 12',
  }
  return addresses[subscriberId] || 'Dirección no especificada'
}

/**
 * Genera instrucciones de entrega de ejemplo
 */
export function getSubscriberInstructions(subscriberId: string): string {
  const instructions: Record<string, string> = {
    'suscriptor-1': 'Dejar en recepción, cliente en reunión',
    'suscriptor-2': 'Solicitar código 9245 en seguridad',
  }
  return instructions[subscriberId] || 'Entregar directamente al cliente'
}

