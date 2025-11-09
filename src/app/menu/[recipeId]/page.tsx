"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface MenuItem {
  id: string
  name: string
  category: string
  price: number
  availability: string
  calories: number
  description?: string
}

interface Recipe {
  id: string
  name: string
  description: string
  calories: number
  protein: number
  carbs: number
  fats: number
  price: number
  photo_url: string
}

// Función para convertir MenuItem a Recipe (igual que en RestaurantMenuGrid)
function menuItemToRecipe(item: MenuItem): Recipe {
  const protein = Math.round((item.calories * 0.3) / 4)
  const carbs = Math.round((item.calories * 0.4) / 4)
  const fats = Math.round((item.calories * 0.3) / 9)

  const getPhotoUrl = (category: string) => {
    if (category.toLowerCase().includes('bebida') || category.toLowerCase().includes('smoothie')) {
      return '/images/salad.svg'
    }
    return '/images/bowl.svg'
  }

  return {
    id: item.id,
    name: item.name,
    description: item.description || `Delicioso ${item.name.toLowerCase()} de nuestra carta.`,
    calories: item.calories,
    protein,
    carbs,
    fats,
    price: item.price,
    photo_url: getPhotoUrl(item.category),
  }
}

export default function RecipeDetail() {
  const params = useParams()
  const recipeId = params?.recipeId as string
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadRecipe = () => {
      try {
        const stored = localStorage.getItem('zona_azul_menu')
        if (stored) {
          const menuItems: MenuItem[] = JSON.parse(stored)
          const menuItem = menuItems.find((item) => item.id === recipeId)
          if (menuItem) {
            setRecipe(menuItemToRecipe(menuItem))
            setLoading(false)
            return
          }
        }

        // Si no se encuentra, usar datos por defecto
        const defaultItems: MenuItem[] = [
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
            availability: 'Disponible',
            calories: 540,
            description: 'Tortilla integral con falafel, hummus y vegetales frescos.',
          },
        ]
        const defaultItem = defaultItems.find((item) => item.id === recipeId)
        if (defaultItem) {
          setRecipe(menuItemToRecipe(defaultItem))
        }
        setLoading(false)
      } catch (error) {
        console.error('Error loading recipe:', error)
        setLoading(false)
      }
    }

    loadRecipe()

    // Escuchar cambios en el menú
    const handleMenuUpdate = () => {
      loadRecipe()
    }

    window.addEventListener('zona_azul_menu_updated', handleMenuUpdate)
    const interval = setInterval(loadRecipe, 2000)

    return () => {
      window.removeEventListener('zona_azul_menu_updated', handleMenuUpdate)
      clearInterval(interval)
    }
  }, [recipeId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-12 text-center max-w-md w-full">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto mb-6"></div>
          <p className="text-lg font-semibold text-gray-900 mb-2">Cargando detalles...</p>
          <p className="text-sm text-gray-600">Por favor espera un momento</p>
        </div>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-12 text-center max-w-md w-full">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Plato no encontrado</h2>
          <p className="text-gray-600 mb-6">Lo sentimos, el plato que buscas no está disponible.</p>
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al menú
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Hero Section con imagen */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-accent/10 to-highlight/10">
        <div className="container mx-auto px-4 py-8 sm:py-12">
          <div className="max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <nav className="mb-6">
              <Link
                href="/menu"
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Volver al menú
              </Link>
            </nav>

            {/* Contenido principal */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="grid md:grid-cols-2 gap-0">
                {/* Imagen */}
                <div className="relative h-64 md:h-auto min-h-[400px] overflow-hidden bg-gradient-to-br from-primary/20 via-accent/20 to-highlight/20">
                  <img
                    src={recipe.photo_url}
                    alt={recipe.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/images/bowl.svg'
                    }}
                  />
                  <div className="absolute top-4 left-4">
                    <div className="bg-primary/95 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/20">
                      <span className="text-sm font-bold text-white uppercase tracking-wide">📋 Carta</span>
                    </div>
                  </div>
                </div>

                {/* Información */}
                <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                      {recipe.name}
                    </h1>
                    <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                      {recipe.description}
                    </p>

                    {/* Precio destacado */}
                    <div className="mb-8 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl sm:text-5xl font-extrabold text-primary">
                          €{recipe.price.toFixed(2)}
                        </span>
                        <span className="text-sm text-gray-600">por porción</span>
                      </div>
                    </div>
                  </div>

                  {/* Info nutricional rápida */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center p-3 rounded-lg bg-red-50">
                      <div className="text-xs font-medium text-gray-600 mb-1.5 uppercase">Calorías</div>
                      <div className="text-xl font-bold text-red-600">{recipe.calories}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">kcal</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-blue-50">
                      <div className="text-xs font-medium text-gray-600 mb-1.5 uppercase">Proteína</div>
                      <div className="text-xl font-bold text-blue-600">{recipe.protein}g</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">proteína</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-green-50">
                      <div className="text-xs font-medium text-gray-600 mb-1.5 uppercase">Carbs</div>
                      <div className="text-xl font-bold text-green-600">{recipe.carbs}g</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">carbos</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-yellow-50">
                      <div className="text-xs font-medium text-gray-600 mb-1.5 uppercase">Grasas</div>
                      <div className="text-xl font-bold text-yellow-600">{recipe.fats}g</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">grasas</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Información nutricional detallada */}
      <section className="py-8 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 lg:p-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Información Nutricional Completa
              </h2>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="p-5 rounded-xl bg-red-50 border-2 border-red-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Calorías</div>
                      <div className="text-2xl font-bold text-red-600">{recipe.calories}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">kilocalorías por porción</div>
                </div>

                <div className="p-5 rounded-xl bg-blue-50 border-2 border-blue-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Proteína</div>
                      <div className="text-2xl font-bold text-blue-600">{recipe.protein}g</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">gramos de proteína</div>
                </div>

                <div className="p-5 rounded-xl bg-green-50 border-2 border-green-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Carbohidratos</div>
                      <div className="text-2xl font-bold text-green-600">{recipe.carbs}g</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">gramos de carbohidratos</div>
                </div>

                <div className="p-5 rounded-xl bg-yellow-50 border-2 border-yellow-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Grasas</div>
                      <div className="text-2xl font-bold text-yellow-600">{recipe.fats}g</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">gramos de grasas</div>
                </div>
              </div>

              {/* Descripción adicional */}
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Sobre este plato
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {recipe.description || 'Preparación rápida y saludable. Todos nuestros platos están diseñados por nutricionistas para ofrecerte el mejor equilibrio nutricional. Este plato forma parte de nuestra carta de compra individual y no está incluido en los planes de suscripción.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-8 sm:py-12 bg-gradient-to-br from-primary/5 via-accent/5 to-highlight/5">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Link
              href="/menu"
              className="inline-flex items-center gap-3 px-8 py-4 bg-white border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary hover:text-white transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Ver más platos en la carta
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
