"use client"

import { useState, useEffect } from 'react'
import RestaurantMenuItem from './RestaurantMenuItem'
import { getMeals } from '../../lib/api'

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

  const loadMenuItems = async () => {
    try {
      // Cargar comidas del catálogo y filtrar solo las del MENÚ DEL LOCAL
      // Nota: Solo las comidas con is_menu_item=true Y available=true aparecen en /menu
      const meals = await getMeals()
      if (meals && meals.length > 0) {
        // Filtrar solo las comidas del menú del local (NO las de planes nutricionales)
        const availableItems = meals
          .filter((meal: any) => meal.available && meal.is_menu_item === true)
          .map((meal: any) => {
            // Convertir meal de API a MenuItem y luego a Recipe
            const menuItem: MenuItem = {
              id: meal.id,
              name: meal.name,
              category: meal.type === 'breakfast' ? 'Desayuno' : 
                       meal.type === 'lunch' ? 'Plato principal' :
                       meal.type === 'dinner' ? 'Cena' :
                       meal.type === 'snack' ? 'Bebida funcional' : 'Plato principal',
              price: meal.price || 0,
              availability: meal.available ? 'Disponible' : 'No disponible',
              calories: meal.calories || 0,
              description: meal.description || '',
            }
            return menuItemToRecipe(menuItem)
          })
        setRecipes(availableItems)
      } else {
        setRecipes([])
      }
    } catch (error) {
      console.error('Error loading menu items:', error)
      setRecipes([])
    }
  }

  useEffect(() => {
    loadMenuItems()

    // Polling cada 30 segundos para actualizar
    const interval = setInterval(loadMenuItems, 30000)

    return () => {
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
