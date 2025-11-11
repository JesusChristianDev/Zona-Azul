"use client"

import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAuth } from '../../hooks/useAuth'
import { UserProfile, MealPlan, User } from '../../lib/types'
import { getPlan, getProgress, getProfile, getUserById } from '../../lib/api'
import * as api from '../../lib/api'
import SummaryCard from '../ui/SummaryCard'
import InteractiveGreeting from '../ui/InteractiveGreeting'

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
  const [stats, setStats] = useState({
    averageCalories: 0,
    averageWater: 0,
    weightChange: 0,
    weeklyData: [] as Array<{ date: string; calories: number; water: number; protein: number }>,
  })

  useEffect(() => {
    const loadData = async () => {
      if (!userId || !userName || !userEmail) return

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

        // Obtener nutricionista asignado
        const nutricionista = await getAssignedNutricionista(userId)
        setAssignedNutricionista(nutricionista)
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Polling cada 30 segundos para actualizar datos
    const interval = setInterval(loadData, 30000)

    return () => {
      clearInterval(interval)
    }
  }, [userId, userName, userEmail])

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
      {weeklyChartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-4 sm:mb-6 lg:mb-8">
          {/* Gráfico de progreso semanal */}
          <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 lg:p-6 overflow-hidden">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Progreso Semanal</h2>
            <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
              <LineChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" tick={{ fontSize: 10 }} className="sm:text-xs" />
                <YAxis tick={{ fontSize: 10 }} className="sm:text-xs" />
                <Tooltip contentStyle={{ fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="calorías" stroke="#059669" strokeWidth={2} name="Calorías" />
                <Line type="monotone" dataKey="agua" stroke="#0ea5e9" strokeWidth={2} name="Agua (ml)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de hidratación */}
          <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 lg:p-6 overflow-hidden">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Hidratación Diaria</h2>
            <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
              <BarChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" tick={{ fontSize: 10 }} className="sm:text-xs" />
                <YAxis tick={{ fontSize: 10 }} className="sm:text-xs" />
                <Tooltip contentStyle={{ fontSize: '12px' }} />
                <Bar dataKey="agua" fill="#0ea5e9" radius={[8, 8, 0, 0]} name="Agua (ml)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Plan de comidas */}
      {plan && plan.days && plan.days.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Plan de Comidas</h2>
            {assignedNutricionista ? (
              <span className="text-xs sm:text-sm text-gray-500">
                Creado por {assignedNutricionista.name}
              </span>
            ) : plan?.createdBy ? (
              <span className="text-xs sm:text-sm text-gray-500">
                Creado por {plan.createdBy}
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plan.days.slice(0, 3).map((day) => (
              <div key={day.day} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-gray-900 mb-3">{day.day}</h3>
                <p className="text-xs text-primary font-medium mb-3">
                  Total: {day.totalCalories} kcal
                </p>
                <div className="space-y-2">
                  {day.meals.slice(0, 2).map((meal, index) => (
                    <div key={index} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">{meal.name}</span>
                        <span className="text-xs text-gray-500">{meal.calories} kcal</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Información del perfil */}
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Mi Perfil</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Nombre</p>
            <p className="font-medium text-gray-900">{profile.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-medium text-gray-900">{profile.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Teléfono</p>
            <p className="font-medium text-gray-900">{profile.phone || 'No proporcionado'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Estado de Suscripción</p>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${profile.subscriptionStatus === 'active'
              ? 'bg-green-100 text-green-700'
              : profile.subscriptionStatus === 'expired'
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-700'
              }`}>
              {profile.subscriptionStatus === 'active' && 'Activa'}
              {profile.subscriptionStatus === 'expired' && 'Expirada'}
              {profile.subscriptionStatus === 'inactive' && 'Inactiva'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

