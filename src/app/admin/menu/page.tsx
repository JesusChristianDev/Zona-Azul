"use client"

import { useState, useEffect } from 'react'
import Modal from '../../../components/ui/Modal'
import { useMeals } from '../../../hooks/useApi'
import * as api from '../../../lib/api'

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
  useEffect(() => {
    if (meals && meals.length > 0) {
      setItems(meals.map(mealToMenuItem))
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

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-700 text-sm">
          {success}
        </div>
      )}

      <header className="rounded-2xl border border-primary/20 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">Gestión de la Carta</h2>
              <span className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
                📋 Compra Individual
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              <strong>Gestiona los platos de la carta (compra individual).</strong> Estos platos son diferentes a los del plan de suscripción. 
              Ajusta disponibilidad, precios y márgenes para mantener una carta nutritiva y rentable.
            </p>
            <div className="mt-3 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-lg">
              <p className="text-xs text-gray-700">
                <strong>Nota:</strong> Los planes de suscripción se gestionan en el área de Nutricionista → Planes.
              </p>
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition"
          >
            Agregar plato
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </header>

      {loading && (
        <div className="text-center py-8 text-gray-500">Cargando menú...</div>
      )}

      {apiError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          Error al cargar el menú: {apiError}
        </div>
      )}

      {!loading && !apiError && items.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay platos en el menú. Crea el primero haciendo clic en "Agregar plato".
        </div>
      )}

      {/* Búsqueda y filtros */}
      {!loading && !apiError && items.length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
          <div className="space-y-4">
            {/* Barra de búsqueda */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar por nombre, descripción, precio o calorías..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition placeholder-gray-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoría:</span>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="todas">Todas</option>
                  <option value="Desayuno">Desayuno</option>
                  <option value="Plato principal">Plato principal</option>
                  <option value="Cena">Cena</option>
                  <option value="Bebida funcional">Bebida funcional</option>
                  <option value="On the go">On the go</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Disponibilidad:</span>
                <select
                  value={filterAvailability}
                  onChange={(e) => setFilterAvailability(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="todas">Todas</option>
                  <option value="Disponible">Disponible</option>
                  <option value="No disponible">No disponible</option>
                </select>
              </div>
            </div>
            
            {/* Resultados */}
            {(searchTerm || filterCategory !== 'todas' || filterAvailability !== 'todas') && (
              <div className="text-xs text-gray-500">
                Mostrando {filteredItems.length} de {items.length} platos
              </div>
            )}
          </div>
        </section>
      )}

      {!loading && !apiError && filteredItems.length === 0 && items.length > 0 && (
        <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-200 p-6">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm font-medium text-gray-600 mb-1">No se encontraron platos</p>
          <p className="text-xs text-gray-500">Intenta ajustar los filtros o la búsqueda</p>
        </div>
      )}

      {!loading && !apiError && filteredItems.length > 0 && (
        <section className="grid gap-4 md:grid-cols-3">
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
        </section>
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
