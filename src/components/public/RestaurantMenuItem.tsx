"use client"
import Link from 'next/link'

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

interface RestaurantMenuItemProps {
  recipe: Recipe
}

export default function RestaurantMenuItem({ recipe }: RestaurantMenuItemProps) {
  return (
    <Link
      href={`/menu/${recipe.id}`}
      className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-primary/30 overflow-hidden transform hover:-translate-y-1"
    >
      {/* Imagen */}
      <div className="relative h-48 sm:h-56 overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10">
        <img
          src={recipe.photo_url}
          alt={recipe.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = '/images/bowl.svg'
          }}
        />
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md">
          <span className="text-sm font-bold text-primary">€{recipe.price}</span>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-5 sm:p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">
          {recipe.name}
        </h3>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
          {recipe.description}
        </p>

        {/* Info nutricional */}
        <div className="grid grid-cols-4 gap-2 mb-4 pb-4 border-b border-gray-100">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Calorías</div>
            <div className="text-sm font-semibold text-gray-900">{recipe.calories}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Proteína</div>
            <div className="text-sm font-semibold text-primary">{recipe.protein}g</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Carbs</div>
            <div className="text-sm font-semibold text-accent">{recipe.carbs}g</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Grasas</div>
            <div className="text-sm font-semibold text-highlight">{recipe.fats}g</div>
          </div>
        </div>

        {/* Link */}
        <div className="flex items-center justify-between text-primary font-medium text-sm">
          <span>Ver detalles</span>
          <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  )
}
