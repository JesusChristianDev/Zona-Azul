/**
 * Funciones helper para convertir entre formatos de pedidos
 * Convierte entre DatabaseOrder (API) y Order (frontend)
 */

import { DatabaseOrder } from './db'
import { getUserById } from './db'
import * as api from './api'

// Formato usado en el frontend (admin)
export interface FrontendOrder {
  id: string
  customerId: string
  customer: string
  customerEmail: string
  role: string
  status: string
  eta: string
  channel: string
  items?: string[]
  total?: number
  createdAt?: string
  date?: string
  repartidor_id?: string
  delivery_address?: string
  delivery_instructions?: string
}

// Mapear estados de API a estados del frontend
const mapApiStatusToFrontend = (apiStatus: string): string => {
  const statusMap: Record<string, string> = {
    'pendiente': 'Preparando',
    'preparando': 'Preparando',
    'en_camino': 'En camino',
    'entregado': 'Entregado',
    'cancelado': 'Cancelado',
  }
  return statusMap[apiStatus] || apiStatus
}

// Mapear estados del frontend a estados de API
export const mapFrontendStatusToApi = (frontendStatus: string): string => {
  const statusMap: Record<string, string> = {
    'Preparando': 'preparando',
    'En camino': 'en_camino',
    'Entregado': 'entregado',
    'Cancelado': 'cancelado',
    'Pendiente': 'pendiente',
  }
  return statusMap[frontendStatus] || 'pendiente'
}

// Convertir DatabaseOrder a FrontendOrder
export async function convertApiOrderToFrontend(apiOrder: DatabaseOrder): Promise<FrontendOrder> {
  // Obtener información del cliente desde la API
  let customer: any = null
  try {
    customer = await api.getUserById(apiOrder.user_id)
  } catch (error) {
    console.error('Error fetching customer:', error)
  }
  
  // Calcular ETA basado en estimated_delivery_time
  let eta = '—'
  if (apiOrder.estimated_delivery_time) {
    const deliveryTime = new Date(apiOrder.estimated_delivery_time)
    const now = new Date()
    const diffMinutes = Math.round((deliveryTime.getTime() - now.getTime()) / (1000 * 60))
    if (diffMinutes > 0) {
      eta = `${diffMinutes} min`
    } else if (diffMinutes <= 0 && apiOrder.status === 'en_camino') {
      eta = 'Llegando'
    }
  }

  return {
    id: apiOrder.id,
    customerId: apiOrder.user_id,
    customer: customer?.name || 'Cliente',
    customerEmail: customer?.email || '',
    role: customer?.role || 'suscriptor',
    status: mapApiStatusToFrontend(apiOrder.status),
    eta,
    channel: 'App PWA',
    total: Number(apiOrder.total_amount),
    createdAt: apiOrder.created_at,
    date: apiOrder.created_at.split('T')[0],
    repartidor_id: apiOrder.repartidor_id || undefined,
    delivery_address: apiOrder.delivery_address || undefined,
    delivery_instructions: apiOrder.delivery_instructions || undefined,
    // items se puede obtener de order_items si es necesario
    items: ['Plato del día'], // Por ahora placeholder, se puede mejorar obteniendo de order_items
  }
}

// Convertir múltiples pedidos
export async function convertApiOrdersToFrontend(apiOrders: DatabaseOrder[]): Promise<FrontendOrder[]> {
  return Promise.all(apiOrders.map(convertApiOrderToFrontend))
}

