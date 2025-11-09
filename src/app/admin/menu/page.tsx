"use client"

import { useState, useEffect } from 'react'
import Modal from '../../../components/ui/Modal'

interface MenuItem {
  id: string
  name: string
  category: string
  price: number
  availability: string
  calories: number
  description?: string
}

const initialItems: MenuItem[] = [
  {
    id: 'item-1',
    name: 'Bowl Vitalidad',
    category: 'Plato principal',
    price: 11.9,
    availability: 'Disponible',
    calories: 620,
    description: 'Base de quinoa, garbanzos especiados, aguacate y salsa tahini.',
  },
  {
    id: 'item-2',
    name: 'Smoothie Azul',
    category: 'Bebida funcional',
    price: 4.5,
    availability: 'Disponible',
    calories: 180,
    description: 'Blueberries, plátano, leche de almendra y espirulina.',
  },
  {
    id: 'item-3',
    name: 'Wrap Proteico',
    category: 'On the go',
    price: 9.2,
    availability: 'Agendar reposición',
    calories: 540,
    description: 'Tortilla integral con falafel, hummus y vegetales frescos.',
  },
]

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([])
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

  useEffect(() => {
    const stored = localStorage.getItem('zona_azul_menu')
    if (stored) {
      setItems(JSON.parse(stored))
    } else {
      setItems(initialItems)
      localStorage.setItem('zona_azul_menu', JSON.stringify(initialItems))
    }
  }, [])

  const showToast = (message: string, isError = false) => {
    if (isError) {
      setError(message)
      setTimeout(() => setError(null), 5000)
    } else {
      setSuccess(message)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  // Notificar a otras pestañas/componentes que el menú fue actualizado
  const notifyMenuUpdate = () => {
    window.dispatchEvent(new Event('zona_azul_menu_updated'))
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

  const handleDelete = (itemId: string) => {
    if (confirm('¿Estás seguro de eliminar este plato del menú?')) {
      const updated = items.filter((i) => i.id !== itemId)
      setItems(updated)
      localStorage.setItem('zona_azul_menu', JSON.stringify(updated))
      notifyMenuUpdate()
      showToast('Plato eliminado correctamente')
    }
  }

  const handleToggleAvailability = (itemId: string) => {
    const updated = items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            availability: item.availability === 'Disponible' ? 'Agendar reposición' : 'Disponible',
          }
        : item
    )
    setItems(updated)
    localStorage.setItem('zona_azul_menu', JSON.stringify(updated))
    notifyMenuUpdate()
    showToast('Disponibilidad actualizada')
  }

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name || formData.price <= 0 || formData.calories <= 0) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    const newItem: MenuItem = {
      id: `item-${Date.now()}`,
      name: formData.name,
      category: formData.category,
      price: formData.price,
      availability: formData.availability,
      calories: formData.calories,
      description: formData.description,
    }

    const updated = [...items, newItem]
    setItems(updated)
    localStorage.setItem('zona_azul_menu', JSON.stringify(updated))
    notifyMenuUpdate()
    setIsCreateModalOpen(false)
    showToast('Plato creado correctamente')
  }

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedItem) return

    if (!formData.name || formData.price <= 0 || formData.calories <= 0) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    const updated = items.map((item) =>
      item.id === selectedItem.id
        ? {
            ...item,
            name: formData.name,
            category: formData.category,
            price: formData.price,
            availability: formData.availability,
            calories: formData.calories,
            description: formData.description,
          }
        : item
    )

    setItems(updated)
    localStorage.setItem('zona_azul_menu', JSON.stringify(updated))
    notifyMenuUpdate()
    setIsEditModalOpen(false)
    setSelectedItem(null)
    showToast('Plato actualizado correctamente')
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

      <section className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
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
