'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando stock...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-700 text-sm">
          {success}
        </div>
      )}

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Stock</h1>
          <p className="text-sm text-gray-600 mt-1">
            Controla el stock de platos. Los platos sin stock se bloquean automáticamente.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium"
        >
          + Gestionar Stock
        </button>
      </header>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterOutOfStock(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !filterOutOfStock
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterOutOfStock(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterOutOfStock
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Sin Stock
          </button>
        </div>
      </div>

      {/* Lista de stock */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {stock.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay registros de stock {filterOutOfStock ? 'sin stock' : ''}
          </div>
        ) : (
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
                    <button
                      onClick={() => {
                        setSelectedStock(item)
                        setFormData({
                          meal_id: item.meal_id,
                          stock_quantity: item.stock_quantity.toString(),
                          min_stock_threshold: item.min_stock_threshold.toString(),
                        })
                        setIsEditModalOpen(true)
                      }}
                      className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
          <div className="flex gap-3 pt-4">
            <button
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
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreateOrUpdate}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              {isEditModalOpen ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}


