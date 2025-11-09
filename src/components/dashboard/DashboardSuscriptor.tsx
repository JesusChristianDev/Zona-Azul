"use client"

import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAuth } from '../../hooks/useAuth'
import { mockProfile, UserProfile } from '../../lib/mockProfile'
import { mockMealPlan, MealPlan } from '../../lib/mockPlan'
import { getUserData, setUserData } from '../../lib/storage'
import { mockUsers, User } from '../../lib/mockUsers'
import SummaryCard from '../ui/SummaryCard'
import InteractiveGreeting from '../ui/InteractiveGreeting'

interface ProgressEntry {
  date: string
  weight?: number
  hydration?: number
  energy?: number
  notes?: string
}

// Función para obtener el nutricionista asignado al suscriptor
function getAssignedNutricionista(subscriberId: string): User | null {
  // Obtener todos los usuarios (mock + localStorage)
  const stored = localStorage.getItem('zona_azul_users')
  let allUsers: User[] = []

  if (stored) {
    try {
      allUsers = JSON.parse(stored)
    } catch (e) {
      // Error al parsear
    }
  }

  // Combinar nutricionistas, priorizando los de localStorage sobre mockUsers
  // Usar un Map para evitar duplicados por ID
  const nutricionistasMap = new Map<string, User>()

  // Primero agregar los de localStorage (tienen prioridad)
  allUsers
    .filter((u) => u.role === 'nutricionista')
    .forEach((nutri) => nutricionistasMap.set(nutri.id, nutri))

  // Luego agregar los de mockUsers solo si no existen ya
  mockUsers
    .filter((u) => u.role === 'nutricionista')
    .forEach((nutri) => {
      if (!nutricionistasMap.has(nutri.id)) {
        nutricionistasMap.set(nutri.id, nutri)
      }
    })

  const allNutricionistas = Array.from(nutricionistasMap.values())

  // Buscar en los clientes de cada nutricionista
  for (const nutricionista of allNutricionistas) {
    try {
      const stored = localStorage.getItem(`zona_azul_clients_user_${nutricionista.id}`)
      if (stored) {
        const clients = JSON.parse(stored)
        if (Array.isArray(clients) && clients.some((client: any) => client.id === subscriberId)) {
          return nutricionista
        }
      }
    } catch (error) {
      console.error(`Error checking clients for nutricionista ${nutricionista.id}:`, error)
    }
  }

  // Si no se encuentra, NO devolver un nutricionista por defecto
  // Devolver null para que no se muestre información incorrecta
  return null
}

export default function DashboardSuscriptor() {
  const { userId, userName, userEmail } = useAuth()
  const [profile, setProfile] = useState<UserProfile>(mockProfile)
  const [plan, setPlan] = useState<MealPlan | null>(null)
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([])
  const [assignedNutricionista, setAssignedNutricionista] = useState<User | null>(null)
  const [stats, setStats] = useState({
    averageCalories: 0,
    averageWater: 0,
    weightChange: 0,
    weeklyData: [] as Array<{ date: string; calories: number; water: number; protein: number }>,
  })

  useEffect(() => {
    if (!userId || !userName || !userEmail) return

    // Cargar perfil personalizado o crear uno nuevo
    const storedProfile = getUserData<UserProfile>('zona_azul_profile', userId)
    if (storedProfile) {
      setProfile(storedProfile)
    } else {
      // Crear perfil inicial basado en el usuario autenticado
      const newProfile: UserProfile = {
        ...mockProfile,
        id: userId,
        name: userName,
        email: userEmail,
      }
      setProfile(newProfile)
      setUserData('zona_azul_profile', newProfile, userId)
    }

    // Cargar plan real (solo si existe, no usar fallback)
    const storedPlan = getUserData<MealPlan>('zona_azul_suscriptor_plan', userId, null)
    if (storedPlan && storedPlan.days && storedPlan.days.length > 0) {
      setPlan(storedPlan)
    } else {
      // No asignar plan por defecto - el usuario no tiene plan hasta que se le asigne
      setPlan(null)
    }

    // Cargar progreso real
    const storedProgress = getUserData<ProgressEntry[]>('zona_azul_progress', userId, [])
    if (storedProgress) {
      setProgressEntries(storedProgress)
    }

    // Obtener nutricionista asignado
    if (userId) {
      const nutricionista = getAssignedNutricionista(userId)
      setAssignedNutricionista(nutricionista)
    }

    // Escuchar actualizaciones
    const handlePlanUpdate = () => {
      const updatedPlan = getUserData<MealPlan>('zona_azul_suscriptor_plan', userId, null)
      if (updatedPlan && updatedPlan.days && updatedPlan.days.length > 0) {
        setPlan(updatedPlan)
      } else {
        setPlan(null)
      }
    }

    const handleProgressUpdate = () => {
      const updatedProgress = getUserData<ProgressEntry[]>('zona_azul_progress', userId, [])
      if (updatedProgress) {
        setProgressEntries(updatedProgress)
      }
    }

    const handleClientsUpdate = () => {
      if (userId) {
        const nutricionista = getAssignedNutricionista(userId)
        setAssignedNutricionista(nutricionista)
      }
    }

    window.addEventListener('zona_azul_plan_updated', handlePlanUpdate)
    window.addEventListener('storage', handleProgressUpdate)
    window.addEventListener('zona_azul_clients_updated', handleClientsUpdate)

    return () => {
      window.removeEventListener('zona_azul_plan_updated', handlePlanUpdate)
      window.removeEventListener('storage', handleProgressUpdate)
      window.removeEventListener('zona_azul_clients_updated', handleClientsUpdate)
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

  return (
    <div className="space-y-8">
      <InteractiveGreeting userName={profile.name} role="suscriptor" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Gráfico de progreso semanal */}
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Progreso Semanal</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="calorías" stroke="#059669" strokeWidth={2} name="Calorías" />
                <Line type="monotone" dataKey="agua" stroke="#0ea5e9" strokeWidth={2} name="Agua (ml)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de hidratación */}
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Hidratación Diaria</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
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

