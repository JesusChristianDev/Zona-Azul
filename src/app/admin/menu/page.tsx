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

interface MenuItem {
  id: string
  name: string
  category: string
  price: number
  availability: string
  calories: number
  description?: string
}

// Mapear tipo de meal a categoría para mostrar
const typeToCategory: Record<string, string> = {
  breakfast: 'Desayuno',
  lunch: 'Plato principal',
  dinner: 'Cena',
  snack: 'Bebida funcional',
}

// Mapear meal de API a MenuItem para mostrar
function mealToMenuItem(meal: any): MenuItem {
  return {
    id: meal.id,
    name: meal.name,
    category: typeToCategory[meal.type] || meal.type,
    price: meal.price || 0,
    availability: meal.available ? 'Disponible' : 'Agendar reposición',
    calories: meal.calories,
    description: meal.description || '',
  }
}

export default function AdminMenuPage() {
  const { meals, loading, error: apiError, refetch } = useMeals()
  const [items, setItems] = useState<MenuItem[]>([])
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('todas')
  const [filterAvailability, setFilterAvailability] = useState<string>('todas')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    category: 'Plato principal',
    price: 0,
    availability: 'Disponible',
    calories: 0,
    description: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Convertir meals a items cuando se cargan o cambian
  // IMPORTANTE: Esta página solo muestra comidas del menú del local (is_menu_item=true)
  useEffect(() => {
    if (meals && meals.length > 0) {
      // Filtrar solo comidas del menú del local
      const menuMeals = meals.filter((meal: any) => meal.is_menu_item === true)
      setItems(menuMeals.map(mealToMenuItem))
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
      filtered = filtered.filter(item => item.availability === filterAvailability)
    }

    // Buscar por nombre, descripción o precio
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(term) ||
        (item.description && item.description.toLowerCase().includes(term)) ||
        item.price.toString().includes(term) ||
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
      price: 0,
      availability: 'Disponible',
      calories: 0,
      description: '',
    })
    setError(null)
    setIsCreateModalOpen(true)
  }

  const handleEdit = (item: MenuItem) => {
    setSelectedItem(item)
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price,
      availability: item.availability,
      calories: item.calories,
      description: item.description || '',
    })
    setError(null)
    setIsEditModalOpen(true)
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('¿Estás seguro de eliminar este plato del menú?')) {
      return
    }

    try {
      await api.deleteMeal(itemId)
      await refetch() // Recargar datos
      showToast('Plato eliminado correctamente')
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar el plato', true)
    }
  }

  const handleToggleAvailability = async (itemId: string) => {
    try {
      const currentMeal = meals.find((m) => m.id === itemId)
      if (!currentMeal) return

      await api.updateMeal(itemId, {
        available: !currentMeal.available,
      })
      await refetch() // Recargar datos
      showToast('Disponibilidad actualizada')
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar disponibilidad', true)
    }
  }

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name || formData.price <= 0 || formData.calories <= 0) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    try {
      // Mapear categoría a tipo de meal
      const categoryToType: Record<string, string> = {
        'Desayuno': 'breakfast',
        'Plato principal': 'lunch',
        'Cena': 'dinner',
        'Bebida funcional': 'snack',
        'On the go': 'snack',
      }

      const mealData = {
        name: formData.name,
        description: formData.description || null,
        type: categoryToType[formData.category] || 'lunch',
        calories: formData.calories,
        price: formData.price,
        available: formData.availability === 'Disponible',
        is_menu_item: true, // Esta página es para gestionar el menú del local, todas las comidas son del menú
      }

      await api.createMeal(mealData)
      await refetch() // Recargar datos
      setIsCreateModalOpen(false)
      showToast('Plato creado correctamente')
    } catch (err: any) {
      setError(err.message || 'Error al crear el plato')
      showToast(err.message || 'Error al crear el plato', true)
    }
  }

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedItem) return

    if (!formData.name || formData.price <= 0 || formData.calories <= 0) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    try {
      const categoryToType: Record<string, string> = {
        'Desayuno': 'breakfast',
        'Plato principal': 'lunch',
        'Cena': 'dinner',
        'Bebida funcional': 'snack',
        'On the go': 'snack',
      }

      const mealData = {
        name: formData.name,
        description: formData.description || null,
        type: categoryToType[formData.category] || 'lunch',
        calories: formData.calories,
        price: formData.price,
        available: formData.availability === 'Disponible',
        is_menu_item: true, // Esta página es para gestionar el menú del local, todas las comidas son del menú
      }

      await api.updateMeal(selectedItem.id, mealData)
      await refetch() // Recargar datos
      setIsEditModalOpen(false)
      setSelectedItem(null)
      showToast('Plato actualizado correctamente')
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el plato')
      showToast(err.message || 'Error al actualizar el plato', true)
    }
  }

  const plusIcon = (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
        clipRule="evenodd"
      />
    </svg>
  )

  const categories = ['todas', 'Desayuno', 'Plato principal', 'Cena', 'Bebida funcional', 'On the go']
  const availabilityOptions = ['todas', 'Disponible', 'No disponible']

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
      <div className="space-y-4">
        <PageHeader
          title="Gestión de la Carta"
          description="Gestiona los platos de la carta (compra individual). Estos platos son diferentes a los del plan de suscripción. Ajusta disponibilidad, precios y márgenes para mantener una carta nutritiva y rentable."
          badge="📋 Compra Individual"
          action={
            <ActionButton onClick={handleCreate} icon={plusIcon}>
              Agregar plato
            </ActionButton>
          }
        />
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-lg">
          <p className="text-xs text-gray-700">
            <strong>Nota:</strong> Los planes de suscripción se gestionan en el área de Nutricionista → Planes.
          </p>
        </div>
      </div>

      {/* Estados de carga y error */}
      {loading && <LoadingState message="Cargando menú..." />}
      
      {apiError && (
        <ToastMessage
          message={`Error al cargar el menú: ${apiError}`}
          type="error"
        />
      )}

      {/* Búsqueda y filtros */}
      {!loading && !apiError && items.length > 0 && (
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por nombre, descripción, precio o calorías..."
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
      )}

      {/* Estado vacío */}
      {!loading && !apiError && items.length === 0 && (
        <EmptyState
          title="No hay platos en el menú"
          message="Crea el primero haciendo clic en 'Agregar plato'."
          action={
            <ActionButton onClick={handleCreate} icon={plusIcon}>
              Agregar Primer Plato
            </ActionButton>
          }
        />
      )}

      {/* Sin resultados con filtros */}
      {!loading && !apiError && filteredItems.length === 0 && items.length > 0 && (
        <EmptyState
          title="No se encontraron platos"
          message="Intenta ajustar los filtros o la búsqueda."
        />
      )}

      {/* Lista de platos */}
      {!loading && !apiError && filteredItems.length > 0 && (
        <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }} gap="md">
          {filteredItems.map((item) => (
          <article key={item.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                <p className="text-xs uppercase tracking-wide text-gray-400">{item.category}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  item.availability === 'Disponible'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-highlight/10 text-highlight'
                }`}
              >
                {item.availability}
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              {item.calories} kcal · Precio actual{' '}
              <span className="font-semibold text-primary">€{item.price.toFixed(2)}</span>
            </p>
            {item.description && <p className="mt-2 text-xs text-gray-500">{item.description}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => handleEdit(item)}
                className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition"
              >
                Editar
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.414 2.586a2 2 0 010 2.828l-1.793 1.793-2.828-2.828 1.793-1.793a2 2 0 012.828 0zM2 13.586l10-10 2.828 2.828-10 10H2v-2.828z" />
                </svg>
              </button>
              <button
                onClick={() => handleToggleAvailability(item.id)}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary transition"
              >
                {item.availability === 'Disponible' ? 'Marcar no disponible' : 'Marcar disponible'}
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-highlight hover:text-highlight transition"
              >
                Eliminar
              </button>
            </div>
          </article>
          ))}
        </ResponsiveGrid>
      )}

      {/* Modal Crear Plato */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Agregar plato">
        <form onSubmit={handleSubmitCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del plato</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ej: Bowl Vitalidad"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Plato principal">Plato principal</option>
              <option value="Bebida funcional">Bebida funcional</option>
              <option value="On the go">On the go</option>
              <option value="Snack">Snack</option>
              <option value="Postre">Postre</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Precio (€)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                required
                value={formData.price || ''}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Calorías</label>
              <input
                type="number"
                min="0"
                required
                value={formData.calories || ''}
                onChange={(e) => setFormData({ ...formData, calories: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Disponibilidad</label>
            <select
              value={formData.availability}
              onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Disponible">Disponible</option>
              <option value="Agendar reposición">Agendar reposición</option>
              <option value="Agotado">Agotado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descripción (opcional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Descripción del plato..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Crear plato
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Plato */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar plato">
        <form onSubmit={handleSubmitEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del plato</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Plato principal">Plato principal</option>
              <option value="Bebida funcional">Bebida funcional</option>
              <option value="On the go">On the go</option>
              <option value="Snack">Snack</option>
              <option value="Postre">Postre</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Precio (€)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                required
                value={formData.price || ''}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Calorías</label>
              <input
                type="number"
                min="0"
                required
                value={formData.calories || ''}
                onChange={(e) => setFormData({ ...formData, calories: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Disponibilidad</label>
            <select
              value={formData.availability}
              onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Disponible">Disponible</option>
              <option value="Agendar reposición">Agendar reposición</option>
              <option value="Agotado">Agotado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descripción (opcional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
