'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import ActionButton from '@/components/ui/ActionButton'
import ToastMessage from '@/components/ui/ToastMessage'
import LoadingState from '@/components/ui/LoadingState'
import EmptyState from '@/components/ui/EmptyState'

interface MealStock {
  id: string
  meal_id: string
  stock_quantity: number
  min_stock_threshold: number
  is_out_of_stock: boolean
  out_of_stock_since?: string
  nutritionist_notified: boolean
  meals?: {
    id: string
    name: string
    description?: string
    type: string
    calories: number
    available: boolean
  }
}

export default function AdminStockPage() {
  const { userId } = useAuth()
  const [stock, setStock] = useState<MealStock[]>([])
  const [meals, setMeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedStock, setSelectedStock] = useState<MealStock | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filterOutOfStock, setFilterOutOfStock] = useState(false)
  const [formData, setFormData] = useState({
    meal_id: '',
    stock_quantity: '0',
    min_stock_threshold: '5',
  })

  useEffect(() => {
    loadStock()
    loadMeals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOutOfStock])

  const loadStock = async () => {
    try {
      setLoading(true)
      const url = filterOutOfStock
        ? '/api/meal-stock?out_of_stock=true'
        : '/api/meal-stock'
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Error al cargar stock')
      
      const data = await response.json()
      setStock(data)
    } catch (error: any) {
      console.error('Error loading stock:', error)
      setError(error.message || 'Error al cargar stock')
    } finally {
      setLoading(false)
    }
  }

  const loadMeals = async () => {
    try {
      const response = await fetch('/api/meals')
      if (response.ok) {
        const data = await response.json()
        // La API devuelve { meals: [...] }, extraer el array
        const mealsArray = data.meals || (Array.isArray(data) ? data : [])
        setMeals(Array.isArray(mealsArray) ? mealsArray : [])
      } else {
        setMeals([])
      }
    } catch (error) {
      console.error('Error loading meals:', error)
      setMeals([]) // En caso de error, establecer array vacío
    }
  }

  const handleCreateOrUpdate = async () => {
    if (!formData.meal_id || !formData.stock_quantity) {
      setError('Debes seleccionar un plato y especificar la cantidad')
      return
    }

    try {
      const response = await fetch('/api/meal-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meal_id: formData.meal_id,
          stock_quantity: parseInt(formData.stock_quantity),
          min_stock_threshold: parseInt(formData.min_stock_threshold),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar stock')
      }

      setSuccess('Stock actualizado correctamente')
      loadStock()
      setIsCreateModalOpen(false)
      setIsEditModalOpen(false)
      setSelectedStock(null)
      setFormData({
        meal_id: '',
        stock_quantity: '0',
        min_stock_threshold: '5',
      })
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error updating stock:', error)
      setError(error.message || 'Error al actualizar stock')
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleQuickUpdate = async (stockId: string, newQuantity: number) => {
    try {
      const stockItem = stock.find(s => s.id === stockId)
      if (!stockItem) return

      const response = await fetch('/api/meal-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meal_id: stockItem.meal_id,
          stock_quantity: newQuantity,
          min_stock_threshold: stockItem.min_stock_threshold,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar stock')
      }

      setSuccess('Stock actualizado correctamente')
      loadStock()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error updating stock:', error)
      setError(error.message || 'Error al actualizar stock')
      setTimeout(() => setError(null), 5000)
    }
  }

  const plusIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )

  if (loading) {
    return <LoadingState message="Cargando stock..." />
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
      {success && (
        <ToastMessage
          message={success}
          type="success"
          onClose={() => setSuccess(null)}
        />
      )}

      {/* Header */}
      <PageHeader
        title="Gestión de Stock"
        description="Controla el stock de platos. Los platos sin stock se bloquean automáticamente."
        action={
          <ActionButton onClick={() => setIsCreateModalOpen(true)} icon={plusIcon}>
            Gestionar Stock
          </ActionButton>
        }
      />

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <ActionButton
            onClick={() => setFilterOutOfStock(false)}
            variant={filterOutOfStock ? 'muted' : 'primary'}
            size="sm"
          >
            Todos
          </ActionButton>
          <ActionButton
            onClick={() => setFilterOutOfStock(true)}
            variant={filterOutOfStock ? 'danger' : 'muted'}
            size="sm"
          >
            Sin Stock
          </ActionButton>
        </div>
      </div>

      {/* Lista de stock */}
      {stock.length === 0 ? (
        <EmptyState
          title="No hay registros de stock"
          message={filterOutOfStock ? 'No hay platos sin stock.' : 'Crea el primer registro de stock.'}
          action={
            !filterOutOfStock ? (
              <ActionButton onClick={() => setIsCreateModalOpen(true)} icon={plusIcon}>
                Crear Registro de Stock
              </ActionButton>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {stock.map((item) => (
              <div
                key={item.id}
                className={`p-4 ${
                  item.is_out_of_stock ? 'bg-red-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {item.meals?.name || 'Plato no disponible'}
                      </h3>
                      {item.is_out_of_stock && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Sin Stock
                        </span>
                      )}
                      {!item.meals?.available && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Bloqueado
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        Stock: <span className="font-medium">{item.stock_quantity}</span> unidades
                      </p>
                      <p>
                        Umbral mínimo: <span className="font-medium">{item.min_stock_threshold}</span> unidades
                      </p>
                      {item.is_out_of_stock && item.out_of_stock_since && (
                        <p className="text-xs text-red-600">
                          Sin stock desde: {new Date(item.out_of_stock_since).toLocaleDateString('es-ES')}
                        </p>
                      )}
                      {item.nutritionist_notified && (
                        <p className="text-xs text-green-600">
                          ✓ Nutricionista notificado
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={item.stock_quantity}
                      onChange={(e) => {
                        const newValue = parseInt(e.target.value) || 0
                        handleQuickUpdate(item.id, newValue)
                      }}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <ActionButton
                      onClick={() => {
                        setSelectedStock(item)
                        setFormData({
                          meal_id: item.meal_id,
                          stock_quantity: item.stock_quantity.toString(),
                          min_stock_threshold: item.min_stock_threshold.toString(),
                        })
                        setIsEditModalOpen(true)
                      }}
                      variant="muted"
                      size="sm"
                    >
                      Editar
                    </ActionButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal gestionar stock */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setIsEditModalOpen(false)
          setSelectedStock(null)
          setFormData({
            meal_id: '',
            stock_quantity: '0',
            min_stock_threshold: '5',
          })
        }}
        title={isEditModalOpen ? 'Editar Stock' : 'Gestionar Stock'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plato <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.meal_id}
              onChange={(e) => setFormData({ ...formData, meal_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
              disabled={isEditModalOpen}
            >
              <option value="">Seleccionar plato...</option>
              {Array.isArray(meals) && meals.length > 0 ? (
                meals.map((meal) => (
                  <option key={meal.id} value={meal.id}>
                    {meal.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>No hay platos disponibles</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad en Stock <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Umbral Mínimo
            </label>
            <input
              type="number"
              min="0"
              value={formData.min_stock_threshold}
              onChange={(e) => setFormData({ ...formData, min_stock_threshold: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-gray-500 mt-1">
              Cuando el stock baje de este valor, se notificará al nutricionista
            </p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              ⚠️ Los platos sin stock se bloquean automáticamente y se notifica al nutricionista.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <ActionButton
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false)
                setIsEditModalOpen(false)
                setSelectedStock(null)
                setFormData({
                  meal_id: '',
                  stock_quantity: '0',
                  min_stock_threshold: '5',
                })
              }}
              variant="muted-outline"
              fullWidth
            >
              Cancelar
            </ActionButton>
            <ActionButton
              type="button"
              onClick={handleCreateOrUpdate}
              fullWidth
            >
              {isEditModalOpen ? 'Actualizar' : 'Crear'}
            </ActionButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}


