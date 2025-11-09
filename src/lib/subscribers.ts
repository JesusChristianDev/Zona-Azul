/**
 * Utilidades para trabajar con suscriptores
 */

import { mockUsers, User } from './mockUsers'

/**
 * Obtiene todos los usuarios con rol 'suscriptor'
 * Incluye tanto los de mockUsers como los creados dinámicamente desde admin
 * Solo devuelve suscriptores que existen en zona_azul_users (no eliminados)
 */
export function getSubscribers(): User[] {
  // Primero obtener todos los usuarios de localStorage (fuente de verdad)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('zona_azul_users')
      if (stored) {
        const allUsers: User[] = JSON.parse(stored)
        // Filtrar solo suscriptores que están en zona_azul_users
        return allUsers.filter((user) => user.role === 'suscriptor')
      }
    } catch (error) {
      console.error('Error loading subscribers from localStorage:', error)
    }
  }
  
  // Fallback: si no hay localStorage, usar solo mockUsers
  return mockUsers.filter((user) => user.role === 'suscriptor')
}

/**
 * Obtiene un suscriptor por ID
 */
export function getSubscriberById(id: string): User | undefined {
  const allSubscribers = getSubscribers()
  return allSubscribers.find((user) => user.id === id)
}

/**
 * Obtiene un suscriptor por email
 */
export function getSubscriberByEmail(email: string): User | undefined {
  const allSubscribers = getSubscribers()
  return allSubscribers.find((user) => user.email.toLowerCase() === email.toLowerCase())
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

