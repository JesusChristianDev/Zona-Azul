"use client"

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import SearchFilters from '@/components/ui/SearchFilters'
import ActionButton from '@/components/ui/ActionButton'
import ToastMessage from '@/components/ui/ToastMessage'
import LoadingState from '@/components/ui/LoadingState'
import EmptyState from '@/components/ui/EmptyState'
import ResponsiveGrid from '@/components/ui/ResponsiveGrid'
import { useMeals } from '@/hooks/useApi'
import * as api from '@/lib/api'

interface MealItem {
  id: string
  name: string
  category: string
  calories: number
  description?: string
  available: boolean
}

// Mapear tipo de meal a categoría para mostrar
const typeToCategory: Record<string, string> = {
  breakfast: 'Desayuno',
  lunch: 'Plato principal',
  dinner: 'Cena',
  snack: 'Bebida funcional',
}

// Mapear meal de API a MealItem para mostrar
function mealToMealItem(meal: any): MealItem {
  return {
    id: meal.id,
    name: meal.name,
    category: typeToCategory[meal.type] || meal.type,
    calories: meal.calories,
    description: meal.description || '',
    available: meal.available,
  }
}

export default function AdminComidasPlanesPage() {
  const { meals, loading, error: apiError, refetch } = useMeals()
  const [items, setItems] = useState<MealItem[]>([])
  const [filteredItems, setFilteredItems] = useState<MealItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('todas')
  const [filterAvailability, setFilterAvailability] = useState<string>('todas')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MealItem | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    category: 'Plato principal',
    availability: 'Disponible',
    calories: 0,
    description: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Convertir meals a items cuando se cargan o cambian
  // IMPORTANTE: Esta página solo muestra comidas para PLANES NUTRICIONALES (is_menu_item=false)
  useEffect(() => {
    if (meals && meals.length > 0) {
      // Filtrar solo comidas para planes nutricionales (NO del menú del local)
      const planMeals = meals.filter((meal: any) => meal.is_menu_item === false)
      setItems(planMeals.map(mealToMealItem))
    } else if (!loading) {
      setItems([])
    }
  }, [meals, loading])

  // Filtrar y buscar items
  useEffect(() => {
    let filtered = [...items]

    // Filtrar por categoría
    if (filterCategory !== 'todas') {
      filtered = filtered.filter(item => item.category === filterCategory)
    }

    // Filtrar por disponibilidad
    if (filterAvailability !== 'todas') {
      filtered = filtered.filter(item => 
        filterAvailability === 'Disponible' ? item.available : !item.available
      )
    }

    // Buscar por nombre o descripción
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(term) ||
        (item.description && item.description.toLowerCase().includes(term)) ||
        item.calories.toString().includes(term)
      )
    }

    setFilteredItems(filtered)
  }, [items, filterCategory, filterAvailability, searchTerm])

  const showToast = (message: string, isError = false) => {
    if (isError) {
      setError(message)
      setTimeout(() => setError(null), 5000)
    } else {
      setSuccess(message)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const handleCreate = () => {
    setFormData({
      name: '',
      category: 'Plato principal',
      availability: 'Disponible',
      calories: 0,
      description: '',
    })
    setError(null)
    setIsCreateModalOpen(true)
  }

  const handleEdit = (item: MealItem) => {
    setSelectedItem(item)
    setFormData({
      name: item.name,
      category: item.category,
      availability: item.available ? 'Disponible' : 'No disponible',
      calories: item.calories,
      description: item.description || '',
    })
    setError(null)
    setIsEditModalOpen(true)
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta comida para planes nutricionales?')) {
      return
    }

    try {
      await api.deleteMeal(itemId)
      await refetch()
      showToast('Comida eliminada correctamente')
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar la comida', true)
    }
  }

  const handleToggleAvailability = async (itemId: string) => {
    try {
      const currentMeal = meals.find((m) => m.id === itemId)
      if (!currentMeal) return

      await api.updateMeal(itemId, {
        available: !currentMeal.available,
      })
      await refetch()
      showToast('Disponibilidad actualizada')
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar disponibilidad', true)
    }
  }

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name || formData.calories <= 0) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    try {
      const categoryToType: Record<string, string> = {
        'Desayuno': 'breakfast',
        'Plato principal': 'lunch',
        'Cena': 'dinner',
        'Bebida funcional': 'snack',
      }

      const mealData = {
        name: formData.name,
        description: formData.description || null,
        type: categoryToType[formData.category] || 'lunch',
        calories: formData.calories,
        price: null, // Las comidas para planes NO tienen precio
        available: formData.availability === 'Disponible',
        is_menu_item: false, // IMPORTANTE: Esta página es para gestionar comidas para planes nutricionales
      }

      await api.createMeal(mealData)
      await refetch()
      setIsCreateModalOpen(false)
      showToast('Comida creada correctamente')
    } catch (err: any) {
      setError(err.message || 'Error al crear la comida')
      showToast(err.message || 'Error al crear la comida', true)
    }
  }

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedItem) return

    if (!formData.name || formData.calories <= 0) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    try {
      const categoryToType: Record<string, string> = {
        'Desayuno': 'breakfast',
        'Plato principal': 'lunch',
        'Cena': 'dinner',
        'Bebida funcional': 'snack',
      }

      const mealData = {
        name: formData.name,
        description: formData.description || null,
        type: categoryToType[formData.category] || 'lunch',
        calories: formData.calories,
        available: formData.availability === 'Disponible',
        is_menu_item: false, // IMPORTANTE: Mantener como comida para planes
      }

      await api.updateMeal(selectedItem.id, mealData)
      await refetch()
      setIsEditModalOpen(false)
      setSelectedItem(null)
      showToast('Comida actualizada correctamente')
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la comida')
      showToast(err.message || 'Error al actualizar la comida', true)
    }
  }

  const categories = ['todas', 'Desayuno', 'Plato principal', 'Cena', 'Bebida funcional']
  const availabilityOptions = ['todas', 'Disponible', 'No disponible']

  const plusIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <PageHeader
        title="Comidas para Planes Nutricionales"
        description="Gestiona las comidas disponibles para planes nutricionales de suscriptores"
        action={
          <ActionButton
            onClick={handleCreate}
            icon={plusIcon}
            fullWidth
          >
            <span className="hidden sm:inline">Nueva Comida</span>
            <span className="sm:hidden">Nueva</span>
          </ActionButton>
        }
      />

      {/* Mensajes de error/éxito */}
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

      {/* Filtros y búsqueda */}
      <SearchFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por nombre, descripción o calorías..."
        filters={
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'todas' ? 'Todas' : cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Disponibilidad</label>
              <select
                value={filterAvailability}
                onChange={(e) => setFilterAvailability(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                {availabilityOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'todas' ? 'Todas' : opt}
                  </option>
                ))}
              </select>
            </div>
          </>
        }
        resultsCount={
          filteredItems.length !== items.length
            ? { showing: filteredItems.length, total: items.length }
            : undefined
        }
      />

      {/* Lista de comidas */}
      {loading ? (
        <LoadingState message="Cargando comidas..." />
      ) : apiError ? (
        <ToastMessage
          message={`Error al cargar comidas: ${apiError}`}
          type="error"
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="No hay comidas disponibles"
          message={
            items.length === 0
              ? "No hay comidas para planes nutricionales. Crea la primera comida."
              : "No se encontraron comidas con los filtros seleccionados."
          }
          action={
            items.length === 0 ? (
              <ActionButton onClick={handleCreate} icon={plusIcon}>
                Crear Primera Comida
              </ActionButton>
            ) : undefined
          }
        />
      ) : (
        <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }} gap="md">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.name}</h3>
                  <p className="text-sm text-gray-500 mb-2">{item.category}</p>
                  {item.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>🔥 {item.calories} cal</span>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {item.available ? 'Disponible' : 'No disponible'}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <button
                  onClick={() => handleEdit(item)}
                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleToggleAvailability(item.id)}
                  className={`flex-1 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                    item.available
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }`}
                >
                  {item.available ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="flex-1 sm:flex-initial px-3 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </ResponsiveGrid>
      )}

      {/* Modal Crear */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Nueva Comida para Planes Nutricionales"
      >
        <form onSubmit={handleSubmitCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ej: Bowl de Quinoa Personalizado"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoría *</label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Desayuno">Desayuno</option>
              <option value="Plato principal">Plato principal</option>
              <option value="Cena">Cena</option>
              <option value="Bebida funcional">Bebida funcional</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Calorías *</label>
            <input
              type="number"
              required
              min="0"
              value={formData.calories || ''}
              onChange={(e) => setFormData({ ...formData, calories: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ej: 450"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Descripción de la comida..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Disponibilidad</label>
            <select
              value={formData.availability}
              onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Disponible">Disponible</option>
              <option value="No disponible">No disponible</option>
            </select>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Crear Comida
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedItem(null)
        }}
        title="Editar Comida para Planes Nutricionales"
      >
        <form onSubmit={handleSubmitEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoría *</label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Desayuno">Desayuno</option>
              <option value="Plato principal">Plato principal</option>
              <option value="Cena">Cena</option>
              <option value="Bebida funcional">Bebida funcional</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Calorías *</label>
            <input
              type="number"
              required
              min="0"
              value={formData.calories || ''}
              onChange={(e) => setFormData({ ...formData, calories: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Disponibilidad</label>
            <select
              value={formData.availability}
              onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Disponible">Disponible</option>
              <option value="No disponible">No disponible</option>
            </select>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false)
                setSelectedItem(null)
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

