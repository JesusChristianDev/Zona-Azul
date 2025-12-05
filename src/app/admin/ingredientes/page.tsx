"use client"

import { useEffect, useMemo, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import SearchFilters from '@/components/ui/SearchFilters'
import ActionButton from '@/components/ui/ActionButton'
import ToastMessage from '@/components/ui/ToastMessage'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import LoadingState from '@/components/ui/LoadingState'
import * as api from '@/lib/api'

interface Ingrediente {
  id: string
  nombre: string
  unidad_base: string
  calorias_por_unidad?: number | null
  proteinas_por_unidad?: number | null
  carbohidratos_por_unidad?: number | null
  grasas_por_unidad?: number | null
  stock_minimo?: number | null
}

const initialForm = {
  id: '',
  nombre: '',
  unidad_base: '',
  calorias_por_unidad: '',
  proteinas_por_unidad: '',
  carbohidratos_por_unidad: '',
  grasas_por_unidad: '',
  stock_minimo: '',
}

export default function AdminIngredientesPage() {
  const [ingredients, setIngredients] = useState<Ingrediente[]>([])
  const [filteredIngredients, setFilteredIngredients] = useState<Ingrediente[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Ingrediente | null>(null)

  const showToast = (message: string, isError = false) => {
    if (isError) {
      setError(message)
      setTimeout(() => setError(null), 5000)
    } else {
      setSuccess(message)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const loadIngredients = async () => {
    try {
      setLoading(true)
      const list = await api.getIngredientesCatalog()
      setIngredients(list)
    } catch (err: any) {
      console.error('Error loading ingredients:', err)
      showToast(err?.message || 'No se pudieron cargar los ingredientes', true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIngredients()
  }, [])

  useEffect(() => {
    if (!searchTerm) {
      setFilteredIngredients(ingredients)
      return
    }
    const term = searchTerm.toLowerCase()
    setFilteredIngredients(
      ingredients.filter(
        (item) =>
          item.nombre.toLowerCase().includes(term) ||
          item.unidad_base.toLowerCase().includes(term)
      )
    )
  }, [ingredients, searchTerm])

  const resultsCount = useMemo(() => {
    if (searchTerm) {
      return { showing: filteredIngredients.length, total: ingredients.length }
    }
    return undefined
  }, [filteredIngredients.length, ingredients.length, searchTerm])

  const handleOpenModal = () => {
    setSelected(null)
    setForm(initialForm)
    setIsModalOpen(true)
  }

  const handleEdit = (ingredient: Ingrediente) => {
    setSelected(ingredient)
    setForm({
      id: ingredient.id,
      nombre: ingredient.nombre,
      unidad_base: ingredient.unidad_base,
      calorias_por_unidad: ingredient.calorias_por_unidad?.toString() || '',
      proteinas_por_unidad: ingredient.proteinas_por_unidad?.toString() || '',
      carbohidratos_por_unidad: ingredient.carbohidratos_por_unidad?.toString() || '',
      grasas_por_unidad: ingredient.grasas_por_unidad?.toString() || '',
      stock_minimo: ingredient.stock_minimo?.toString() || '',
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (ingredient: Ingrediente) => {
    if (!confirm(`¿Eliminar el ingrediente "${ingredient.nombre}"?`)) return
    try {
      await api.deleteIngrediente(ingredient.id)
      showToast('Ingrediente eliminado')
      await loadIngredients()
    } catch (err: any) {
      console.error('Error deleting ingredient:', err)
      showToast(err?.message || 'No se pudo eliminar el ingrediente', true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim() || !form.unidad_base.trim()) {
      showToast('Nombre y unidad base son obligatorios', true)
      return
    }
    const payload = {
      id: selected?.id || undefined,
      nombre: form.nombre.trim(),
      unidad_base: form.unidad_base.trim(),
      calorias_por_unidad: form.calorias_por_unidad ? Number(form.calorias_por_unidad) : null,
      proteinas_por_unidad: form.proteinas_por_unidad ? Number(form.proteinas_por_unidad) : null,
      carbohidratos_por_unidad: form.carbohidratos_por_unidad ? Number(form.carbohidratos_por_unidad) : null,
      grasas_por_unidad: form.grasas_por_unidad ? Number(form.grasas_por_unidad) : null,
      stock_minimo: form.stock_minimo ? Number(form.stock_minimo) : null,
    }

    try {
      setSaving(true)
      await api.saveIngrediente(payload)
      showToast(selected ? 'Ingrediente actualizado' : 'Ingrediente creado')
      setIsModalOpen(false)
      setSelected(null)
      setForm(initialForm)
      await loadIngredients()
    } catch (err: any) {
      console.error('Error saving ingredient:', err)
      showToast(err?.message || 'No se pudo guardar el ingrediente', true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Ingredientes base"
        description="Gestiona el catálogo de ingredientes que se usan en los planes y en el stock."
        action={
          <ActionButton onClick={handleOpenModal}>
            Nuevo ingrediente
          </ActionButton>
        }
      />

      {error && <ToastMessage type="error" message={error} onClose={() => setError(null)} />}
      {success && <ToastMessage type="success" message={success} onClose={() => setSuccess(null)} />}

      <SearchFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por nombre o unidad..."
        resultsCount={resultsCount}
      />

      {loading ? (
        <LoadingState message="Cargando ingredientes..." />
      ) : ingredients.length === 0 ? (
        <EmptyState
          title="No hay ingredientes registrados"
          message="Agrega el primer ingrediente para empezar a construir recetas y controlar el stock."
          action={
            <ActionButton onClick={handleOpenModal}>
              Crear ingrediente
            </ActionButton>
          }
        />
      ) : filteredIngredients.length === 0 ? (
        <EmptyState title="Sin coincidencias" message="Prueba con otro término o limpia la búsqueda." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Ingrediente</th>
                <th className="px-4 py-3">Unidad base</th>
                <th className="px-4 py-3">Calorías</th>
                <th className="px-4 py-3">Proteínas</th>
                <th className="px-4 py-3">Carbohidratos</th>
                <th className="px-4 py-3">Grasas</th>
                <th className="px-4 py-3">Stock mínimo</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredIngredients.map((ingredient) => (
                <tr key={ingredient.id} className="hover:bg-gray-50/60 transition">
                  <td className="px-4 py-3 font-medium text-gray-900">{ingredient.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{ingredient.unidad_base}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {ingredient.calorias_por_unidad != null ? `${ingredient.calorias_por_unidad}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {ingredient.proteinas_por_unidad != null ? `${ingredient.proteinas_por_unidad} g` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {ingredient.carbohidratos_por_unidad != null ? `${ingredient.carbohidratos_por_unidad} g` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {ingredient.grasas_por_unidad != null ? `${ingredient.grasas_por_unidad} g` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {ingredient.stock_minimo != null ? `${ingredient.stock_minimo} ${ingredient.unidad_base}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <ActionButton size="sm" variant="muted" onClick={() => handleEdit(ingredient)}>
                        Editar
                      </ActionButton>
                      <ActionButton
                        size="sm"
                        variant="soft-danger"
                        onClick={() => handleDelete(ingredient)}
                      >
                        Eliminar
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelected(null)
          setForm(initialForm)
        }}
        title={selected ? 'Editar ingrediente' : 'Nuevo ingrediente'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Nombre</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Unidad base</label>
              <input
                type="text"
                value={form.unidad_base}
                onChange={(e) => setForm((prev) => ({ ...prev, unidad_base: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Ej: g, ml, unidad..."
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { field: 'calorias_por_unidad', label: 'Calorías' },
              { field: 'proteinas_por_unidad', label: 'Proteínas (g)' },
              { field: 'carbohidratos_por_unidad', label: 'Carbohidratos (g)' },
              { field: 'grasas_por_unidad', label: 'Grasas (g)' },
            ].map(({ field, label }) => (
              <div key={field}>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={(form as any)[field]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Stock mínimo recomendado</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={form.stock_minimo}
              onChange={(e) => setForm((prev) => ({ ...prev, stock_minimo: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder={`Ej: 500 (${form.unidad_base || 'unidad'})`}
            />
            <p className="text-xs text-gray-500 mt-1">
              Esta cantidad se utilizará más adelante para generar alertas de stock.
            </p>
          </div>

          <div className="flex gap-3 pt-3">
            <ActionButton
              type="button"
              variant="muted-outline"
              fullWidth
              onClick={() => {
                setIsModalOpen(false)
                setSelected(null)
                setForm(initialForm)
              }}
            >
              Cancelar
            </ActionButton>
            <ActionButton type="submit" variant="primary" fullWidth disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar ingrediente'}
            </ActionButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}





