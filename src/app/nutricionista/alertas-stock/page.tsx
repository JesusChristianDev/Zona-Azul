'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import PageHeader from '@/components/ui/PageHeader'
import ToastMessage from '@/components/ui/ToastMessage'
import LoadingState from '@/components/ui/LoadingState'
import EmptyState from '@/components/ui/EmptyState'

interface MealStock {
  id: string
  meal_id: string
  stock_quantity: number
  is_out_of_stock: boolean
  out_of_stock_since?: string
  nutritionist_notified: boolean
  meals?: {
    id: string
    name: string
    type: string
    calories: number
  }
}

export default function NutricionistaAlertasStockPage() {
  const { userId } = useAuth()
  const [outOfStockMeals, setOutOfStockMeals] = useState<MealStock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadOutOfStockMeals()
    // Actualizar cada 30 segundos
    const interval = setInterval(loadOutOfStockMeals, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadOutOfStockMeals = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/meal-stock?out_of_stock=true')
      if (!response.ok) throw new Error('Error al cargar alertas de stock')
      
      const data = await response.json()
      // Filtrar solo los que no han sido notificados o recientes
      const recent = data.filter((item: MealStock) => 
        !item.nutritionist_notified || 
        (item.out_of_stock_since && 
         new Date(item.out_of_stock_since).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 días
      )
      setOutOfStockMeals(recent)
    } catch (error: any) {
      console.error('Error loading stock alerts:', error)
      setError(error.message || 'Error al cargar alertas')
    } finally {
      setLoading(false)
    }
  }

  const getMealTypeText = (type: string) => {
    return type === 'lunch' ? 'Almuerzo' : type === 'dinner' ? 'Cena' : type
  }

  if (loading) {
    return <LoadingState message="Cargando alertas..." />
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mensajes */}
      {error && (
        <ToastMessage
          message={error}
          type="error"
          onClose={() => setError(null)}
        />
      )}

      {/* Header */}
      <PageHeader
        title="Alertas de Stock"
        description="Platos sin stock que requieren tu atención para aprobar sustituciones"
      />

      {/* Lista de platos sin stock */}
      {outOfStockMeals.length === 0 ? (
        <EmptyState
          title="No hay platos sin stock en este momento"
          message="Todos los platos tienen stock disponible."
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {outOfStockMeals.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-red-50 border-l-4 border-red-500"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {item.meals?.name || 'Plato no disponible'}
                      </h3>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Sin Stock
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        Tipo: {getMealTypeText(item.meals?.type || '')} • 
                        {item.meals && ` ${item.meals.calories} kcal`}
                      </p>
                      {item.out_of_stock_since && (
                        <p className="text-xs text-red-600">
                          Sin stock desde: {new Date(item.out_of_stock_since).toLocaleDateString('es-ES')} {new Date(item.out_of_stock_since).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        ⚠️ Este plato ha sido bloqueado automáticamente. Revisa los menús que lo incluyen y aprueba sustituciones si es necesario.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Información */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Información</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Los platos sin stock se bloquean automáticamente.</li>
          <li>Recibirás una notificación cuando un plato se quede sin stock.</li>
          <li>Revisa los menús semanales que incluyen estos platos y aprueba sustituciones si es necesario.</li>
        </ul>
      </div>
    </div>
  )
}

