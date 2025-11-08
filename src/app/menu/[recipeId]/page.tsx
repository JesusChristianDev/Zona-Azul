"use client"
import { useParams } from 'next/navigation'
import { recipes } from '../../../lib/mockData'

export default function RecipeDetail() {
  const params = useParams()
  const recipeId = params?.recipeId as string
  const recipe = recipes.find((r) => r.id === recipeId)

  if (!recipe) {
    return (
      <div className="card p-4 sm:p-6 text-center">
        <p className="text-sm sm:text-base">Plato no encontrado (demo)</p>
      </div>
    )
  }

  return (
    <div className="card space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
        <img
          src={recipe.photo_url}
          alt={recipe.name}
          className="w-full sm:w-48 h-64 sm:h-48 object-cover rounded-lg shadow mx-auto sm:mx-0"
          onError={(e) => {
            // Fallback si la imagen no carga
            const target = e.target as HTMLImageElement
            target.src = '/images/bowl.svg'
          }}
        />
        <div className="flex-1 w-full sm:w-auto">
          <h2 className="text-2xl sm:text-3xl font-bold">{recipe.name}</h2>
          <p className="muted mt-2 text-sm sm:text-base">{recipe.description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="text-center sm:text-left">
              <div className="muted text-xs sm:text-sm">Calorías</div>
              <div className="font-semibold text-sm sm:text-base">{recipe.calories} kcal</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="muted text-xs sm:text-sm">Proteína</div>
              <div className="font-semibold text-sm sm:text-base">{recipe.protein} g</div>
            </div>
            <div className="w-full sm:w-auto sm:ml-auto text-center sm:text-right text-xl sm:text-2xl font-extrabold text-primary">
              €{recipe.price}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t pt-4 sm:pt-6">
        <h3 className="font-semibold text-base sm:text-lg mb-2">Información nutricional completa</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          <div className="text-center sm:text-left">
            <div className="muted text-xs">Carbohidratos</div>
            <div className="font-semibold text-sm sm:text-base">{recipe.carbs} g</div>
          </div>
          <div className="text-center sm:text-left">
            <div className="muted text-xs">Grasas</div>
            <div className="font-semibold text-sm sm:text-base">{recipe.fats} g</div>
          </div>
        </div>
        <div className="mt-4 sm:mt-6">
          <h3 className="font-semibold text-base sm:text-lg mb-2">Instrucciones</h3>
          <p className="muted text-sm sm:text-base">Preparación rápida y saludable. (Contenido mock)</p>
        </div>
      </div>
    </div>
  )
}
