"use client"
import React from 'react'
import { recipes } from '../../../lib/mockData'

export default function RecipeDetail() {
  // Simple client-side read of the id from the path for demo purposes
  const id = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : null
  const recipe = recipes.find((r) => r.id === id)

  if (!recipe) {
    return <div className="card">Plato no encontrado (demo)</div>
  }

  return (
    <div className="card space-y-4 container">
      <div className="flex gap-6 items-start">
        <img src={recipe.photo_url} alt={recipe.name} className="w-48 h-48 object-cover rounded-lg shadow" />
        <div className="flex-1">
          <h2 className="text-3xl font-bold">{recipe.name}</h2>
          <p className="muted mt-2">{recipe.description}</p>

          <div className="mt-4 flex items-center gap-6">
            <div>
              <div className="muted">Calorías</div>
              <div className="font-semibold">{recipe.calories} kcal</div>
            </div>
            <div>
              <div className="muted">Proteína</div>
              <div className="font-semibold">{recipe.protein} g</div>
            </div>
            <div className="ml-auto text-2xl font-extrabold">€{recipe.price}</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold">Instrucciones</h3>
        <p className="muted">Preparación rápida y saludable. (Contenido mock)</p>
      </div>
    </div>
  )
}
