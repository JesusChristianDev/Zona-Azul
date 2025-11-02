"use client"
import React from 'react'
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
    <div className="card hover:shadow-2xl transition-shadow p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
        <img
          src={recipe.photo_url}
          alt={recipe.name}
          className="w-full sm:w-28 h-40 sm:h-28 object-cover rounded-lg"
          onError={(e) => {
            // Fallback si la imagen no carga
            const target = e.target as HTMLImageElement
            target.src = '/images/bowl.svg'
          }}
        />
        <div className="flex-1 w-full sm:w-auto">
          <h4 className="font-semibold text-base sm:text-lg">{recipe.name}</h4>
          <p className="muted text-xs sm:text-sm mt-1 line-clamp-2">{recipe.description}</p>
          <div className="mt-2 flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="text-xs sm:text-sm">{recipe.calories} kcal</div>
            <div className="badge text-xs">€{recipe.price}</div>
          </div>
        </div>
      </div>
      <div className="mt-3 sm:mt-4 flex justify-end">
        <Link
          href={`/menu/${recipe.id}`}
          className="text-xs sm:text-sm text-accent hover:underline font-medium"
        >
          Ver detalle →
        </Link>
      </div>
    </div>
  )
}
