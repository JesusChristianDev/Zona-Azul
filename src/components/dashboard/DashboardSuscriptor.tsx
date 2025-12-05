"use client"

import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAuth } from '../../hooks/useAuth'
import { UserProfile, MealPlan, User } from '../../lib/types'
import { getPlan, getProgress, getProfile, getUserById } from '../../lib/api'
import * as api from '../../lib/api'
import SummaryCard from '../ui/SummaryCard'
import InteractiveGreeting from '../ui/InteractiveGreeting'
import { useDarkMode } from '../../hooks/useDarkMode'

interface ProgressEntry {
  date: string
  weight?: number
  hydration?: number
  energy?: number
  notes?: string
}

// Función para obtener el nutricionista asignado al suscriptor desde la API
async function getAssignedNutricionista(subscriberId: string): Promise<User | null> {
  try {
    // Buscar asignación desde la API
    const assignment = await api.getNutricionistaByClientId(subscriberId)
    if (assignment && assignment.nutricionista_id) {
      // Obtener información del nutricionista específico
      const nutricionista = await getUserById(assignment.nutricionista_id)
      if (nutricionista) {
        return nutricionista as User
      }
    }

    return null
  } catch (error) {
    console.error('Error getting assigned nutricionista:', error)
    return null
  }
}

export default function DashboardSuscriptor() {
  const { userId, userName, userEmail } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [plan, setPlan] = useState<MealPlan | null>(null)
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([])
  const [assignedNutricionista, setAssignedNutricionista] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<any>(null)
  const [nextAppointment, setNextAppointment] = useState<any>(null)
  const [pendingOrders, setPendingOrders] = useState<number>(0)
  const [stats, setStats] = useState({
    averageCalories: 0,
    averageWater: 0,
    weightChange: 0,
    weeklyData: [] as Array<{ date: string; calories: number; water: number; protein: number }>,
  })
  const isDarkMode = useDarkMode()

  // Cache para evitar recargas innecesarias cuando el componente se remonta
  const [dataLoaded, setDataLoaded] = useState(false)
  
  useEffect(() => {
    const loadData = async () => {
      if (!userId || !userName || !userEmail) return
      
      // Si los datos ya se cargaron y tenemos perfil, no recargar
      // Esto evita recargas cuando se monta el componente después de navegar a ajustes
      if (dataLoaded && profile) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // Cargar perfil desde API
        const apiProfile = await getProfile()
        if (apiProfile) {
          setProfile({
            id: userId,
            name: userName,
            email: userEmail,
            phone: apiProfile.phone || '',
            subscriptionStatus: apiProfile.subscription_status || 'inactive',
            goals: {
              calories: apiProfile.goals_calories || 2000,
              water: apiProfile.goals_water || 2000,
              weight: apiProfile.goals_weight || 70,
            },
          } as UserProfile)
        } else {
          // Crear perfil inicial si no existe
          const newProfile: UserProfile = {
            id: userId,
            name: userName,
            email: userEmail,
            phone: '',
            subscriptionStatus: 'inactive',
            goals: {
              calories: 2000,
              water: 2000,
              weight: 70,
            },
          }
          setProfile(newProfile)
        }

        // Cargar plan desde API
        const apiPlan = await getPlan()
        if (apiPlan && apiPlan.days && apiPlan.days.length > 0) {
          setPlan(apiPlan as MealPlan)
        } else {
          setPlan(null)
        }

        // Cargar progreso desde API
        const apiProgress = await getProgress()
        if (apiProgress && apiProgress.length > 0) {
          const formattedProgress: ProgressEntry[] = apiProgress.map((p: any) => ({
            date: p.date,
            weight: p.weight,
            hydration: p.water ? p.water / 1000 : undefined, // Convertir ml a litros
            energy: p.calories,
            notes: p.notes,
          }))
          setProgressEntries(formattedProgress)
        } else {
          setProgressEntries([])
        }

        // Cargar suscripción activa
        try {
          const subResponse = await fetch(`/api/subscriptions?user_id=${userId}`)
          if (subResponse.ok) {
            const subData = await subResponse.json()
            const activeSub = subData.find((sub: any) => 
              sub.status === 'active' || sub.status === 'pending_approval'
            )
            if (activeSub) {
              setSubscription(activeSub)
            } else {
              setSubscription(null)
            }
          }
        } catch (error) {
          console.error('Error loading subscription:', error)
        }

        // Cargar próxima cita
        try {
          const aptResponse = await fetch('/api/appointments')
          if (aptResponse.ok) {
            const aptData = await aptResponse.json()
            const appointments = aptData.appointments || []
            const upcoming = appointments
              .filter((apt: any) => {
                const aptDate = new Date(apt.date_time)
                return aptDate >= new Date() && apt.status !== 'cancelada' && apt.status !== 'completada'
              })
              .sort((a: any, b: any) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime())
            
            if (upcoming.length > 0) {
              setNextAppointment(upcoming[0])
            } else {
              setNextAppointment(null)
            }
          }
        } catch (error) {
          console.error('Error loading appointments:', error)
        }

        // Cargar pedidos pendientes
        try {
          const ordersResponse = await fetch(`/api/orders?user_id=${userId}`)
          if (ordersResponse.ok) {
            const ordersData = await ordersResponse.json()
            const orders = ordersData.orders || []
            const pending = orders.filter((order: any) => 
              order.status === 'pending' || order.status === 'confirmed' || order.status === 'preparing'
            )
            setPendingOrders(pending.length)
          }
        } catch (error) {
          console.error('Error loading orders:', error)
        }

        // Obtener nutricionista asignado
        const nutricionista = await getAssignedNutricionista(userId)
        setAssignedNutricionista(nutricionista)
        
        // Marcar como cargado
        setDataLoaded(true)
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Polling cada 30 segundos para actualizar datos (solo si ya se cargaron)
    const interval = setInterval(() => {
      if (dataLoaded && userId && userName && userEmail) {
        // Recargar datos en segundo plano sin mostrar loading
        loadData()
      }
    }, 30000)

    return () => {
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userName, userEmail]) // Solo dependencias esenciales para evitar loops

  // Calcular estadísticas desde datos reales
  useEffect(() => {
    if (progressEntries.length === 0) {
      setStats({
        averageCalories: 0,
        averageWater: 0,
        weightChange: 0,
        weeklyData: [],
      })
      return
    }

    // Obtener últimos 7 días de progreso
    const last7Days = progressEntries
      .slice(0, 7)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Calcular promedios
    const entriesWithWater = last7Days.filter((e) => e.hydration !== undefined)
    const averageWater = entriesWithWater.length > 0
      ? entriesWithWater.reduce((sum, e) => sum + (e.hydration || 0), 0) / entriesWithWater.length
      : 0

    // Calcular cambio de peso (primero vs último)
    const weights = last7Days.filter((e) => e.weight !== undefined).map((e) => e.weight!)
    const weightChange = weights.length >= 2 ? weights[0] - weights[weights.length - 1] : 0

    // Calcular calorías promedio del plan (si existe)
    let averageCalories = 0
    if (plan && plan.days && plan.days.length > 0) {
      const totalCalories = plan.days.reduce((sum, day) => sum + day.totalCalories, 0)
      averageCalories = totalCalories / plan.days.length
    }

    // Preparar datos semanales para gráficos
    const weeklyData = last7Days.map((entry) => ({
      date: entry.date,
      calories: averageCalories, // Usar promedio del plan
      water: entry.hydration || 0,
      protein: 0, // No tenemos datos de proteína en el progreso actual
    }))

    setStats({
      averageCalories,
      averageWater,
      weightChange,
      weeklyData,
    })
  }, [progressEntries, plan])

  // Colores para gráficos según el tema
  const axisColor = isDarkMode ? '#94a3b8' : '#6b7280'
  const gridColor = isDarkMode ? '#475569' : '#f0f0f0'
  const strokeColor = isDarkMode ? '#475569' : '#e5e7eb'
  const tooltipBg = isDarkMode ? '#1e293b' : '#fff'
  const tooltipBorder = isDarkMode ? '#334155' : '#e5e7eb'
  const tooltipText = isDarkMode ? '#cbd5e1' : '#6b7280'

  // Preparar datos para gráficos
  const weeklyChartData = stats.weeklyData.length > 0
    ? stats.weeklyData.map((entry) => ({
      fecha: new Date(entry.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
      calorías: entry.calories,
      agua: entry.water,
      proteína: entry.protein,
    }))
    : []

  // Calcular macronutrientes desde el plan (si existe)
  const macroData = plan && plan.days
    ? [
      { nombre: 'Proteína', valor: 0 }, // No tenemos datos de macronutrientes en el plan actual
      { nombre: 'Carbohidratos', valor: 0 },
      { nombre: 'Grasas', valor: 0 },
    ]
    : []

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Saludo siempre primero */}
      <div className="w-full">
        <InteractiveGreeting userName={profile.name} role="suscriptor" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <SummaryCard
          title="Suscripción"
          value={subscription ? (subscription.status === 'active' ? 'Activa' : 'Pendiente') : 'Inactiva'}
          subtitle={
            subscription && subscription.end_date
              ? (() => {
                  const endDate = new Date(subscription.end_date)
                  const today = new Date()
                  const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                  return daysLeft > 0 ? `${daysLeft} días restantes` : 'Expirada'
                })()
              : subscription?.status === 'pending_approval'
              ? 'Esperando aprobación'
              : 'Sin suscripción'
          }
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
        <SummaryCard
          title="Calorías Promedio"
          value={Math.round(stats.averageCalories)}
          subtitle={`Meta: ${profile.goals.calories} kcal`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
          trend={{
            value: stats.averageCalories > 0 ? ((stats.averageCalories - profile.goals.calories) / profile.goals.calories) * 100 : 0,
            isPositive: stats.averageCalories >= profile.goals.calories * 0.9, // 90% o más se considera positivo
          }}
        />
        <SummaryCard
          title="Agua Consumida"
          value={`${Math.round(stats.averageWater)} ml`}
          subtitle={`Meta: ${profile.goals.water} ml`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          }
          trend={{
            value: stats.averageWater > 0 ? ((stats.averageWater - profile.goals.water) / profile.goals.water) * 100 : 0,
            isPositive: stats.averageWater >= profile.goals.water * 0.9,
          }}
        />
        <SummaryCard
          title="Plan Activo"
          value={plan ? "Plan Semanal" : "Sin plan"}
          subtitle={plan ? `Hasta ${new Date(plan.endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}` : "Contacta con tu nutricionista"}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
      </div>

      {/* Segunda fila de tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <SummaryCard
          title="Comidas por Día"
          value={subscription?.meals_per_day === 2 ? '2 comidas' : subscription?.meals_per_day === 1 ? '1 comida' : '—'}
          subtitle={subscription?.meals_per_day === 2 ? 'Almuerzo y Cena' : subscription?.meals_per_day === 1 ? 'Almuerzo o Cena' : 'No definido'}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          }
        />
        <SummaryCard
          title="Próxima Cita"
          value={nextAppointment ? new Date(nextAppointment.date_time).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'Sin cita'}
          subtitle={nextAppointment ? new Date(nextAppointment.date_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'Agenda una consulta'}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <SummaryCard
          title="Pedidos Pendientes"
          value={pendingOrders > 0 ? pendingOrders.toString() : '0'}
          subtitle={pendingOrders > 0 ? 'En preparación' : 'Sin pedidos'}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
        />
        <SummaryCard
          title="Cambio de Peso"
          value={`${stats.weightChange > 0 ? '+' : ''}${stats.weightChange.toFixed(1)} kg`}
          subtitle="Esta semana"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
          trend={{
            value: Math.abs(stats.weightChange),
            isPositive: stats.weightChange < 0, // Perder peso es positivo
          }}
        />
      </div>

      {/* Gráficos */}
      {weeklyChartData.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-4 sm:mb-6 lg:mb-8">
          {/* Gráfico de progreso semanal */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 p-4 sm:p-5 lg:p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">Progreso Semanal</h2>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span>Calorías</span>
                <div className="w-3 h-3 rounded-full bg-sky-500 ml-2"></div>
                <span>Agua</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={weeklyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis 
                  dataKey="fecha" 
                  tick={{ fontSize: 11, fill: axisColor }} 
                  stroke={strokeColor}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: axisColor }} 
                  stroke={strokeColor}
                />
                <Tooltip 
                  contentStyle={{ 
                    fontSize: '12px', 
                    backgroundColor: tooltipBg,
                    border: `1px solid ${tooltipBorder}`,
                    borderRadius: '8px',
                    padding: '8px',
                    color: tooltipText
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{payload[0].payload.fecha}</p>
                          {payload.map((entry: any, index: number) => (
                            <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
                              {entry.name}: {entry.value}
                            </p>
                          ))}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} 
                  iconType="line"
                />
                <Line 
                  type="monotone" 
                  dataKey="calorías" 
                  stroke="#059669" 
                  strokeWidth={2.5} 
                  name="Calorías (kcal)"
                  dot={{ fill: '#059669', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="agua" 
                  stroke="#0ea5e9" 
                  strokeWidth={2.5} 
                  name="Agua (ml)"
                  dot={{ fill: '#0ea5e9', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de hidratación */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 p-4 sm:p-5 lg:p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">Hidratación Diaria</h2>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Meta: {profile.goals.water} ml
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weeklyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis 
                  dataKey="fecha" 
                  tick={{ fontSize: 11, fill: axisColor }} 
                  stroke={strokeColor}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: axisColor }} 
                  stroke={strokeColor}
                />
                <Tooltip 
                  contentStyle={{ 
                    fontSize: '12px', 
                    backgroundColor: tooltipBg,
                    border: `1px solid ${tooltipBorder}`,
                    borderRadius: '8px',
                    padding: '8px',
                    color: tooltipText
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{payload[0].payload.fecha}</p>
                          {payload.map((entry: any, index: number) => (
                            <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
                              {entry.name}: {entry.value}
                            </p>
                          ))}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar 
                  dataKey="agua" 
                  fill="#0ea5e9" 
                  radius={[8, 8, 0, 0]} 
                  name="Agua (ml)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 p-8 sm:p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Aún no hay datos de progreso</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Comienza a registrar tu progreso diario para ver tus estadísticas aquí.
            </p>
            <a
              href="/suscriptor/progreso"
              className="btn btn-primary w-full sm:w-auto justify-center"
            >
              Registrar Progreso
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      )}

      {/* Plan de comidas - Solo día actual */}
      {plan && plan.days && plan.days.length > 0 ? (() => {
        // Obtener el día actual de la semana (0 = Domingo, 1 = Lunes, ..., 6 = Sábado)
        const today = new Date()
        const dayOfWeek = today.getDay() // 0-6
        // Mapear a nombres en español (el plan usa Lunes-Viernes, que son días 1-5)
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
        const todayName = dayNames[dayOfWeek]
        
        // Buscar el día actual en el plan (solo Lunes-Viernes están en el plan)
        const todayPlan = plan.days.find((day) => day.day === todayName)
        
        return todayPlan ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">Plan de Comidas de Hoy</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {todayName} - {today.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                {assignedNutricionista ? (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-semibold text-xs">
                        {assignedNutricionista.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span>Creado por {assignedNutricionista.name}</span>
                  </div>
                ) : plan?.createdBy ? (
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Creado por {plan.createdBy}
                  </span>
                ) : null}
                <a
                  href="/suscriptor/plan"
                  className="btn btn-ghost w-full sm:w-auto justify-center"
                >
                  Ver plan completo
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
            <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 sm:p-5 bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{todayPlan.day}</h3>
                <span className="text-sm bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">
                  {todayPlan.totalCalories} kcal
                </span>
              </div>
              <div className="space-y-3">
                {todayPlan.meals && todayPlan.meals.length > 0 ? (
                  todayPlan.meals.map((meal, index) => (
                    <div
                      key={index}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 hover:border-primary/30 dark:hover:border-primary/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-800 dark:text-gray-100 text-sm block">{meal.name}</span>
                        {meal.description && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">{meal.description}</span>
                        )}
                        <span className="text-xs text-primary font-medium mt-1 inline-block">{meal.calories} kcal</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No hay comidas programadas para hoy
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">Plan de Comidas</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  No hay plan para {todayName}
                </p>
              </div>
              <a
                href="/suscriptor/plan"
                className="btn btn-ghost w-full sm:w-auto justify-center"
              >
                Ver plan completo
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              El plan nutricional solo incluye días laborables (Lunes a Viernes)
            </p>
          </div>
        )
      })() : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 p-8 sm:p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No tienes un plan activo</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Contacta con tu nutricionista para que te asigne un plan personalizado.
            </p>
            {assignedNutricionista && (
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 mb-4">
                <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">Tu nutricionista asignado:</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{assignedNutricionista.name}</p>
                {assignedNutricionista.email && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{assignedNutricionista.email}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
