"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import SummaryCard from '../ui/SummaryCard'
import InteractiveGreeting from '../ui/InteractiveGreeting'
import { useAuth } from '../../hooks/useAuth'
import { getSubscribers } from '../../lib/subscribers'

interface Order {
  id: string
  customerId: string
  status: string
  total?: number
  createdAt?: string
  date?: string
}

export default function DashboardAdmin() {
  const { userName } = useAuth()
  const [stats, setStats] = useState({
    // Métricas financieras
    monthlyRevenue: 0,
    monthlyOrders: 0,
    averageOrderValue: 0,
    pendingRevenue: 0,
    projectedMonthlyRevenue: 0,
    dailyAverageRevenue: 0,
    revenuePerSubscriber: 0,
    topCustomerValue: 0,
    topCustomerName: '',
    mostSoldItem: '',
    mostSoldItemCount: 0,
    revenueGrowthRate: 0,
    averageOrderValueTarget: 15.0, // Objetivo
    averageOrderValueVsTarget: 0,
    
    // KPIs Financieros Profesionales
    grossMargin: 0,
    grossMarginPercent: 0,
    netMargin: 0,
    netMarginPercent: 0,
    customerLifetimeValue: 0,
    customerAcquisitionCost: 0,
    roi: 0,
    breakEvenPoint: 0,
    cashFlow: 0,
    revenuePerEmployee: 0,
    orderFrequency: 0,
    churnRate: 0,
    retentionRate: 0,
    
    // Datos para gráficos
    revenueTrend: [] as { date: string; revenue: number; orders: number }[],
    dailyRevenue: [] as { day: string; revenue: number }[],
    revenueByStatus: [] as { status: string; label: string; value: number; description: string }[],
    
    // Métricas de crecimiento
    activeSubscribers: 0,
    conversionRate: 0,
    activePlans: 0,
    subscribersWithoutPlan: 0,
    
    // Métricas operativas
    ordersByStatus: {
      entregado: 0,
      enCamino: 0,
      preparando: 0,
      cancelado: 0,
    },
    totalUsers: 0,
    teamMembers: 0,
    
    // Alertas y acciones
    delayedOrders: 0,
    unavailableMenuItems: 0,
    newSubscribersThisWeek: 0,
    cancellationRate: 0,
  })

  useEffect(() => {
    const loadStats = () => {
      if (typeof window === 'undefined') return

      // Obtener todos los usuarios
      const stored = localStorage.getItem('zona_azul_users')
      let allUsers: any[] = []
      
      if (stored) {
        try {
          allUsers = JSON.parse(stored)
        } catch (e) {
          // Error al parsear
        }
      }
      
      // Si no hay usuarios en localStorage, usar mockUsers como fallback
      if (allUsers.length === 0) {
        const { mockUsers } = require('../../lib/mockUsers')
        allUsers = mockUsers
      }

      // Contar usuarios por rol
      const subscribers = allUsers.filter((u) => u.role === 'suscriptor')
      const teamMembers = allUsers.filter((u) => 
        u.role === 'admin' || u.role === 'nutricionista' || u.role === 'repartidor'
      )

      // Obtener pedidos
      const ordersStr = localStorage.getItem('zona_azul_admin_orders')
      let orders: Order[] = []
      if (ordersStr) {
        try {
          orders = JSON.parse(ordersStr)
        } catch (e) {
          // Error al parsear
        }
      }

      // Filtrar pedidos válidos (solo con suscriptores existentes)
      const validSubscribers = getSubscribers()
      const validSubscriberIds = new Set(validSubscribers.map((s) => s.id))
      const validOrders = orders.filter((o) => validSubscriberIds.has(o.customerId))

      // Fecha actual (necesaria para múltiples cálculos)
      // Normalizar a medianoche para comparaciones consistentes
      const currentDate = new Date()
      currentDate.setHours(0, 0, 0, 0)

      // Calcular métricas financieras
      // Pedidos del mes (entregados) - incluir solo los de los últimos 30 días
      const thirtyDaysAgo = new Date(currentDate)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      thirtyDaysAgo.setHours(0, 0, 0, 0)

      const monthlyOrdersDelivered = validOrders.filter((o) => {
        if (o.status !== 'Entregado') return false
        
        // Verificar fecha si existe
        let orderDate: Date | null = null
        if ((o as any).createdAt) {
          orderDate = new Date((o as any).createdAt)
        } else if ((o as any).date) {
          orderDate = new Date((o as any).date)
        }
        
        if (orderDate) {
          orderDate.setHours(0, 0, 0, 0)
          // Incluir pedidos desde hace 30 días hasta hoy (incluyendo hoy)
          return orderDate >= thirtyDaysAgo && orderDate <= currentDate
        }
        
        // Si no tiene fecha, asumir que es de hoy (para pedidos recientes)
        return true
      })

      const monthlyRevenue = monthlyOrdersDelivered.reduce((sum, o) => sum + (o.total || 0), 0)
      const monthlyOrders = monthlyOrdersDelivered.length
      const averageOrderValue = monthlyOrders > 0 ? monthlyRevenue / monthlyOrders : 0

      // Ingresos pendientes (pedidos en proceso)
      const pendingOrders = validOrders.filter((o) => 
        o.status === 'Preparando' || o.status === 'En camino'
      )
      const pendingRevenue = pendingOrders.reduce((sum, o) => sum + (o.total || 0), 0)

      // Ingresos proyectados del mes (basado en tendencia actual)
      const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
      const currentDay = currentDate.getDate()
      const dailyAverageRevenue = currentDay > 0 ? monthlyRevenue / currentDay : 0
      const projectedMonthlyRevenue = dailyAverageRevenue * daysInMonth

      // Ingresos por suscriptor
      const revenuePerSubscriber = subscribers.length > 0 ? monthlyRevenue / subscribers.length : 0

      // Top cliente por valor
      const customerRevenue: Record<string, { total: number; name: string }> = {}
      monthlyOrdersDelivered.forEach((order) => {
        const customerId = order.customerId
        const customer = validSubscribers.find((s) => s.id === customerId)
        if (customer) {
          if (!customerRevenue[customerId]) {
            customerRevenue[customerId] = { total: 0, name: customer.name }
          }
          customerRevenue[customerId].total += order.total || 0
        }
      })
      const topCustomer = Object.values(customerRevenue).sort((a, b) => b.total - a.total)[0]
      const topCustomerValue = topCustomer?.total || 0
      const topCustomerName = topCustomer?.name || 'N/A'

      // Producto más vendido (basado en items de pedidos)
      const itemCounts: Record<string, number> = {}
      monthlyOrdersDelivered.forEach((order) => {
        const items = (order as any).items || []
        items.forEach((item: string) => {
          itemCounts[item] = (itemCounts[item] || 0) + 1
        })
      })
      const mostSoldItemEntry = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0]
      const mostSoldItem = mostSoldItemEntry?.[0] || 'N/A'
      const mostSoldItemCount = mostSoldItemEntry?.[1] || 0

      // Tasa de crecimiento (simulado: basado en comparación con proyección)
      const revenueGrowthRate = projectedMonthlyRevenue > 0
        ? Math.round(((projectedMonthlyRevenue - monthlyRevenue) / monthlyRevenue) * 100)
        : 0

      // Valor promedio vs objetivo
      const averageOrderValueTarget = 15.0
      const averageOrderValueVsTarget = averageOrderValue > 0
        ? Math.round(((averageOrderValue / averageOrderValueTarget) * 100))
        : 0

      // KPIs Financieros Profesionales
      // Margen bruto (asumiendo 60% de margen sobre ingresos)
      const costOfGoodsSold = monthlyRevenue * 0.4 // 40% costo
      const grossMargin = monthlyRevenue - costOfGoodsSold
      const grossMarginPercent = monthlyRevenue > 0 ? (grossMargin / monthlyRevenue) * 100 : 0

      // Margen neto (asumiendo 20% de gastos operativos)
      const operatingExpenses = monthlyRevenue * 0.2
      const netMargin = grossMargin - operatingExpenses
      const netMarginPercent = monthlyRevenue > 0 ? (netMargin / monthlyRevenue) * 100 : 0

      // Customer Lifetime Value (LTV) - estimado basado en frecuencia y valor promedio
      const averageOrdersPerMonth = subscribers.length > 0 ? monthlyOrders / subscribers.length : 0
      const averageMonthsActive = 6 // Estimado
      const customerLifetimeValue = averageOrderValue * averageOrdersPerMonth * averageMonthsActive

      // Contar planes activos primero (necesario para calcular subscribersWithoutPlan)
      let activePlans = 0
      validSubscribers.forEach((subscriber) => {
        const plan = localStorage.getItem(`zona_azul_suscriptor_plan_user_${subscriber.id}`)
        if (plan) {
          try {
            const planData = JSON.parse(plan)
            if (planData && planData.days && planData.days.length > 0) {
              activePlans++
            }
          } catch (e) {
            // Plan inválido, no contar
          }
        }
      })

      // Suscriptores sin plan
      const subscribersWithoutPlan = subscribers.length - activePlans

      // Pedidos por estado (necesario antes de otros cálculos)
      const ordersByStatus = {
        entregado: validOrders.filter((o) => o.status === 'Entregado').length,
        enCamino: validOrders.filter((o) => o.status === 'En camino').length,
        preparando: validOrders.filter((o) => o.status === 'Preparando').length,
        cancelado: validOrders.filter((o) => o.status === 'Cancelado').length,
      }

      // Customer Acquisition Cost (CAC) - estimado
      const marketingBudget = monthlyRevenue * 0.15 // 15% en marketing
      const newCustomersThisMonth = subscribersWithoutPlan
      const customerAcquisitionCost = newCustomersThisMonth > 0 ? marketingBudget / newCustomersThisMonth : 0

      // ROI
      const roi = customerAcquisitionCost > 0 ? ((customerLifetimeValue - customerAcquisitionCost) / customerAcquisitionCost) * 100 : 0

      // Break-even point (punto de equilibrio)
      const fixedCosts = 5000 // Costos fijos estimados mensuales
      const variableCostPerOrder = averageOrderValue * 0.4
      const breakEvenPoint = fixedCosts / (averageOrderValue - variableCostPerOrder)

      // Cash Flow
      const cashFlow = netMargin

      // Revenue per Employee
      const revenuePerEmployee = teamMembers > 0 ? monthlyRevenue / teamMembers : 0

      // Order Frequency (pedidos por cliente por mes)
      const orderFrequency = subscribers.length > 0 ? monthlyOrders / subscribers.length : 0

      // Churn Rate (tasa de abandono) - estimado basado en cancelaciones
      const churnRate = subscribers.length > 0 ? (ordersByStatus.cancelado / subscribers.length) * 100 : 0

      // Retention Rate
      const retentionRate = 100 - churnRate

      // Datos para gráficos de tendencias (últimos 7 días basados en pedidos reales)
      // Incluir desde hace 6 días hasta hoy (7 días total)
      // currentDate ya está normalizado a medianoche
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(currentDate)
        date.setDate(date.getDate() - (6 - i)) // 0 = hoy, 1 = ayer, ..., 6 = hace 6 días
        // date ya está normalizado porque currentDate lo está
        return date
      })

      // Agrupar pedidos entregados por día (últimos 7 días)
      const ordersByDay = new Map<string, { count: number; revenue: number }>()
      
      // Inicializar todos los días con 0
      last7Days.forEach((date) => {
        const dateKey = date.toISOString().split('T')[0]
        ordersByDay.set(dateKey, { count: 0, revenue: 0 })
      })

      // Filtrar solo pedidos entregados de los últimos 7 días (incluyendo hoy)
      // currentDate ya está normalizado a medianoche
      const sevenDaysAgo = new Date(currentDate)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6) // -6 para incluir hoy (7 días total: hoy + 6 anteriores)

      const ordersLast7Days = validOrders.filter((order) => {
        // Solo pedidos entregados
        if (order.status !== 'Entregado') return false
        
        // Verificar que tenga fecha y esté en los últimos 7 días (incluyendo hoy)
        let orderDate: Date | null = null
        if ((order as any).createdAt) {
          orderDate = new Date((order as any).createdAt)
        } else if ((order as any).date) {
          orderDate = new Date((order as any).date)
        } else {
          // Si no tiene fecha, asumir que es de hoy (para pedidos recientes)
          orderDate = new Date(currentDate)
        }
        
        if (orderDate) {
          orderDate.setHours(0, 0, 0, 0)
          // Incluir pedidos desde hace 6 días hasta hoy (7 días total)
          return orderDate >= sevenDaysAgo && orderDate <= currentDate
        }
        return false
      })

      // Procesar pedidos de los últimos 7 días y agrupar por día
      ordersLast7Days.forEach((order) => {
        let orderDate: Date
        if ((order as any).createdAt) {
          orderDate = new Date((order as any).createdAt)
        } else if ((order as any).date) {
          orderDate = new Date((order as any).date)
        } else {
          // Si no tiene fecha, asignar a hoy (para pedidos recientes)
          orderDate = new Date(currentDate)
        }
        
        orderDate.setHours(0, 0, 0, 0)
        const dateKey = orderDate.toISOString().split('T')[0]
        
        // Agrupar por día (si la fecha está en el rango de los últimos 7 días)
        if (ordersByDay.has(dateKey)) {
          const dayData = ordersByDay.get(dateKey)!
          dayData.count += 1
          dayData.revenue += order.total || 0
        } else {
          // Si la fecha no está en el mapa pero está en el rango, agregarla
          // Esto puede pasar si hay pedidos de hoy que aún no están en el mapa inicial
          const dateObj = new Date(dateKey)
          dateObj.setHours(0, 0, 0, 0)
          // Ambas fechas ya están normalizadas a medianoche
          if (dateObj.getTime() >= sevenDaysAgo.getTime() && dateObj.getTime() <= currentDate.getTime()) {
            ordersByDay.set(dateKey, { count: 1, revenue: order.total || 0 })
          }
        }
      })

      // Crear array de tendencias ordenado por fecha (solo mostrar días con datos reales)
      const revenueTrend = last7Days.map((date) => {
        const dateKey = date.toISOString().split('T')[0]
        const dayData = ordersByDay.get(dateKey) || { count: 0, revenue: 0 }
        return {
          date: date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
          revenue: dayData.revenue,
          orders: dayData.count,
        }
      })

      const dailyRevenue = revenueTrend.map((item) => ({
        day: item.date,
        revenue: item.revenue,
      }))

      // Calcular ingresos por estado basados en pedidos reales
      const revenueByStatusData = {
        entregados: validOrders
          .filter((o) => o.status === 'Entregado')
          .reduce((sum, o) => sum + (o.total || 0), 0),
        enProceso: validOrders
          .filter((o) => o.status === 'Preparando' || o.status === 'En camino')
          .reduce((sum, o) => sum + (o.total || 0), 0),
        cancelados: validOrders
          .filter((o) => o.status === 'Cancelado')
          .reduce((sum, o) => sum + (o.total || 0), 0),
      }

      const revenueByStatus = [
        { 
          status: 'Ingresos Entregados', 
          label: 'Pedidos Entregados',
          value: revenueByStatusData.entregados,
          description: 'Ingresos de pedidos ya entregados'
        },
        { 
          status: 'Ingresos en Proceso', 
          label: 'Pedidos en Proceso',
          value: revenueByStatusData.enProceso,
          description: 'Ingresos de pedidos preparándose o en camino'
        },
        { 
          status: 'Ingresos Cancelados', 
          label: 'Pedidos Cancelados',
          value: revenueByStatusData.cancelados,
          description: 'Ingresos perdidos por cancelaciones'
        },
      ].filter((item) => item.value > 0) // Solo mostrar estados con ingresos

      // Tasa de conversión (suscriptores con plan / total suscriptores)
      const conversionRate = subscribers.length > 0 
        ? Math.round((activePlans / subscribers.length) * 100) 
        : 0

      // Tasa de cancelación
      const totalOrders = validOrders.length
      const cancellationRate = totalOrders > 0
        ? Math.round((ordersByStatus.cancelado / totalOrders) * 100)
        : 0

      // Pedidos con retraso (asumiendo que ETA > 45 min es retraso)
      const delayedOrders = validOrders.filter((o) => {
        if (o.status === 'Entregado' || o.status === 'Cancelado') return false
        const etaStr = (o as any).eta || ''
        const minutes = parseInt(etaStr.replace(/[^0-9]/g, '')) || 0
        return minutes > 45
      }).length

      // Items del menú sin disponibilidad
      const menuStr = localStorage.getItem('zona_azul_menu')
      let unavailableMenuItems = 0
      if (menuStr) {
        try {
          const menuItems = JSON.parse(menuStr)
          unavailableMenuItems = menuItems.filter((item: any) => 
            item.availability !== 'Disponible'
          ).length
        } catch (e) {
          // Error al parsear
        }
      }

      // Nuevos suscriptores esta semana (simulado: suscriptores sin plan)
      const newSubscribersThisWeek = subscribersWithoutPlan

      setStats({
        monthlyRevenue,
        monthlyOrders,
        averageOrderValue,
        pendingRevenue,
        projectedMonthlyRevenue,
        dailyAverageRevenue,
        revenuePerSubscriber,
        topCustomerValue,
        topCustomerName,
        mostSoldItem,
        mostSoldItemCount,
        revenueGrowthRate,
        averageOrderValueTarget,
        averageOrderValueVsTarget,
        grossMargin,
        grossMarginPercent,
        netMargin,
        netMarginPercent,
        customerLifetimeValue,
        customerAcquisitionCost,
        roi,
        breakEvenPoint,
        cashFlow,
        revenuePerEmployee,
        orderFrequency,
        churnRate,
        retentionRate,
        revenueTrend,
        dailyRevenue,
        revenueByStatus,
        activeSubscribers: subscribers.length,
        conversionRate,
        activePlans,
        subscribersWithoutPlan,
        ordersByStatus,
        totalUsers: allUsers.length,
        teamMembers: teamMembers.length,
        delayedOrders,
        unavailableMenuItems,
        newSubscribersThisWeek,
        cancellationRate,
      })
    }

    loadStats()

    // Escuchar cambios
    const handleUsersUpdate = () => loadStats()
    const handlePlanUpdate = () => loadStats()
    const handleOrdersUpdate = () => loadStats()
    
    window.addEventListener('zona_azul_users_updated', handleUsersUpdate)
    window.addEventListener('zona_azul_subscribers_updated', handleUsersUpdate)
    window.addEventListener('zona_azul_plan_updated', handlePlanUpdate)
    window.addEventListener('zona_azul_admin_orders_updated', handleOrdersUpdate)

    // Escuchar cambios en localStorage (otras pestañas)
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'zona_azul_users' ||
        e.key === 'zona_azul_admin_orders' ||
        e.key?.startsWith('zona_azul_suscriptor_plan_user_')
      ) {
        loadStats()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    // Polling cada 3 segundos como fallback
    const interval = setInterval(loadStats, 3000)

    return () => {
      window.removeEventListener('zona_azul_users_updated', handleUsersUpdate)
      window.removeEventListener('zona_azul_subscribers_updated', handleUsersUpdate)
      window.removeEventListener('zona_azul_plan_updated', handlePlanUpdate)
      window.removeEventListener('zona_azul_admin_orders_updated', handleOrdersUpdate)
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="space-y-8">
      <InteractiveGreeting userName={userName || 'Administrador'} role="admin" />

      {/* Dashboard Financiero Profesional */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Dashboard Financiero
            </h2>
            <p className="text-gray-600">KPIs y métricas de rendimiento empresarial</p>
          </div>
        </div>

        {/* KPIs Principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Ingresos Totales</span>
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900">€{stats.monthlyRevenue.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.monthlyOrders} pedidos</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Margen Bruto</span>
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900">€{stats.grossMargin.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.grossMarginPercent.toFixed(1)}% del total</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Margen Neto</span>
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900">€{stats.netMargin.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.netMarginPercent.toFixed(1)}% del total</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Cash Flow</span>
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className={`text-2xl font-bold ${stats.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.cashFlow >= 0 ? '+' : ''}€{stats.cashFlow.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Flujo de caja mensual</p>
          </div>
        </div>

        {/* KPIs de Cliente */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">LTV (Lifetime Value)</span>
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900">€{stats.customerLifetimeValue.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Valor por cliente</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">CAC (Costo Adquisición)</span>
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900">€{stats.customerAcquisitionCost.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Por nuevo cliente</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">ROI</span>
              <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className={`text-2xl font-bold ${stats.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Retorno de inversión</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Tasa de Retención</span>
              <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.retentionRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-1">Clientes retenidos</p>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Tendencia de Ingresos */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencia de Ingresos (7 días)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={stats.revenueTrend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [`€${value.toFixed(2)}`, 'Ingresos']} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Distribución por Estado */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Distribución de Ingresos por Estado</h3>
              <p className="text-xs text-gray-500">
                Muestra cómo se distribuyen los ingresos totales según el estado actual de los pedidos
              </p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.revenueByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ label, percent, value }) => {
                    if (percent < 0.05) return '' // Ocultar etiquetas muy pequeñas
                    return `${label}\n${(percent * 100).toFixed(0)}%\n€${value.toFixed(2)}`
                  }}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.revenueByStatus.map((entry, index) => {
                    const colors = ['#10b981', '#f59e0b', '#ef4444'] // Verde: Entregados, Amarillo: En Proceso, Rojo: Cancelados
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  })}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => {
                    const entry = stats.revenueByStatus.find(e => e.value === value)
                    return [
                      `€${value.toFixed(2)}`,
                      entry?.description || name
                    ]
                  }}
                  labelFormatter={(label, payload: any) => {
                    const entry = payload?.[0]?.payload
                    return entry?.label || entry?.status || label
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={60}
                  formatter={(value, entry: any) => {
                    const data = entry?.payload
                    if (data) {
                      return `${data.label || data.status}: €${data.value.toFixed(2)} (${((data.value / stats.revenueByStatus.reduce((sum, e) => sum + e.value, 0)) * 100).toFixed(0)}%)`
                    }
                    return value
                  }}
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Métricas Operativas Financieras */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/pedidos" className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:border-primary/40 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Frecuencia de Pedidos</span>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.orderFrequency.toFixed(1)}</p>
            <p className="text-xs text-gray-500 mt-1">Pedidos por cliente/mes</p>
          </Link>
          <Link href="/admin/usuarios" className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:border-primary/40 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Ingresos por Empleado</span>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900">€{stats.revenuePerEmployee.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Productividad del equipo</p>
          </Link>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Punto de Equilibrio</span>
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900">{Math.ceil(stats.breakEvenPoint)}</p>
            <p className="text-xs text-gray-500 mt-1">Pedidos necesarios/mes</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Tasa de Abandono</span>
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.churnRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-1">Clientes perdidos</p>
          </div>
        </div>
      </section>

      {/* Métricas Financieras Básicas */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Métricas Financieras Detalladas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/pedidos"
            className="block p-4 bg-white border-2 border-gray-200 rounded-lg hover:bg-primary/5 hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-semibold text-gray-900 group-hover:text-primary">Ingresos del Mes</h3>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">€{stats.monthlyRevenue.toFixed(2)}</p>
            <p className="text-sm text-gray-600">{stats.monthlyOrders} pedidos entregados</p>
          </Link>
          <Link
            href="/admin/pedidos"
            className="block p-4 bg-white border-2 border-gray-200 rounded-lg hover:bg-primary/5 hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <h3 className="font-semibold text-gray-900 group-hover:text-primary">Proyección Mensual</h3>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">€{stats.projectedMonthlyRevenue.toFixed(2)}</p>
            <p className="text-sm text-gray-600">
              {stats.revenueGrowthRate > 0 ? `+${stats.revenueGrowthRate}%` : `${stats.revenueGrowthRate}%`} vs actual
            </p>
          </Link>
          <Link
            href="/admin/pedidos"
            className="block p-4 bg-white border-2 border-gray-200 rounded-lg hover:bg-primary/5 hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="font-semibold text-gray-900 group-hover:text-primary">Valor Promedio</h3>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">€{stats.averageOrderValue.toFixed(2)}</p>
            <p className="text-sm text-gray-600">
              {stats.averageOrderValueVsTarget >= 100 ? '✓' : '⚠'} {stats.averageOrderValueVsTarget}% del objetivo (€{stats.averageOrderValueTarget})
            </p>
          </Link>
          <Link
            href="/admin/pedidos"
            className="block p-4 bg-white border-2 border-gray-200 rounded-lg hover:bg-primary/5 hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-semibold text-gray-900 group-hover:text-primary">Ingresos Pendientes</h3>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">€{stats.pendingRevenue.toFixed(2)}</p>
            <p className="text-sm text-gray-600">Pedidos en proceso</p>
          </Link>
        </div>
      </section>

      {/* Métricas Financieras Avanzadas */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Análisis Financiero Detallado
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/usuarios"
            className="block p-4 bg-white border-2 border-gray-200 rounded-lg hover:bg-primary/5 hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="font-semibold text-gray-900 group-hover:text-primary">Ingresos por Cliente</h3>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">€{stats.revenuePerSubscriber.toFixed(2)}</p>
            <p className="text-sm text-gray-600">Promedio por suscriptor</p>
          </Link>
          <Link
            href="/admin/usuarios"
            className="block p-4 bg-white border-2 border-gray-200 rounded-lg hover:bg-primary/5 hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <h3 className="font-semibold text-gray-900 group-hover:text-primary">Top Cliente</h3>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">€{stats.topCustomerValue.toFixed(2)}</p>
            <p className="text-sm text-gray-600">{stats.topCustomerName}</p>
          </Link>
          <Link
            href="/admin/menu"
            className="block p-4 bg-white border-2 border-gray-200 rounded-lg hover:bg-primary/5 hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <h3 className="font-semibold text-gray-900 group-hover:text-primary">Producto Más Vendido</h3>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{stats.mostSoldItemCount}</p>
            <p className="text-sm text-gray-600">{stats.mostSoldItem}</p>
          </Link>
          <Link
            href="/admin/pedidos"
            className="block p-4 bg-white border-2 border-gray-200 rounded-lg hover:bg-primary/5 hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-semibold text-gray-900 group-hover:text-primary">Promedio Diario</h3>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">€{stats.dailyAverageRevenue.toFixed(2)}</p>
            <p className="text-sm text-gray-600">Ingresos promedio por día</p>
          </Link>
        </div>
      </section>

      {/* Métricas de Crecimiento */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Métricas de Crecimiento
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SummaryCard
            title="Suscriptores Activos"
            value={stats.activeSubscribers}
            subtitle="Clientes registrados"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
          />
          <SummaryCard
            title="Tasa de Conversión"
            value={`${stats.conversionRate}%`}
            subtitle="Suscriptores con plan activo"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
          <SummaryCard
            title="Planes Activos"
            value={stats.activePlans}
            subtitle="Asignados a suscriptores"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
        </div>
      </section>

      {/* Métricas Operativas */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Métricas Operativas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Pedidos Entregados"
            value={stats.ordersByStatus.entregado}
            subtitle="Completados exitosamente"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            }
          />
          <SummaryCard
            title="En Camino"
            value={stats.ordersByStatus.enCamino}
            subtitle="En proceso de entrega"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <SummaryCard
            title="En Preparación"
            value={stats.ordersByStatus.preparando}
            subtitle="En cocina"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <SummaryCard
            title="Cancelados"
            value={stats.ordersByStatus.cancelado}
            subtitle="Pedidos cancelados"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            }
          />
        </div>
      </section>

      {/* Alertas y Acciones Urgentes */}
      {(stats.delayedOrders > 0 || stats.subscribersWithoutPlan > 0 || stats.unavailableMenuItems > 0 || stats.cancellationRate > 20) && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Alertas y Acciones Urgentes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.delayedOrders > 0 && (
              <Link
                href="/admin/pedidos"
                className="block p-4 bg-red-50 border-2 border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="font-semibold text-red-900 group-hover:text-red-700">Pedidos con Retraso</h3>
                  </div>
                  <svg className="w-5 h-5 text-red-400 group-hover:text-red-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <p className="text-2xl font-bold text-red-700 mb-1">{stats.delayedOrders}</p>
                <p className="text-sm text-red-600">Requieren atención inmediata</p>
              </Link>
            )}
            {stats.subscribersWithoutPlan > 0 && (
              <Link
                href="/admin/usuarios"
                className="block p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg hover:bg-yellow-100 hover:border-yellow-300 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="font-semibold text-yellow-900 group-hover:text-yellow-700">Sin Plan Asignado</h3>
                  </div>
                  <svg className="w-5 h-5 text-yellow-400 group-hover:text-yellow-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <p className="text-2xl font-bold text-yellow-700 mb-1">{stats.subscribersWithoutPlan}</p>
                <p className="text-sm text-yellow-600">Suscriptores pendientes de plan</p>
              </Link>
            )}
            {stats.unavailableMenuItems > 0 && (
              <Link
                href="/admin/menu"
                className="block p-4 bg-orange-50 border-2 border-orange-200 rounded-lg hover:bg-orange-100 hover:border-orange-300 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="font-semibold text-orange-900 group-hover:text-orange-700">Items No Disponibles</h3>
                  </div>
                  <svg className="w-5 h-5 text-orange-400 group-hover:text-orange-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <p className="text-2xl font-bold text-orange-700 mb-1">{stats.unavailableMenuItems}</p>
                <p className="text-sm text-orange-600">Revisar disponibilidad</p>
              </Link>
            )}
            {stats.cancellationRate > 20 && (
              <Link
                href="/admin/pedidos"
                className="block p-4 bg-purple-50 border-2 border-purple-200 rounded-lg hover:bg-purple-100 hover:border-purple-300 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <h3 className="font-semibold text-purple-900 group-hover:text-purple-700">Tasa de Cancelación</h3>
                  </div>
                  <svg className="w-5 h-5 text-purple-400 group-hover:text-purple-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <p className="text-2xl font-bold text-purple-700 mb-1">{stats.cancellationRate}%</p>
                <p className="text-sm text-purple-600">Por encima del objetivo</p>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Métricas de Rendimiento con Acciones */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Métricas de Rendimiento
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/pedidos"
            className="block p-4 bg-white border-2 border-gray-200 rounded-lg hover:bg-primary/5 hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="font-semibold text-gray-900 group-hover:text-primary">Pedidos en Proceso</h3>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {stats.ordersByStatus.preparando + stats.ordersByStatus.enCamino}
            </p>
            <p className="text-sm text-gray-600">Requieren seguimiento</p>
          </Link>
          <Link
            href="/admin/usuarios"
            className="block p-4 bg-white border-2 border-gray-200 rounded-lg hover:bg-primary/5 hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <h3 className="font-semibold text-gray-900 group-hover:text-primary">Nuevos Suscriptores</h3>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{stats.newSubscribersThisWeek}</p>
            <p className="text-sm text-gray-600">Esta semana</p>
          </Link>
          <Link
            href="/admin/menu"
            className="block p-4 bg-white border-2 border-gray-200 rounded-lg hover:bg-primary/5 hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <h3 className="font-semibold text-gray-900 group-hover:text-primary">Gestión de Menú</h3>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">Activo</p>
            <p className="text-sm text-gray-600">Revisar disponibilidad y precios</p>
          </Link>
        </div>
      </section>

      {/* Gestión del Sistema */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Gestión del Sistema
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/usuarios"
            className="block p-4 text-left border rounded-lg hover:bg-primary/5 hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 group-hover:text-primary">Usuarios y Roles</h3>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">
              {stats.totalUsers} usuarios totales · {stats.teamMembers} miembros del equipo
            </p>
          </Link>
          <Link
            href="/admin/pedidos"
            className="block p-4 text-left border rounded-lg hover:bg-primary/5 hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 group-hover:text-primary">Gestión de Pedidos</h3>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">
              Supervisar y gestionar todos los pedidos del sistema
            </p>
          </Link>
          <Link
            href="/admin/menu"
            className="block p-4 text-left border rounded-lg hover:bg-primary/5 hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 group-hover:text-primary">Gestión del Menú</h3>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">
              Administrar platos, precios y disponibilidad
            </p>
          </Link>
        </div>
        <div className="mt-4 p-3 text-sm text-gray-600 bg-gray-50 rounded-lg border border-gray-100">
          <p className="font-medium text-gray-700 mb-1">Nota:</p>
          <p>Los planes nutricionales se gestionan desde el dashboard de Nutricionista.</p>
        </div>
      </section>
    </div>
  )
}

