'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { DeliveryRating } from '@/lib/types'

export default function ValoracionesRepartidorPage() {
  const { userId } = useAuth()
  const [ratings, setRatings] = useState<DeliveryRating[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      loadRatings()
    }
  }, [userId])

  const loadRatings = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/delivery-ratings?repartidor_id=${userId}`)
      if (!response.ok) throw new Error('Error al cargar valoraciones')
      
      const data = await response.json()
      setRatings(data)
    } catch (error: any) {
      console.error('Error loading ratings:', error)
      setError(error.message || 'Error al cargar valoraciones')
    } finally {
      setLoading(false)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          >
            ★
          </span>
        ))}
      </div>
    )
  }

  const calculateAverage = () => {
    if (ratings.length === 0) return 0
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0)
    return (sum / ratings.length).toFixed(1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando valoraciones...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <header>
        <h1 className="text-2xl font-bold text-gray-900">Mis Valoraciones</h1>
        <p className="text-sm text-gray-600 mt-1">
          Valoraciones compartidas por el administrador
        </p>
      </header>

      {ratings.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No hay valoraciones compartidas contigo aún.
        </div>
      ) : (
        <>
          {/* Resumen */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Promedio de Valoraciones</p>
                <p className="text-3xl font-bold text-primary mt-1">{calculateAverage()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total de Valoraciones</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{ratings.length}</p>
              </div>
            </div>
          </div>

          {/* Lista de valoraciones */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {ratings.map((rating) => (
                <div key={rating.id} className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        {renderStars(rating.rating)}
                        <span className="text-sm text-gray-500">
                          Pedido #{rating.order_id.slice(0, 8)}
                        </span>
                      </div>
                      {rating.comment && (
                        <p className="text-gray-700 mb-2">{rating.comment}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {new Date(rating.created_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}


