"use client"
import React from 'react'
import { recipes } from '../../lib/mockData'
import RestaurantMenuItem from './RestaurantMenuItem'

export default function RestaurantMenuGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {recipes.map((r) => (
        <RestaurantMenuItem key={r.id} recipe={r} />
      ))}
    </div>
  )
}
