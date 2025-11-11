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

// Hook para obtener progreso
export function useProgress(startDate?: string, endDate?: string) {
  const [progress, setProgress] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getProgress(startDate, endDate)
      setProgress(data)
    } catch (err: any) {
      setError(err.message || 'Error al cargar progreso')
      console.error('Error loading progress:', err)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  return { progress, loading, error, refetch: fetchProgress }
}

// Hook para obtener citas
export function useAppointments() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getAppointments()
      setAppointments(data)
    } catch (err: any) {
      setError(err.message || 'Error al cargar citas')
      console.error('Error loading appointments:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  return { appointments, loading, error, refetch: fetchAppointments }
}

// Hook para obtener mensajes
export function useMessages() {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getMessages()
      setMessages(data)
    } catch (err: any) {
      setError(err.message || 'Error al cargar mensajes')
      console.error('Error loading messages:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  return { messages, loading, error, refetch: fetchMessages }
}

// Hook para obtener plan
export function usePlan() {
  const [plan, setPlan] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlan = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getPlan()
      setPlan(data)
    } catch (err: any) {
      setError(err.message || 'Error al cargar plan')
      console.error('Error loading plan:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlan()
  }, [fetchPlan])

  return { plan, loading, error, refetch: fetchPlan }
}

// Hook para obtener perfil
export function useProfile() {
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getProfile()
      setProfile(data)
    } catch (err: any) {
      setError(err.message || 'Error al cargar perfil')
      console.error('Error loading profile:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return { profile, loading, error, refetch: fetchProfile }
}

