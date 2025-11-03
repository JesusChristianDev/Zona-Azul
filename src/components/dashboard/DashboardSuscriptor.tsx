"use client"

import React from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { mockProfile } from '../../lib/mockProfile'
import { mockMealPlan } from '../../lib/mockPlan'
import { mockProgress } from '../../lib/mockProgress'
import SummaryCard from '../ui/SummaryCard'

export default function DashboardSuscriptor() {
  const profile = mockProfile
  const plan = mockMealPlan
  const progress = mockProgress

  // Preparar datos para gráficos
  const weeklyChartData = progress.weeklyData.map((entry) => ({
    fecha: new Date(entry.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
    calorías: entry.calories,
    agua: entry.water,
    proteína: entry.protein,
  }))

  const macroData = [
    { nombre: 'Proteína', valor: progress.weeklyData.reduce((sum, e) => sum + e.protein, 0) / 7 },
    { nombre: 'Carbohidratos', valor: progress.weeklyData.reduce((sum, e) => sum + e.carbs, 0) / 7 },
    { nombre: 'Grasas', valor: progress.weeklyData.reduce((sum, e) => sum + e.fats, 0) / 7 },
  ]

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      {/* Header con información del usuario */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Hola, {profile.name.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-600 text-sm sm:text-base">
          Bienvenido a tu dashboard de seguimiento nutricional
        </p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <SummaryCard
          title="Calorías Promedio"
          value={Math.round(progress.averageCalories)}
          subtitle={`Meta: ${profile.goals.calories} kcal`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
          trend={{
            value: ((progress.averageCalories - profile.goals.calories) / profile.goals.calories) * 100,
            isPositive: progress.averageCalories >= profile.goals.calories * 0.9, // 90% o más se considera positivo
          }}
        />
        <SummaryCard
          title="Agua Consumida"
          value={`${Math.round(progress.averageWater)} ml`}
          subtitle={`Meta: ${profile.goals.water} ml`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          }
          trend={{
            value: ((progress.averageWater - profile.goals.water) / profile.goals.water) * 100,
            isPositive: progress.averageWater >= profile.goals.water * 0.9,
          }}
        />
        <SummaryCard
          title="Plan Activo"
          value="Plan Semanal"
          subtitle={`Hasta ${new Date(plan.endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <SummaryCard
          title="Cambio de Peso"
          value={`${progress.weightChange > 0 ? '+' : ''}${progress.weightChange.toFixed(1)} kg`}
          subtitle="Esta semana"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
          trend={{
            value: Math.abs(progress.weightChange),
            isPositive: progress.weightChange < 0, // Perder peso es positivo
          }}
        />
      </div>

      {/* Gráficos */}
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

        {/* Gráfico de macronutrientes */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Macronutrientes Promedio</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={macroData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="valor" fill="#059669" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Plan de comidas */}
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Plan de Comidas</h2>
          <span className="text-xs sm:text-sm text-gray-500">
            Creado por {plan.createdBy}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plan.meals.map((meal) => (
            <div key={meal.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-primary uppercase">
                  {meal.type === 'breakfast' && 'Desayuno'}
                  {meal.type === 'lunch' && 'Almuerzo'}
                  {meal.type === 'dinner' && 'Cena'}
                  {meal.type === 'snack' && 'Merienda'}
                </span>
                <span className="text-xs text-gray-500">{meal.calories} kcal</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{meal.name}</h3>
              <div className="space-y-1 text-xs text-gray-600">
                <div>P: {meal.protein}g</div>
                <div>C: {meal.carbs}g</div>
                <div>G: {meal.fats}g</div>
              </div>
            </div>
          ))}
        </div>
      </div>

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
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                profile.subscriptionStatus === 'active'
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

