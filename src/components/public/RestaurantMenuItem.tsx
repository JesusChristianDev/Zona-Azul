"use client"
import React from 'react'

export default function RestaurantMenuItem({ recipe }: { recipe: any }) {
  return (
    <div className="card hover:shadow-2xl transition-shadow">
      <div className="flex gap-4 items-center">
        <img src={recipe.photo_url} alt={recipe.name} className="w-28 h-28 object-cover rounded-lg" />
        <div>
          <h4 className="font-semibold text-lg">{recipe.name}</h4>
          <p className="muted text-sm mt-1">{recipe.description}</p>
          <div className="mt-2 flex items-center gap-4">
            <div className="text-sm">{recipe.calories} kcal</div>
            <div className="badge">€{recipe.price}</div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <a className="text-sm text-accent hover:underline" href={`/menu/${recipe.id}`}>Ver detalle</a>
      </div>
    </div>
  )
}
