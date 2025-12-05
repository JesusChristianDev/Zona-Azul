'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import ToastMessage from '@/components/ui/ToastMessage'
import LoadingState from '@/components/ui/LoadingState'
import EmptyState from '@/components/ui/EmptyState'
import ActionButton from '@/components/ui/ActionButton'
import type { WeeklyMenu, MenuModification, Meal } from '@/lib/types'

export default function ModificarMenuPage() {
  const { userId } = useAuth()
  const router = useRouter()
  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenu | null>(null)
  const [modifications, setModifications] = useState<MenuModification[]>([])
  const [availableMeals, setAvailableMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<any>(null)
  const [selectedMeal, setSelectedMeal] = useState<any>(null)
  const [selectedReplacement, setSelectedReplacement] = useState<string>('')
  const [isModifyModalOpen, setIsModifyModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      loadData()
    }
  }, [userId])

  const loadData = async () => {
    if (!userId) return

    setLoading(true)
    try {
      // Cargar menú semanal actual
      const menuResponse = await fetch(`/api/weekly-menus?user_id=${userId}`)
      if (menuResponse.ok) {
        const menuData = await menuResponse.json()
        const today = new Date()
        
        // Buscar el menú de la semana actual o más reciente
        const currentMenu = menuData.find((m: WeeklyMenu) => {
          const menuStart = new Date(m.week_start_date)
          const menuEnd = new Date(m.week_end_date)
          return today >= menuStart && today <= menuEnd
        }) || menuData[0]

        if (currentMenu) {
          const menuDetailResponse = await fetch(`/api/weekly-menus/${currentMenu.id}`)
          if (menuDetailResponse.ok) {
            const menuDetail = await menuDetailResponse.json()
            setWeeklyMenu(menuDetail)
            
            // Cargar modificaciones pendientes
            const modResponse = await fetch(`/api/menu-modifications?weekly_menu_id=${menuDetail.id}&user_id=${userId}`)
            if (modResponse.ok) {
              setModifications(await modResponse.json())
            }
          }
        }
      }

      // Cargar comidas disponibles
      const mealsResponse = await fetch('/api/meals')
      if (mealsResponse.ok) {
        const meals = await mealsResponse.json()
        // Solo comidas para planes nutricionales (no del menú del local)
        setAvailableMeals(meals.filter((m: any) => m.is_menu_item === false && m.available !== false))
      }
    } catch (error: any) {
      console.error('Error loading data:', error)
      setError('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestModification = (day: any, meal: any) => {
    setSelectedDay(day)
    setSelectedMeal(meal)
    setIsModifyModalOpen(true)
  }

  const handleConfirmModification = async () => {
    if (!weeklyMenu || !selectedDay || !selectedMeal || !selectedReplacement) {
      setError('Debes seleccionar un día, una comida y un reemplazo')
      return
    }

    try {
      const response = await fetch('/api/menu-modifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekly_menu_id: weeklyMenu.id,
          user_id: userId,
          day_number: selectedDay.day_number,
          meal_type: selectedMeal.meal_type,
          original_meal_id: selectedMeal.meal_id,
          requested_meal_id: selectedReplacement,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al solicitar modificación')
      }

      setSuccess('Solicitud de modificación enviada. Espera la aprobación del nutricionista.')
      loadData()
      setIsModifyModalOpen(false)
      setSelectedDay(null)
      setSelectedMeal(null)
      setSelectedReplacement('')
      setTimeout(() => setSuccess(null), 5000)
    } catch (error: any) {
      console.error('Error requesting modification:', error)
      setError(error.message || 'Error al solicitar modificación')
      setTimeout(() => setError(null), 5000)
    }
  }

  const getMealTypeText = (type: string) => {
    return type === 'lunch' ? 'Almuerzo' : type === 'dinner' ? 'Cena' : type
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '⏳ Pendiente' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: '✓ Aprobada' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: '✗ Rechazada' },
    }
    return badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status }
  }

  if (loading) {
    return <LoadingState message="Cargando menú semanal..." />
  }

  if (!weeklyMenu) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          title="Modificar Menú Semanal"
          description="Solicita cambios en tu menú semanal. Las modificaciones requieren aprobación del nutricionista."
        />
        <EmptyState
          title="No hay menú disponible"
          message="Aún no tienes un menú semanal asignado. Contacta con tu nutricionista."
          action={
            <ActionButton onClick={() => router.push('/suscriptor/plan')}>
              Ver Plan de Comidas
            </ActionButton>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mensajes */}
      {error && (
        <ToastMessage
          message={error}
          type="error"
          onClose={() => setError(null)}
        />
      )}
      {success && (
        <ToastMessage
          message={success}
          type="success"
          onClose={() => setSuccess(null)}
        />
      )}

      {/* Header */}
      <PageHeader
        title="Modificar Menú Semanal"
        description={`Menú de la semana ${new Date(weeklyMenu.week_start_date).toLocaleDateString('es-ES')} - ${new Date(weeklyMenu.week_end_date).toLocaleDateString('es-ES')}`}
        badge="📅 Modificaciones"
        action={
          <ActionButton
            onClick={() => router.push('/suscriptor/plan')}
            variant="secondary"
          >
            Ver Plan Completo
          </ActionButton>
        }
      />

      {/* Información importante */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">¿Cómo funciona?</h3>
            <p className="text-sm text-blue-800">
              Puedes solicitar cambios en cualquier comida de tu menú semanal. El nutricionista revisará tu solicitud y podrá aprobarla, rechazarla o sugerirte una alternativa mejor. Las modificaciones aprobadas se aplicarán automáticamente a tu menú.
            </p>
          </div>
        </div>
      </div>

      {/* Modificaciones pendientes */}
      {modifications.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tus Solicitudes de Modificación</h3>
          <div className="space-y-3">
            {modifications.map((mod) => {
              const statusBadge = getStatusBadge(mod.status)
              return (
                <div
                  key={mod.id}
                  className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge.bg} ${statusBadge.text}`}>
                          {statusBadge.label}
                        </span>
                        <span className="text-sm text-gray-600">
                          Día {mod.day_number} - {getMealTypeText(mod.meal_type)}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs sm:text-sm w-full">
                        <p className="break-words">
                          <span className="font-medium text-gray-700">Original:</span>{' '}
                          <span className="text-gray-600">{mod.original_meal?.name || 'N/A'}</span>
                          {mod.original_meal?.calories && (
                            <span className="text-gray-500 ml-1 sm:ml-2">({mod.original_meal.calories} kcal)</span>
                          )}
                        </p>
                        <p className="break-words">
                          <span className="font-medium text-gray-700">Solicitado:</span>{' '}
                          <span className="text-gray-600">{mod.requested_meal?.name || 'N/A'}</span>
                          {mod.requested_meal?.calories && (
                            <span className="text-gray-500 ml-1 sm:ml-2">({mod.requested_meal.calories} kcal)</span>
                          )}
                        </p>
                        {mod.nutritionist_recommendation && (
                          <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                            <p className="text-xs font-medium text-blue-900 mb-1">💡 Recomendación del nutricionista:</p>
                            <p className="text-sm text-blue-800">{mod.nutritionist_recommendation}</p>
                          </div>
                        )}
                        {mod.rejection_reason && (
                          <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                            <p className="text-xs font-medium text-red-900 mb-1">Motivo del rechazo:</p>
                            <p className="text-sm text-red-800">{mod.rejection_reason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Menú semanal */}
      {weeklyMenu.days && weeklyMenu.days.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Menú de la Semana</h3>
            <p className="text-sm text-gray-600 mt-1">Haz clic en cualquier comida para solicitar un cambio</p>
          </div>
          <div className="divide-y divide-gray-200">
            {weeklyMenu.days.map((day) => (
              <div key={day.id} className="p-4 sm:p-6">
                <h4 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">{day.day_name}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {day.weekly_menu_day_meals?.map((meal: any) => {
                    const mealData = meal.meals
                    const hasPendingModification = modifications.some(
                      (m) => m.day_number === day.day_number && 
                             m.meal_type === meal.meal_type && 
                             m.status === 'pending'
                    )
                    
                    return (
                      <button
                        key={meal.id}
                        onClick={() => handleRequestModification(day, meal)}
                        disabled={hasPendingModification}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          hasPendingModification
                            ? 'border-yellow-300 bg-yellow-50 cursor-not-allowed opacity-75'
                            : 'border-gray-200 hover:border-primary hover:shadow-md cursor-pointer'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-medium text-primary uppercase">
                            {getMealTypeText(meal.meal_type)}
                          </span>
                          {hasPendingModification && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                              ⏳ Pendiente
                            </span>
                          )}
                        </div>
                        <h5 className="font-semibold text-gray-900 mb-1 text-sm">{mealData?.name || 'N/A'}</h5>
                        {mealData?.calories && (
                          <p className="text-xs text-gray-500">{mealData.calories} kcal</p>
                        )}
                        {mealData?.description && (
                          <p className="text-xs text-gray-600 mt-2 line-clamp-2">{mealData.description}</p>
                        )}
                        {!hasPendingModification && (
                          <p className="text-xs text-primary mt-2 font-medium">Click para modificar →</p>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title="No hay días en el menú"
          message="El menú semanal no tiene días configurados aún."
        />
      )}

      {/* Modal de modificación */}
      <Modal
        isOpen={isModifyModalOpen}
        onClose={() => {
          setIsModifyModalOpen(false)
          setSelectedDay(null)
          setSelectedMeal(null)
          setSelectedReplacement('')
        }}
        title="Solicitar Modificación de Menú"
        size="md"
      >
        {selectedDay && selectedMeal && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Comida Actual</h4>
              <p className="text-sm text-gray-700">
                <span className="font-medium">{selectedMeal.meals?.name || 'N/A'}</span>
                {selectedMeal.meals?.calories && (
                  <span className="text-gray-500 ml-2">({selectedMeal.meals.calories} kcal)</span>
                )}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {getMealTypeText(selectedMeal.meal_type)} - {selectedDay.day_name}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecciona el reemplazo
              </label>
              <select
                value={selectedReplacement}
                onChange={(e) => setSelectedReplacement(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Seleccionar comida...</option>
                {availableMeals
                  .filter((m) => m.type === selectedMeal.meal_type)
                  .map((meal) => (
                    <option key={meal.id} value={meal.id}>
                      {meal.name} ({meal.calories} kcal)
                    </option>
                  ))}
              </select>
              {availableMeals.filter((m) => m.type === selectedMeal.meal_type).length === 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  No hay comidas disponibles de este tipo. Contacta con tu nutricionista.
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Nota:</strong> Tu solicitud será revisada por el nutricionista. Podrá aprobarla, rechazarla o sugerirte una alternativa mejor.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={() => {
                  setIsModifyModalOpen(false)
                  setSelectedDay(null)
                  setSelectedMeal(null)
                  setSelectedReplacement('')
                }}
                className="w-full sm:flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmModification}
                disabled={!selectedReplacement}
                className="w-full sm:flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enviar Solicitud
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

