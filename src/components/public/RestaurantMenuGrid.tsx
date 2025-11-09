"use client"

import { useState, useEffect } from 'react'
import RestaurantMenuItem from './RestaurantMenuItem'

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

// Función para convertir MenuItem a Recipe
function menuItemToRecipe(item: MenuItem): Recipe {
  // Calcular valores nutricionales estimados basados en calorías
  // Distribución aproximada: 30% proteína, 40% carbs, 30% grasas
  const protein = Math.round((item.calories * 0.3) / 4) // 4 cal/g proteína
  const carbs = Math.round((item.calories * 0.4) / 4) // 4 cal/g carbohidratos
  const fats = Math.round((item.calories * 0.3) / 9) // 9 cal/g grasas

  // Seleccionar imagen según categoría
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

export default function RestaurantMenuGrid() {
  const [recipes, setRecipes] = useState<Recipe[]>([])

  const loadMenuItems = () => {
    try {
      const stored = localStorage.getItem('zona_azul_menu')
      if (stored) {
        const menuItems: MenuItem[] = JSON.parse(stored)
        // Filtrar solo los disponibles y convertir a Recipe
        const availableItems = menuItems
          .filter((item) => item.availability === 'Disponible')
          .map(menuItemToRecipe)
        setRecipes(availableItems)
      } else {
        // Si no hay datos en localStorage, usar datos por defecto
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
        const availableItems = defaultItems
          .filter((item) => item.availability === 'Disponible')
          .map(menuItemToRecipe)
        setRecipes(availableItems)
      }
    } catch (error) {
      console.error('Error loading menu items:', error)
    }
  }

  useEffect(() => {
    loadMenuItems()

    // Escuchar cambios en localStorage para actualizar en tiempo real
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'zona_azul_menu') {
        loadMenuItems()
      }
    }

    // Escuchar cambios locales (misma pestaña)
    const handleCustomStorageChange = () => {
      loadMenuItems()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('zona_azul_menu_updated', handleCustomStorageChange)

    // Polling cada 2 segundos para detectar cambios (fallback)
    const interval = setInterval(loadMenuItems, 2000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('zona_azul_menu_updated', handleCustomStorageChange)
      clearInterval(interval)
    }
  }, [])

  if (recipes.length === 0) {
    return (
      <div className="text-center py-16 sm:py-20">
        <div className="max-w-md mx-auto">
          <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No hay platos disponibles</h3>
          <p className="text-gray-600 mb-6">
            En este momento no tenemos platos disponibles en la carta. Vuelve pronto para ver nuestras nuevas opciones.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
      {recipes.map((r, index) => (
        <div
          key={r.id}
          className="animate-in fade-in slide-in-from-bottom-4"
          style={{
            animationDelay: `${index * 100}ms`,
            animationFillMode: 'both',
          }}
        >
          <RestaurantMenuItem recipe={r} />
        </div>
      ))}
    </div>
  )
}
