/**
 * Hook para usar las APIs desde componentes React
 * Reemplaza el uso de localStorage y datos mock
 */

import { useState, useEffect, useCallback } from 'react'
import * as api from '../lib/api'

// Hook para obtener usuarios
export function useUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getUsers()
      setUsers(data)
    } catch (err: any) {
      setError(err.message || 'Error al cargar usuarios')
      console.error('Error loading users:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return { users, loading, error, refetch: fetchUsers }
}

// Hook para obtener meals
export function useMeals() {
  const [meals, setMeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMeals = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getMeals()
      setMeals(data)
    } catch (err: any) {
      setError(err.message || 'Error al cargar comidas')
      console.error('Error loading meals:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMeals()
  }, [fetchMeals])

  return { meals, loading, error, refetch: fetchMeals }
}

// Hook para obtener pedidos
export function useOrders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getOrders()
      setOrders(data)
    } catch (err: any) {
      setError(err.message || 'Error al cargar pedidos')
      console.error('Error loading orders:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  return { orders, loading, error, refetch: fetchOrders }
}

