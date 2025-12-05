'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import ActionButton from '@/components/ui/ActionButton'
import type { DeliveryRating } from '@/lib/types'

export default function ValoracionesPage() {
  const { userId } = useAuth()
  const [ratings, setRatings] = useState<DeliveryRating[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRating, setSelectedRating] = useState<DeliveryRating | null>(null)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  useEffect(() => {
    loadRatings()
  }, [])

  const loadRatings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/delivery-ratings')
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

  const handleShareWithRepartidor = async (rating: DeliveryRating, share: boolean) => {
    try {
      const response = await fetch(`/api/delivery-ratings/${rating.id}/share`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_visible_to_repartidor: share }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar visibilidad')
      }

      await loadRatings()
      setIsShareModalOpen(false)
      setSelectedRating(null)
    } catch (error: any) {
      console.error('Error sharing rating:', error)
      setError(error.message || 'Error al compartir valoración')
      setTimeout(() => setError(null), 5000)
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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <header>
        <h1 className="text-2xl font-bold text-gray-900">Valoraciones de Entregas</h1>
        <p className="text-sm text-gray-600 mt-1">
          Gestiona las valoraciones de entregas y decide qué compartir con los repartidores
        </p>
      </header>

      {ratings.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No hay valoraciones registradas aún.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {ratings.map((rating) => (
              <div key={rating.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      {renderStars(rating.rating)}
                      <span className="text-sm text-gray-500">
                        Pedido #{rating.order_id.slice(0, 8)}
                      </span>
                      {rating.repartidor_id && (
                        <span className="text-sm text-gray-500">
                          Repartidor: #{rating.repartidor_id.slice(0, 8)}
                        </span>
                      )}
                    </div>
                    {rating.comment && (
                      <p className="text-gray-700 mb-2">{rating.comment}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        Usuario: #{rating.user_id.slice(0, 8)}
                      </span>
                      <span>
                        {new Date(rating.created_at).toLocaleDateString('es-ES')}
                      </span>
                      {rating.updated_at !== rating.created_at && (
                        <span className="text-gray-400">(Editada)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        rating.is_visible_to_repartidor
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {rating.is_visible_to_repartidor ? 'Compartida' : 'No compartida'}
                    </span>
                    <ActionButton
                      onClick={() => {
                        setSelectedRating(rating)
                        setIsShareModalOpen(true)
                      }}
                      variant={rating.is_visible_to_repartidor ? 'soft-danger' : 'primary'}
                      size="sm"
                    >
                      {rating.is_visible_to_repartidor ? 'Ocultar' : 'Compartir'}
                    </ActionButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal para compartir/ocultar */}
      {isShareModalOpen && selectedRating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedRating.is_visible_to_repartidor
                ? 'Ocultar valoración del repartidor'
                : 'Compartir valoración con repartidor'}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {selectedRating.is_visible_to_repartidor
                ? '¿Estás seguro de ocultar esta valoración del repartidor?'
                : '¿Deseas compartir esta valoración con el repartidor?'}
            </p>
            <div className="flex gap-3">
              <ActionButton
                onClick={() => {
                  setIsShareModalOpen(false)
                  setSelectedRating(null)
                }}
                variant="muted-outline"
                fullWidth
              >
                Cancelar
              </ActionButton>
              <ActionButton
                onClick={() => handleShareWithRepartidor(selectedRating, !selectedRating.is_visible_to_repartidor)}
                variant={selectedRating.is_visible_to_repartidor ? 'danger' : 'primary'}
                fullWidth
              >
                {selectedRating.is_visible_to_repartidor ? 'Ocultar' : 'Compartir'}
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


