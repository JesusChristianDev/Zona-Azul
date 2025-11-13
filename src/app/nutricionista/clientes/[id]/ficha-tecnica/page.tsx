'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import type { Meal } from '@/lib/types'

export default function FichaTecnicaPage() {
  const params = useParams()
  const clientId = params.id as string
  const { userId } = useAuth()
  const [client, setClient] = useState<any>(null)
  const [favorites, setFavorites] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [isEditNoteModalOpen, setIsEditNoteModalOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [noteFormData, setNoteFormData] = useState({
    note_text: '',
    is_private: true,
  })

  useEffect(() => {
    if (clientId) {
      loadClientData()
      loadFavorites()
      loadNotes()
    }
  }, [clientId])

  const loadClientData = async () => {
    try {
      const response = await fetch(`/api/users/${clientId}`)
      if (response.ok) {
        const data = await response.json()
        setClient(data)
      }
    } catch (error) {
      console.error('Error loading client:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFavorites = async () => {
    try {
      const response = await fetch(`/api/user-favorites?user_id=${clientId}`)
      if (response.ok) {
        const data = await response.json()
        setFavorites(data)
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
    }
  }

  const loadNotes = async () => {
    try {
      const response = await fetch(`/api/user-notes?user_id=${clientId}`)
      if (response.ok) {
        const data = await response.json()
        setNotes(data)
      }
    } catch (error) {
      console.error('Error loading notes:', error)
    }
  }

  const handleCreateNote = async () => {
    if (!noteFormData.note_text.trim()) {
      setError('Debes escribir una nota')
      return
    }

    try {
      const response = await fetch('/api/user-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: clientId,
          nutricionista_id: userId,
          note_text: noteFormData.note_text,
          is_private: noteFormData.is_private,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear nota')
      }

      setSuccess('Nota creada correctamente')
      loadNotes()
      setIsNoteModalOpen(false)
      setNoteFormData({
        note_text: '',
        is_private: true,
      })
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error creating note:', error)
      setError(error.message || 'Error al crear nota')
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleUpdateNote = async () => {
    if (!selectedNote || !noteFormData.note_text.trim()) {
      setError('Debes escribir una nota')
      return
    }

    try {
      const response = await fetch('/api/user-notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_id: selectedNote.id,
          note_text: noteFormData.note_text,
          is_private: noteFormData.is_private,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar nota')
      }

      setSuccess('Nota actualizada correctamente')
      loadNotes()
      setIsEditNoteModalOpen(false)
      setSelectedNote(null)
      setNoteFormData({
        note_text: '',
        is_private: true,
      })
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error updating note:', error)
      setError(error.message || 'Error al actualizar nota')
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta nota?')) return

    try {
      const response = await fetch(`/api/user-notes?note_id=${noteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar nota')
      }

      setSuccess('Nota eliminada correctamente')
      loadNotes()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error deleting note:', error)
      setError(error.message || 'Error al eliminar nota')
      setTimeout(() => setError(null), 5000)
    }
  }

  const getMealTypeText = (type: string) => {
    const types = {
      breakfast: 'Desayuno',
      lunch: 'Almuerzo',
      dinner: 'Cena',
      snack: 'Snack',
    }
    return types[type as keyof typeof types] || type
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando ficha técnica...</p>
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

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-700 text-sm">
          {success}
        </div>
      )}

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Ficha Técnica - {client?.name || 'Cliente'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Favoritos y notas del cliente (solo visible para nutricionista y administrador)
          </p>
        </div>
        <button
          onClick={() => setIsNoteModalOpen(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium"
        >
          + Agregar Nota
        </button>
      </header>

      {/* Favoritos */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Comidas Favoritas</h2>
        {favorites.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            El cliente no tiene comidas favoritas registradas
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((favorite) => (
              <div
                key={favorite.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{favorite.meals?.name || 'N/A'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {getMealTypeText(favorite.meals?.type || '')}
                    </p>
                    {favorite.meals && (
                      <p className="text-xs text-gray-500 mt-1">
                        {favorite.meals.calories} kcal
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notas */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notas</h2>
        {notes.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No hay notas registradas para este cliente
          </p>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-2">
                      Por: {note.nutricionistas?.name || 'N/A'} • {new Date(note.created_at).toLocaleDateString('es-ES')}
                    </p>
                    <p className="text-gray-900 whitespace-pre-wrap">{note.note_text}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedNote(note)
                        setNoteFormData({
                          note_text: note.note_text,
                          is_private: note.is_private,
                        })
                        setIsEditNoteModalOpen(true)
                      }}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal crear nota */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={() => {
          setIsNoteModalOpen(false)
          setNoteFormData({
            note_text: '',
            is_private: true,
          })
        }}
        title="Agregar Nota"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nota
            </label>
            <textarea
              value={noteFormData.note_text}
              onChange={(e) => setNoteFormData({ ...noteFormData, note_text: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Escribe tus notas sobre este cliente..."
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_private"
              checked={noteFormData.is_private}
              onChange={(e) => setNoteFormData({ ...noteFormData, is_private: e.target.checked })}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <label htmlFor="is_private" className="ml-2 text-sm text-gray-700">
              Nota privada (solo visible para nutricionista y administrador)
            </label>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsNoteModalOpen(false)
                setNoteFormData({
                  note_text: '',
                  is_private: true,
                })
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreateNote}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Crear Nota
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal editar nota */}
      <Modal
        isOpen={isEditNoteModalOpen}
        onClose={() => {
          setIsEditNoteModalOpen(false)
          setSelectedNote(null)
          setNoteFormData({
            note_text: '',
            is_private: true,
          })
        }}
        title="Editar Nota"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nota
            </label>
            <textarea
              value={noteFormData.note_text}
              onChange={(e) => setNoteFormData({ ...noteFormData, note_text: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_private_edit"
              checked={noteFormData.is_private}
              onChange={(e) => setNoteFormData({ ...noteFormData, is_private: e.target.checked })}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <label htmlFor="is_private_edit" className="ml-2 text-sm text-gray-700">
              Nota privada
            </label>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsEditNoteModalOpen(false)
                setSelectedNote(null)
                setNoteFormData({
                  note_text: '',
                  is_private: true,
                })
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleUpdateNote}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Actualizar Nota
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}


