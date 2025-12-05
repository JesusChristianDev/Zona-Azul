"use client"

import { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import SearchFilters from '@/components/ui/SearchFilters'
import ActionButton from '@/components/ui/ActionButton'
import ToastMessage from '@/components/ui/ToastMessage'
import LoadingState from '@/components/ui/LoadingState'
import EmptyState from '@/components/ui/EmptyState'
import ResponsiveGrid from '@/components/ui/ResponsiveGrid'
import * as api from '@/lib/api'

type MealType = 'lunch' | 'dinner'

interface IngredientOption {
  id: string
  nombre: string
  unidad_base: string
  calorias_por_unidad?: number | null
  proteinas_por_unidad?: number | null
  carbohidratos_por_unidad?: number | null
  grasas_por_unidad?: number | null
}

interface RecipeIngredientRow {
  ingrediente_id: string
  cantidad_base: string
  unidad: string
  porcentaje_merma: string
}

interface RecipeIngredientDisplay {
  id: string
  ingrediente_id: string
  ingrediente_nombre: string
  cantidad_base: number
  unidad: string
  porcentaje_merma?: number | null
}

interface LibraryRecipe {
  id: string
  nombre: string
  meal_type: MealType
  descripcion?: string | null
  calorias_totales?: number | null
  proteinas_totales?: number | null
  carbohidratos_totales?: number | null
  grasas_totales?: number | null
  porciones?: number | null
  tiempo_preparacion_min?: number | null
  ingredientes: RecipeIngredientDisplay[]
}

const mealTypeLabels: Record<MealType, string> = {
  lunch: 'Almuerzo',
  dinner: 'Cena',
}

const mealTypeFilterOptions: Array<{ value: 'all' | MealType; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'lunch', label: 'Almuerzo' },
  { value: 'dinner', label: 'Cena' },
]

const emptyIngredientRow: RecipeIngredientRow = {
  ingrediente_id: '',
  cantidad_base: '',
  unidad: '',
  porcentaje_merma: '',
}

const macroFields = [
  { field: 'calorias_totales', label: 'Calorías (kcal)', decimals: 0 },
  { field: 'proteinas_totales', label: 'Proteínas (g)', decimals: 2 },
  { field: 'carbohidratos_totales', label: 'Carbohidratos (g)', decimals: 2 },
  { field: 'grasas_totales', label: 'Grasas (g)', decimals: 2 },
] as const

function formatMacroValue(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return ''
  const rounded = Number(value.toFixed(decimals))
  return Number.isFinite(rounded) ? rounded.toString() : ''
}

function mapLibraryRecipe(apiRecipe: any): LibraryRecipe {
  const ingredientes = (apiRecipe.recetas_ingredientes || []).map((item: any) => ({
    id: item.id,
    ingrediente_id: item.ingrediente_id,
    ingrediente_nombre: item.ingredientes?.nombre || 'Ingrediente',
    cantidad_base: Number(item.cantidad_base ?? 0),
    unidad: item.unidad,
    porcentaje_merma: item.porcentaje_merma ?? null,
  }))

  return {
    id: apiRecipe.id,
    nombre: apiRecipe.nombre,
    meal_type: apiRecipe.meal_type,
    descripcion: apiRecipe.descripcion,
    calorias_totales: apiRecipe.calorias_totales,
    proteinas_totales: apiRecipe.proteinas_totales,
    carbohidratos_totales: apiRecipe.carbohidratos_totales,
    grasas_totales: apiRecipe.grasas_totales,
    porciones: apiRecipe.porciones,
    tiempo_preparacion_min: apiRecipe.tiempo_preparacion_min,
    ingredientes,
  }
}

export default function AdminComidasPlanesPage() {
  const [recipes, setRecipes] = useState<LibraryRecipe[]>([])
  const [filteredRecipes, setFilteredRecipes] = useState<LibraryRecipe[]>([])
  const [ingredientsCatalog, setIngredientsCatalog] = useState<IngredientOption[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [mealFilter, setMealFilter] = useState<'all' | MealType>('all')
  const [loadingRecipes, setLoadingRecipes] = useState(true)
  const [loadingIngredients, setLoadingIngredients] = useState(true)
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<LibraryRecipe | null>(null)
  const [recipeForm, setRecipeForm] = useState({
    nombre: '',
    meal_type: 'lunch' as MealType,
    descripcion: '',
    calorias_totales: '',
    proteinas_totales: '',
    carbohidratos_totales: '',
    grasas_totales: '',
    porciones: '1',
    tiempo_preparacion_min: '',
  })
  const [recipeIngredientsForm, setRecipeIngredientsForm] = useState<RecipeIngredientRow[]>([emptyIngredientRow])
  const [autoMacrosEnabled, setAutoMacrosEnabled] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadIngredients()
    loadRecipes()
  }, [])

  useEffect(() => {
    let filtered = [...recipes]
    if (mealFilter !== 'all') {
      filtered = filtered.filter((recipe) => recipe.meal_type === mealFilter)
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (recipe) =>
          recipe.nombre.toLowerCase().includes(term) ||
          (recipe.descripcion && recipe.descripcion.toLowerCase().includes(term))
      )
    }
    setFilteredRecipes(filtered)
  }, [recipes, mealFilter, searchTerm])

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
      setLoadingIngredients(true)
      const catalog = await api.getIngredientesCatalog()
      setIngredientsCatalog(
        catalog.map((item: any) => ({
          id: item.id,
          nombre: item.nombre,
          unidad_base: item.unidad_base,
          calorias_por_unidad: item.calorias_por_unidad,
          proteinas_por_unidad: item.proteinas_por_unidad,
          carbohidratos_por_unidad: item.carbohidratos_por_unidad,
          grasas_por_unidad: item.grasas_por_unidad,
        }))
      )
    } catch (err: any) {
      console.error('Error loading ingredientes:', err)
      showToast(err.message || 'No se pudieron cargar los ingredientes', true)
    } finally {
      setLoadingIngredients(false)
    }
  }

  const loadRecipes = async () => {
    try {
      setLoadingRecipes(true)
      const list = await api.getRecipeLibrary()
      setRecipes(list.map(mapLibraryRecipe))
    } catch (err: any) {
      console.error('Error loading recipe library:', err)
      showToast(err.message || 'No se pudieron cargar las recetas', true)
    } finally {
      setLoadingRecipes(false)
    }
  }

  const resetRecipeForm = () => {
    setSelectedRecipe(null)
    setRecipeForm({
      nombre: '',
      meal_type: 'lunch',
      descripcion: '',
      calorias_totales: '',
      proteinas_totales: '',
      carbohidratos_totales: '',
      grasas_totales: '',
      porciones: '1',
      tiempo_preparacion_min: '',
    })
    setRecipeIngredientsForm([emptyIngredientRow])
    setAutoMacrosEnabled(true)
  }

  const handleOpenCreateModal = () => {
    resetRecipeForm()
    setIsRecipeModalOpen(true)
  }

  const handleEditRecipe = (recipe: LibraryRecipe) => {
    setSelectedRecipe(recipe)
    setRecipeForm({
      nombre: recipe.nombre,
      meal_type: recipe.meal_type,
      descripcion: recipe.descripcion || '',
      calorias_totales: recipe.calorias_totales?.toString() || '',
      proteinas_totales: recipe.proteinas_totales?.toString() || '',
      carbohidratos_totales: recipe.carbohidratos_totales?.toString() || '',
      grasas_totales: recipe.grasas_totales?.toString() || '',
      porciones: recipe.porciones?.toString() || '1',
      tiempo_preparacion_min: recipe.tiempo_preparacion_min?.toString() || '',
    })
    setRecipeIngredientsForm(
      recipe.ingredientes.length
        ? recipe.ingredientes.map((item) => ({
            ingrediente_id: item.ingrediente_id,
            cantidad_base: item.cantidad_base.toString(),
            unidad: item.unidad,
            porcentaje_merma: item.porcentaje_merma?.toString() || '',
          }))
        : [emptyIngredientRow]
    )
    setAutoMacrosEnabled(true)
    setIsRecipeModalOpen(true)
  }

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!confirm('¿Eliminar esta receta de la biblioteca?')) return
    try {
      await api.deleteLibraryRecipe(recipeId)
      showToast('Receta eliminada')
      await loadRecipes()
    } catch (err: any) {
      console.error('Error deleting recipe:', err)
      showToast(err.message || 'Error al eliminar la receta', true)
    }
  }

  const handleIngredientChange = (index: number, field: keyof RecipeIngredientRow, value: string) => {
    setRecipeIngredientsForm((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      if (field === 'ingrediente_id') {
        const catalogItem = ingredientsCatalog.find((item) => item.id === value)
        if (catalogItem) {
          next[index].unidad = catalogItem.unidad_base
        }
      }
      return next
    })
  }

  const handleAddIngredientRow = () => {
    setRecipeIngredientsForm((prev) => [...prev, emptyIngredientRow])
  }

  const handleRemoveIngredientRow = (index: number) => {
    setRecipeIngredientsForm((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const buildIngredientesPayload = () => {
    const rows = recipeIngredientsForm
      .map((row) => ({
        ingrediente_id: row.ingrediente_id,
        cantidad_base: Number(row.cantidad_base),
        unidad: row.unidad || ingredientsCatalog.find((opt) => opt.id === row.ingrediente_id)?.unidad_base || '',
        porcentaje_merma: row.porcentaje_merma ? Number(row.porcentaje_merma) : undefined,
      }))
      .filter((row) => row.ingrediente_id && row.cantidad_base > 0 && row.unidad)

    return rows
  }

  const recalculateMacrosFromIngredients = () => {
    let calorias = 0
    let proteinas = 0
    let carbohidratos = 0
    let grasas = 0

    recipeIngredientsForm.forEach((row) => {
      const catalogItem = ingredientsCatalog.find((item) => item.id === row.ingrediente_id)
      if (!catalogItem) return
      const cantidad = Number(row.cantidad_base)
      if (!cantidad || Number.isNaN(cantidad)) return

      calorias += (catalogItem.calorias_por_unidad ?? 0) * cantidad
      proteinas += (catalogItem.proteinas_por_unidad ?? 0) * cantidad
      carbohidratos += (catalogItem.carbohidratos_por_unidad ?? 0) * cantidad
      grasas += (catalogItem.grasas_por_unidad ?? 0) * cantidad
    })

    const nextValues = {
      calorias_totales: calorias > 0 ? Math.round(calorias).toString() : '',
      proteinas_totales: proteinas > 0 ? formatMacroValue(proteinas) : '',
      carbohidratos_totales: carbohidratos > 0 ? formatMacroValue(carbohidratos) : '',
      grasas_totales: grasas > 0 ? formatMacroValue(grasas) : '',
    }

    setRecipeForm((prev) => {
      if (
        prev.calorias_totales === nextValues.calorias_totales &&
        prev.proteinas_totales === nextValues.proteinas_totales &&
        prev.carbohidratos_totales === nextValues.carbohidratos_totales &&
        prev.grasas_totales === nextValues.grasas_totales
      ) {
        return prev
      }
      return { ...prev, ...nextValues }
    })
  }

  useEffect(() => {
    if (!autoMacrosEnabled || !ingredientsCatalog.length) return
    recalculateMacrosFromIngredients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeIngredientsForm, ingredientsCatalog, autoMacrosEnabled])

  const handleSubmitRecipe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!recipeForm.nombre.trim()) {
      showToast('La receta necesita un nombre', true)
      return
    }

    const ingredientesPayload = buildIngredientesPayload()
    if (!ingredientesPayload.length) {
      showToast('Agrega al menos un ingrediente con cantidad y unidad', true)
      return
    }

    const payload = {
      nombre: recipeForm.nombre.trim(),
      meal_type: recipeForm.meal_type,
      descripcion: recipeForm.descripcion.trim() || null,
      calorias_totales: recipeForm.calorias_totales ? Number(recipeForm.calorias_totales) : null,
      proteinas_totales: recipeForm.proteinas_totales ? Number(recipeForm.proteinas_totales) : null,
      carbohidratos_totales: recipeForm.carbohidratos_totales ? Number(recipeForm.carbohidratos_totales) : null,
      grasas_totales: recipeForm.grasas_totales ? Number(recipeForm.grasas_totales) : null,
      porciones: recipeForm.porciones ? Number(recipeForm.porciones) : 1,
      tiempo_preparacion_min: recipeForm.tiempo_preparacion_min ? Number(recipeForm.tiempo_preparacion_min) : null,
      ingredientes: ingredientesPayload,
    }

    try {
      if (selectedRecipe) {
        await api.updateLibraryRecipe(selectedRecipe.id, payload)
        showToast('Receta actualizada')
      } else {
        await api.createLibraryRecipe(payload)
        showToast('Receta creada')
      }
      setIsRecipeModalOpen(false)
      resetRecipeForm()
      await loadRecipes()
    } catch (err: any) {
      console.error('Error saving recipe:', err)
      showToast(err.message || 'Error al guardar la receta', true)
    }
  }

  const recipesResultsCount = useMemo(() => {
    if (mealFilter !== 'all' || searchTerm) {
      return { showing: filteredRecipes.length, total: recipes.length }
    }
    return undefined
  }, [filteredRecipes.length, recipes.length, mealFilter, searchTerm])

  const plusIcon = (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
        clipRule="evenodd"
      />
    </svg>
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Biblioteca de comidas base"
        description="Centraliza las recetas reutilizables para que el equipo de nutrición las asigne a los planes base."
        action={
          <ActionButton onClick={handleOpenCreateModal} icon={plusIcon}>
            Nueva comida base
          </ActionButton>
        }
      />

      {error && <ToastMessage type="error" message={error} onClose={() => setError(null)} />}
      {success && <ToastMessage type="success" message={success} onClose={() => setSuccess(null)} />}

      <SearchFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por nombre o descripción..."
        filters={
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de comida</label>
            <select
              value={mealFilter}
              onChange={(e) => setMealFilter(e.target.value as 'all' | MealType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              {mealTypeFilterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        }
        resultsCount={recipesResultsCount}
      />

      {loadingRecipes ? (
        <LoadingState message="Cargando biblioteca de comidas..." />
      ) : filteredRecipes.length === 0 ? (
        <EmptyState
          title="Todavía no hay recetas"
          message="Crea la primera comida base para que los planes puedan reutilizarla."
          action={
            <ActionButton onClick={handleOpenCreateModal} icon={plusIcon}>
              Crear comida base
            </ActionButton>
          }
        />
      ) : (
        <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }} gap="md">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{recipe.nombre}</h3>
                  <p className="text-sm text-gray-500">{mealTypeLabels[recipe.meal_type]}</p>
                </div>
                <div className="text-right text-sm text-gray-500 space-y-0.5">
                  {recipe.calorias_totales != null && <p>🔥 {recipe.calorias_totales} kcal</p>}
                  {recipe.proteinas_totales != null && <p>💪 {recipe.proteinas_totales} g P</p>}
                </div>
              </div>
              {recipe.descripcion && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{recipe.descripcion}</p>
              )}
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-900">Ingredientes</p>
                <ul className="mt-1 text-sm text-gray-600 space-y-1">
                  {recipe.ingredientes.slice(0, 4).map((ingredient) => (
                    <li key={ingredient.id}>
                      {ingredient.ingrediente_nombre}: {ingredient.cantidad_base} {ingredient.unidad}
                      {ingredient.porcentaje_merma ? ` (merma ${ingredient.porcentaje_merma}%)` : ''}
                    </li>
                  ))}
                  {recipe.ingredientes.length === 0 && <li className="text-gray-400">Aún sin ingredientes</li>}
                  {recipe.ingredientes.length > 4 && (
                    <li className="text-gray-400">+ {recipe.ingredientes.length - 4} ingredientes</li>
                  )}
                </ul>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <ActionButton
                  onClick={() => handleEditRecipe(recipe)}
                  variant="muted"
                  size="sm"
                  fullWidth
                >
                  Editar
                </ActionButton>
                <ActionButton
                  onClick={() => handleDeleteRecipe(recipe.id)}
                  variant="soft-danger"
                  size="sm"
                  fullWidth
                >
                  Eliminar
                </ActionButton>
              </div>
            </div>
          ))}
        </ResponsiveGrid>
      )}

      <Modal
        isOpen={isRecipeModalOpen}
        onClose={() => {
          setIsRecipeModalOpen(false)
          resetRecipeForm()
        }}
        title={selectedRecipe ? 'Editar comida base' : 'Nueva comida base'}
        size="lg"
      >
        {loadingIngredients ? (
          <LoadingState message="Cargando ingredientes..." />
        ) : (
          <form onSubmit={handleSubmitRecipe} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Nombre</label>
                <input
                  type="text"
                  value={recipeForm.nombre}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo</label>
                <select
                  value={recipeForm.meal_type}
                  onChange={(e) =>
                    setRecipeForm((prev) => ({ ...prev, meal_type: e.target.value as MealType }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="lunch">Almuerzo</option>
                  <option value="dinner">Cena</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Porciones</label>
                <input
                  type="number"
                  min={1}
                  value={recipeForm.porciones}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, porciones: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Tiempo preparación (min)</label>
                <input
                  type="number"
                  min={0}
                  value={recipeForm.tiempo_preparacion_min}
                  onChange={(e) =>
                    setRecipeForm((prev) => ({ ...prev, tiempo_preparacion_min: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Descripción</label>
              <textarea
                rows={3}
                value={recipeForm.descripcion}
                onChange={(e) => setRecipeForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Notas adicionales o instrucciones para cocina"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-900">Macros calculadas</p>
                <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                  <span>Auto</span>
                  <input
                    type="checkbox"
                    checked={autoMacrosEnabled}
                    onChange={(e) => {
                      setAutoMacrosEnabled(e.target.checked)
                      if (e.target.checked) {
                        recalculateMacrosFromIngredients()
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500">
                Cuando está activo, las calorías y macros se recalculan automáticamente según los ingredientes y sus
                cantidades. Desactívalo si necesitas ajustar manualmente.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {macroFields.map(({ field, label, decimals }) => (
                  <div key={field}>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
                    <input
                      type="number"
                      min={0}
                      step={decimals === 0 ? 1 : 0.01}
                      value={(recipeForm as any)[field]}
                      onChange={(e) =>
                        setRecipeForm((prev) => ({
                          ...prev,
                          [field]: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      disabled={autoMacrosEnabled}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Ingredientes</p>
                  <p className="text-xs text-gray-500">Define cantidades base para la receta.</p>
                </div>
                 <ActionButton
                   type="button"
                   onClick={handleAddIngredientRow}
                   variant="muted-outline"
                   size="sm"
                 >
                   <span className="text-base leading-none">+</span>
                   Agregar ingrediente
                 </ActionButton>
              </div>

              {recipeIngredientsForm.map((row, index) => {
                const catalogItem = ingredientsCatalog.find((item) => item.id === row.ingrediente_id)
                return (
                  <div
                    key={`${row.ingrediente_id || 'nuevo'}-${index}`}
                    className="grid grid-cols-1 md:grid-cols-6 gap-3 border border-gray-200 rounded-lg p-3"
                  >
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Ingrediente</label>
                      <select
                        value={row.ingrediente_id}
                        onChange={(e) => handleIngredientChange(index, 'ingrediente_id', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="">Selecciona ingrediente</option>
                        {ingredientsCatalog.map((ingredient) => (
                          <option key={ingredient.id} value={ingredient.id}>
                            {ingredient.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Cantidad base</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.cantidad_base}
                        onChange={(e) => handleIngredientChange(index, 'cantidad_base', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Unidad</label>
                      <input
                        type="text"
                        value={row.unidad || catalogItem?.unidad_base || ''}
                        placeholder={catalogItem?.unidad_base || 'Unidad'}
                        onChange={(e) => handleIngredientChange(index, 'unidad', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">% merma</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        value={row.porcentaje_merma}
                        onChange={(e) => handleIngredientChange(index, 'porcentaje_merma', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-end">
                      <ActionButton
                        type="button"
                        onClick={() => handleRemoveIngredientRow(index)}
                        variant="soft-danger"
                        size="sm"
                        className="w-full md:w-auto"
                        disabled={recipeIngredientsForm.length === 1}
                      >
                        Eliminar
                      </ActionButton>
                    </div>
                  </div>
                )
              })}
            </div>

             <div className="flex gap-3 pt-4">
               <ActionButton
                 type="button"
                 onClick={() => {
                   setIsRecipeModalOpen(false)
                   resetRecipeForm()
                 }}
                 variant="muted-outline"
                 fullWidth
               >
                 Cancelar
               </ActionButton>
               <ActionButton
                 type="submit"
                 fullWidth
               >
                 {selectedRecipe ? 'Actualizar receta' : 'Guardar receta'}
               </ActionButton>
             </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

