'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import type { DeliveryRating } from '@/lib/types'

export default function ValorarPage() {
  const params = useParams()
  const router = useRouter()
  const { userId } = useAuth()
  const orderId = params.id as string
  const [rating, setRating] = useState<number>(0)
  const [comment, setComment] = useState<string>('')
  const [existingRating, setExistingRating] = useState<DeliveryRating | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (orderId) {
      loadExistingRating()
    }
  }, [orderId])

  const loadExistingRating = async () => {
    try {
      const response = await fetch(`/api/delivery-ratings?order_id=${orderId}`)
      if (response.ok) {
        const data = await response.json()
        if (data && data.length > 0) {
          setExistingRating(data[0])
          setRating(data[0].rating)
          setComment(data[0].comment || '')
        }
      }
    } catch (error) {
      console.error('Error loading existing rating:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Debes seleccionar una valoración')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      if (existingRating) {
        // Actualizar valoración existente
        const response = await fetch(`/api/delivery-ratings/${existingRating.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating, comment }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error al actualizar valoración')
        }

        setSuccess('Valoración actualizada correctamente')
      } else {
        // Crear nueva valoración
        const response = await fetch('/api/delivery-ratings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId, rating, comment }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error al crear valoración')
        }

        setSuccess('Valoración creada correctamente')
      }

      setTimeout(() => {
        router.push('/suscriptor/pedidos')
      }, 2000)
    } catch (error: any) {
      console.error('Error submitting rating:', error)
      setError(error.message || 'Error al guardar valoración')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!existingRating || !confirm('¿Estás seguro de eliminar esta valoración?')) return

    try {
      const response = await fetch(`/api/delivery-ratings/${existingRating.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar valoración')
      }

      setSuccess('Valoración eliminada correctamente')
      setTimeout(() => {
        router.push('/suscriptor/pedidos')
      }, 2000)
    } catch (error: any) {
      console.error('Error deleting rating:', error)
      setError(error.message || 'Error al eliminar valoración')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-700 text-sm">
          {success}
        </div>
      )}

      <header>
        <h1 className="text-2xl font-bold text-gray-900">
          {existingRating ? 'Editar Valoración' : 'Valorar Entrega'}
        </h1>
        <p className="text-sm text-gray-600 mt-1">Pedido #{orderId.slice(0, 8)}</p>
      </header>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Calificación <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-4xl transition-transform hover:scale-110 ${
                  star <= rating ? 'text-yellow-400' : 'text-gray-300'
                }`}
              >
                ★
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-4 text-lg font-medium text-gray-700">
                {rating} {rating === 1 ? 'estrella' : 'estrellas'}
              </span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comentario (opcional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Comparte tu experiencia con la entrega..."
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.push('/suscriptor/pedidos')}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          {existingRating && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
            >
              Eliminar
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition ${
              submitting || rating === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {submitting ? 'Guardando...' : existingRating ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}


