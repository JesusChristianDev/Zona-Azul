"use client"

import { useState, useEffect } from 'react'
import { mockProgress } from '../../../lib/mockProgress'
import { useAuth } from '../../../hooks/useAuth'
import { getUserData, setUserData } from '../../../lib/storage'

interface ProgressEntry {
  date: string
  weight?: number
  hydration?: number
  energy?: number
  notes?: string
}

export default function SuscriptorProgresoPage() {
  const { userId } = useAuth()
  const [entries, setEntries] = useState<ProgressEntry[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formData, setFormData] = useState({
    weight: '',
    hydration: '',
    energy: '',
    notes: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    
    const stored = getUserData<ProgressEntry[]>('zona_azul_progress', userId, [])
    if (stored) {
      setEntries(stored)
    }
  }, [userId])

  const showToast = (message: string, isError = false) => {
    if (isError) {
      setError(message)
      setTimeout(() => setError(null), 5000)
    } else {
      setSuccess(message)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.weight && !formData.hydration && !formData.energy) {
      setError('Por favor registra al menos una métrica')
      return
    }

    const newEntry: ProgressEntry = {
      date: new Date().toISOString(),
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      hydration: formData.hydration ? parseFloat(formData.hydration) : undefined,
      energy: formData.energy ? parseFloat(formData.energy) : undefined,
      notes: formData.notes || undefined,
    }

    const updated = [newEntry, ...entries]
    setEntries(updated)
    if (userId) {
      setUserData('zona_azul_progress', updated, userId)
    }
    setFormData({ weight: '', hydration: '', energy: '', notes: '' })
    setIsFormOpen(false)
    showToast('Progreso registrado correctamente')
  }

  // Calcular promedios y tendencias
  const latestWeight = entries.find((e) => e.weight)?.weight
  const latestHydration = entries.find((e) => e.hydration)?.hydration
  const latestEnergy = entries.find((e) => e.energy)?.energy

  const avgHydration =
    entries.filter((e) => e.hydration).length > 0
      ? entries
          .filter((e) => e.hydration)
          .reduce((sum, e) => sum + (e.hydration || 0), 0) / entries.filter((e) => e.hydration).length
      : mockProgress.metrics.find((m) => m.label === 'Hidratación')?.value || 0

  const avgEnergy =
    entries.filter((e) => e.energy).length > 0
      ? entries
          .filter((e) => e.energy)
          .reduce((sum, e) => sum + (e.energy || 0), 0) / entries.filter((e) => e.energy).length
      : mockProgress.metrics.find((m) => m.label === 'Energía')?.value || 0

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-700 text-sm">
          {success}
        </div>
      )}

      <header className="rounded-2xl border border-highlight/30 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Progreso integral</h2>
            <p className="mt-2 text-sm text-gray-600">
              Visualiza cómo evolucionan tus métricas principales. Recuerda registrar tu peso y nivel de energía
              cada mañana para obtener recomendaciones personalizadas.
            </p>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition"
          >
            Registrar progreso
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">Peso actual</p>
          <p className="mt-3 text-3xl font-bold text-gray-900">
            {latestWeight ? `${latestWeight} kg` : '—'}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Meta semanal: {mockProgress.metrics.find((m) => m.label === 'Peso')?.goal || 'Mantener'}
          </p>
          <p className="mt-2 text-sm font-medium text-gray-600">
            {mockProgress.metrics.find((m) => m.label === 'Peso')?.tip || 'Registra tu peso cada mañana'}
          </p>
        </article>

        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">Hidratación</p>
          <p className="mt-3 text-3xl font-bold text-gray-900">
            {latestHydration ? `${latestHydration}L` : avgHydration ? `${Math.round(avgHydration)}L` : '—'}
          </p>
          <p className="mt-2 text-xs text-gray-500">Promedio: {Math.round(avgHydration)}L</p>
          <p className="mt-2 text-sm font-medium text-gray-600">
            {mockProgress.metrics.find((m) => m.label === 'Hidratación')?.tip ||
              'Bebe agua durante todo el día'}
          </p>
        </article>

        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">Energía</p>
          <p className="mt-3 text-3xl font-bold text-gray-900">
            {latestEnergy ? `${latestEnergy}/10` : avgEnergy ? `${Math.round(avgEnergy)}/10` : '—'}
          </p>
          <p className="mt-2 text-xs text-gray-500">Promedio: {Math.round(avgEnergy)}/10</p>
          <p className="mt-2 text-sm font-medium text-gray-600">
            {mockProgress.metrics.find((m) => m.label === 'Energía')?.tip ||
              'Evalúa tu nivel de energía diario'}
          </p>
        </article>
      </section>

      {entries.length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Historial de registros</h3>
          <div className="space-y-3">
            {entries.slice(0, 5).map((entry, index) => (
              <div key={index} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(entry.date).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <div className="flex gap-4 mt-1 text-xs text-gray-600">
                    {entry.weight && <span>Peso: {entry.weight} kg</span>}
                    {entry.hydration && <span>Hidratación: {entry.hydration}L</span>}
                    {entry.energy && <span>Energía: {entry.energy}/10</span>}
                  </div>
                  {entry.notes && <p className="mt-1 text-xs text-gray-500 italic">{entry.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Notas del plan</h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          Tu nutricionista sugiere añadir 10 minutos de respiración consciente después del almuerzo para
          mejorar la digestión y reducir el estrés. También puedes registrar sensaciones y energía en la app
          móvil para ajustar el plan semanalmente.
        </p>
      </section>

      {/* Modal Formulario */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Registrar progreso</h2>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Peso (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: 70.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hidratación (litros)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.hydration}
                  onChange={(e) => setFormData({ ...formData, hydration: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: 2.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nivel de energía (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.energy}
                  onChange={(e) => setFormData({ ...formData, energy: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: 8"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notas (opcional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Comentarios sobre tu día..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
