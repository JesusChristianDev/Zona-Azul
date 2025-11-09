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
      className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200 hover:border-primary/40 overflow-hidden transform hover:-translate-y-2 active:scale-[0.98]"
    >
      {/* Imagen con overlay */}
      <div className="relative h-56 sm:h-64 overflow-hidden bg-gradient-to-br from-primary/20 via-accent/20 to-highlight/20">
        <img
          src={recipe.photo_url}
          alt={recipe.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = '/images/bowl.svg'
          }}
        />
        {/* Overlay gradient en hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Badges superiores */}
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2">
          <div className="bg-primary/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-white/20">
            <span className="text-xs font-bold text-white uppercase tracking-wider">📋 Carta</span>
          </div>
          <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/20">
            <span className="text-lg font-bold text-primary">€{recipe.price.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-6">
        {/* Título */}
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 group-hover:text-primary transition-colors duration-300 leading-tight">
          {recipe.name}
        </h3>
        
        {/* Descripción */}
        <p className="text-sm sm:text-base text-gray-600 mb-5 line-clamp-2 leading-relaxed min-h-[3rem]">
          {recipe.description}
        </p>

        {/* Info nutricional mejorada */}
        <div className="mb-5 pb-5 border-b border-gray-200">
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-2 rounded-lg bg-red-50/50 group-hover:bg-red-50 transition-colors">
              <div className="text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Calorías</div>
              <div className="text-base font-bold text-red-600">{recipe.calories}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">kcal</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-blue-50/50 group-hover:bg-blue-50 transition-colors">
              <div className="text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Proteína</div>
              <div className="text-base font-bold text-blue-600">{recipe.protein}g</div>
              <div className="text-[10px] text-gray-500 mt-0.5">proteína</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-green-50/50 group-hover:bg-green-50 transition-colors">
              <div className="text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Carbs</div>
              <div className="text-base font-bold text-green-600">{recipe.carbs}g</div>
              <div className="text-[10px] text-gray-500 mt-0.5">carbos</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-yellow-50/50 group-hover:bg-yellow-50 transition-colors">
              <div className="text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Grasas</div>
              <div className="text-base font-bold text-yellow-600">{recipe.fats}g</div>
              <div className="text-[10px] text-gray-500 mt-0.5">grasas</div>
            </div>
          </div>
        </div>

        {/* CTA mejorado */}
        <div className="flex items-center justify-between text-primary font-semibold text-sm sm:text-base group-hover:gap-3 transition-all">
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Ver detalles completos
          </span>
          <svg className="w-5 h-5 transform group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
      </div>
    </Link>
  )
}
