"use client"
import { recipes } from '../../lib/mockData'
import RestaurantMenuItem from './RestaurantMenuItem'

export default function RestaurantMenuGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
      {recipes.map((r) => (
        <RestaurantMenuItem key={r.id} recipe={r} />
      ))}
    </div>
  )
}
