'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import ToastMessage from '@/components/ui/ToastMessage'
import LoadingState from '@/components/ui/LoadingState'
import EmptyState from '@/components/ui/EmptyState'
import type { DeliveryAddress, WeeklyMenu, WeeklyMenuDay, Subscription } from '@/lib/types'

interface ScheduledOrder {
  id?: string
  date: string
  dayName: string
  meals: Array<{
    id: string
    name: string
    type: 'lunch' | 'dinner'
    meal_type: string
    delivery_mode?: 'delivery' | 'pickup'
    delivery_address_id?: string
    pickup_location?: string
    delivery_time?: string // Hora de entrega (HH:mm)
  }>
  can_modify: boolean
  modification_deadline: string
}

export default function ConfigurarEntregaPage() {
  const { userId } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [scheduledOrders, setScheduledOrders] = useState<ScheduledOrder[]>([])
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([])
  const [currentWeekMenu, setCurrentWeekMenu] = useState<WeeklyMenu | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [mealPlanPreferences, setMealPlanPreferences] = useState<Record<string, 'lunch' | 'dinner'>>({}) // meal_plan_day_id -> preferred_meal_type
  const [mealPlanDayMapping, setMealPlanDayMapping] = useState<Record<number, string>>({}) // day_number -> meal_plan_day_id
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null) // ID del pedido que se está guardando

  useEffect(() => {
    if (userId) {
      loadData()
    }
  }, [userId])

  const loadData = async () => {
    if (!userId) return

    setLoading(true)
    try {
      // Cargar suscripción activa para obtener meals_per_day
      let activeSub: Subscription | null = null
      const subResponse = await fetch(`/api/subscriptions?user_id=${userId}&status=active`)
      if (subResponse.ok) {
        const subData = await subResponse.json()
        activeSub = Array.isArray(subData) ? subData.find((sub: Subscription) => sub.status === 'active') : null
        if (activeSub) {
          setSubscription(activeSub)
        }
      }

      // Cargar plan nutricional y preferencias si meals_per_day = 1
      if (activeSub && activeSub.meals_per_day === 1) {
        try {
          const planResponse = await fetch(`/api/plans?user_id=${userId}`)
          if (planResponse.ok) {
            const planData = await planResponse.json()
            const mealPlan = planData.plan
            
            if (mealPlan && mealPlan.id) {
              // Crear mapeo de day_number a meal_plan_day_id
              const dayMapping: Record<number, string> = {}
              if (mealPlan.days && Array.isArray(mealPlan.days)) {
                mealPlan.days.forEach((day: any) => {
                  // El plan tiene días con day_number (1-5 para lunes-viernes)
                  // Necesitamos obtener el day_number del nombre del día
                  const dayNumberMap: Record<string, number> = {
                    'Lunes': 1,
                    'Martes': 2,
                    'Miércoles': 3,
                    'Jueves': 4,
                    'Viernes': 5,
                  }
                  const dayNumber = dayNumberMap[day.day] || day.day_number
                  if (day.id && dayNumber) {
                    dayMapping[dayNumber] = day.id
                  }
                })
              }
              setMealPlanDayMapping(dayMapping)
              
              // Cargar preferencias del plan
              const prefsResponse = await fetch(`/api/meal-plan-preferences?meal_plan_id=${mealPlan.id}`)
              if (prefsResponse.ok) {
                const prefsData = await prefsResponse.json()
                if (prefsData.preferences) {
                  setMealPlanPreferences(prefsData.preferences)
                }
              }
            }
          }
        } catch (error) {
          console.error('Error loading meal plan preferences:', error)
        }
      }

      // Cargar menú semanal actual
      let currentMenu: WeeklyMenu | null = null
      const menuResponse = await fetch(`/api/weekly-menus?user_id=${userId}`)
      if (menuResponse.ok) {
        const menus = await menuResponse.json()
        // Obtener el menú de la semana actual o próxima
        const today = new Date()
        currentMenu = menus.find((m: WeeklyMenu) => {
          const weekStart = new Date(m.week_start_date)
          const weekEnd = new Date(m.week_end_date)
          return today >= weekStart && today <= weekEnd
        }) || menus[0] // Si no hay de esta semana, tomar el primero

        if (currentMenu) {
          setCurrentWeekMenu(currentMenu)
        }
      }

      // Cargar pedidos programados después de tener la suscripción y el menú
      if (currentMenu) {
        await loadScheduledOrders(currentMenu.id, activeSub)
      }

      // Cargar direcciones
      const addressesResponse = await fetch(`/api/delivery-addresses?user_id=${userId}`)
      if (addressesResponse.ok) {
        const data = await addressesResponse.json()
        setAddresses(data.filter((a: DeliveryAddress) => a.is_active))
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Error al cargar la información')
    } finally {
      setLoading(false)
    }
  }

  const loadScheduledOrders = async (weeklyMenuId: string, subscriptionInfo: Subscription | null = subscription) => {
    try {
      // Obtener detalles del menú semanal con días y comidas
      const menuDetailResponse = await fetch(`/api/weekly-menus/${weeklyMenuId}`)
      if (menuDetailResponse.ok) {
        const menuDetail = await menuDetailResponse.json()
        
        // Obtener pedidos existentes para esta semana (si existen)
        const ordersResponse = await fetch(`/api/orders?user_id=${userId}`)
        let orders: any[] = []
        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json()
          orders = Array.isArray(ordersData) ? ordersData : (ordersData.orders || [])
        }

        // Construir pedidos programados desde el menú
        const scheduled: ScheduledOrder[] = []
        
        if (menuDetail.days) {
          for (const day of menuDetail.days) {
            // Solo procesar días laborables (lunes a viernes, day_number 1-5)
            // Sábado y domingo no tienen entregas porque el local cierra
            if (day.day_number && (day.day_number < 1 || day.day_number > 5)) {
              continue // Saltar sábado (6) y domingo (7)
            }

            const dayDate = new Date(day.date)
            const now = new Date()
            const hoursUntilDelivery = (dayDate.getTime() - now.getTime()) / (1000 * 60 * 60)
            
            // Puede modificar hasta 1 hora antes
            const canModify = hoursUntilDelivery > 1
            
            // Buscar si ya existe un pedido para este día
            const existingOrder = orders.find((o: any) => {
              const orderDate = o.created_at ? new Date(o.created_at).toISOString().split('T')[0] : null
              return orderDate === day.date
            })

            // Filtrar comidas según meals_per_day
            let mealsToShow = day.meals || []
            if (subscriptionInfo && subscriptionInfo.meals_per_day === 1) {
              // Si solo tiene 1 comida por día, usar la preferencia del plan de comidas
              // Filtrar solo lunch y dinner
              const lunchDinnerMeals = mealsToShow.filter((m: any) => {
                const mealType = m.meal_type || m.type
                return mealType === 'lunch' || mealType === 'dinner'
              })

              const normalizedMeals =
                lunchDinnerMeals.length > 0
                  ? lunchDinnerMeals
                  : mealsToShow.length > 0
                    ? [
                        {
                          ...mealsToShow[0],
                          meal_type: 'lunch',
                          type: 'lunch',
                        },
                      ]
                    : []
              
              // Obtener la preferencia del plan usando day_number
              let preferredMealType: 'lunch' | 'dinner' | null = null
              
              // Mapear day_number del menú semanal a meal_plan_day_id
              const dayNumber = day.day_number
              const mealPlanDayId = mealPlanDayMapping[dayNumber]
              
              if (mealPlanDayId && mealPlanPreferences[mealPlanDayId]) {
                preferredMealType = mealPlanPreferences[mealPlanDayId]
              }
              
              const lunchMeals = normalizedMeals.filter((m: any) => (m.meal_type || m.type) === 'lunch')
              const dinnerMeals = normalizedMeals.filter((m: any) => (m.meal_type || m.type) === 'dinner')
              
              // Si hay preferencia guardada, usarla; sino, usar lunch por defecto
              if (preferredMealType === 'dinner' && dinnerMeals.length > 0) {
                mealsToShow = [dinnerMeals[0]]
              } else if (preferredMealType === 'lunch' && lunchMeals.length > 0) {
                mealsToShow = [lunchMeals[0]]
              } else if (lunchMeals.length > 0) {
                // Por defecto, usar lunch si existe
                mealsToShow = [lunchMeals[0]]
              } else if (dinnerMeals.length > 0) {
                mealsToShow = [dinnerMeals[0]]
              } else {
                mealsToShow = normalizedMeals.slice(0, 1)
              }
            } else if (subscriptionInfo && subscriptionInfo.meals_per_day === 2) {
              // Si tiene 2 comidas por día, mostrar AMBAS: lunch y dinner
              mealsToShow = mealsToShow.filter((m: any) => {
                const mealType = m.meal_type || m.type
                return mealType === 'lunch' || mealType === 'dinner'
              })
              // Asegurar que haya máximo 1 lunch y 1 dinner
              const lunchMeals = mealsToShow.filter((m: any) => (m.meal_type || m.type) === 'lunch')
              const dinnerMeals = mealsToShow.filter((m: any) => (m.meal_type || m.type) === 'dinner')
              mealsToShow = [
                ...(lunchMeals.length > 0 ? [lunchMeals[0]] : []),
                ...(dinnerMeals.length > 0 ? [dinnerMeals[0]] : [])
              ]
            }

            const orderMealSettings = (existingOrder?.meal_settings || []) as any[]

            const mealsWithConfig = mealsToShow.map((m: any) => {
              const mealType = m.meal_type || m.type
              const mealId = m.id || m.meal_id
              const defaultTime = mealType === 'dinner' ? '20:00' : '14:00'

              const matchedSetting = orderMealSettings.find((setting: any) => {
                if (setting.meal_id && mealId) {
                  return setting.meal_id === mealId
                }
                return !setting.meal_id && setting.meal_type === mealType
              })

              const deliveryMode = matchedSetting?.delivery_mode || existingOrder?.delivery_mode || 'delivery'
              const deliveryAddressId =
                deliveryMode === 'delivery'
                  ? matchedSetting?.delivery_address_id || existingOrder?.delivery_address_id || undefined
                  : undefined
              const pickupLocation =
                deliveryMode === 'pickup'
                  ? matchedSetting?.pickup_location || existingOrder?.pickup_location || ''
                  : undefined
              const deliveryTime = matchedSetting?.delivery_time
                ? matchedSetting.delivery_time.slice(0, 5)
                : defaultTime

              return {
                id: mealId,
                name: m.name || 'Comida',
                type: m.type || m.meal_type,
                meal_type: m.meal_type || m.type,
                delivery_mode: deliveryMode,
                delivery_address_id: deliveryAddressId,
                pickup_location: pickupLocation,
                delivery_time: deliveryTime,
              }
            })

            scheduled.push({
              id: existingOrder?.id,
              date: day.date,
              dayName: day.day_name,
              meals: mealsWithConfig,
              can_modify: canModify,
              modification_deadline: new Date(dayDate.getTime() - 60 * 60 * 1000).toISOString(),
            })
          }
        }

        setScheduledOrders(scheduled)
      }
    } catch (error) {
      console.error('Error loading scheduled orders:', error)
    }
  }


  // Cambiar modo de entrega por comida individual
  const handleMealDeliveryModeChange = (orderIndex: number, mealIndex: number, mode: 'delivery' | 'pickup') => {
    const order = scheduledOrders[orderIndex]
    if (!order.can_modify) {
      setError('No puedes modificar este pedido. El plazo de modificación ha expirado.')
      return
    }

    const updated = [...scheduledOrders]
    updated[orderIndex] = {
      ...order,
      meals: order.meals.map((meal, idx) => {
        if (idx === mealIndex) {
          return {
            ...meal,
            delivery_mode: mode,
            delivery_address_id: mode === 'delivery' ? (addresses[0]?.id || '') : undefined,
            pickup_location: mode === 'pickup' ? '' : undefined,
          }
        }
        return meal
      }),
    }
    setScheduledOrders(updated)
  }

  // Cambiar dirección por comida individual
  const handleMealAddressChange = (orderIndex: number, mealIndex: number, addressId: string) => {
    const order = scheduledOrders[orderIndex]
    if (!order.can_modify) {
      setError('No puedes modificar este pedido. El plazo de modificación ha expirado.')
      return
    }

    const updated = [...scheduledOrders]
    updated[orderIndex] = {
      ...order,
      meals: order.meals.map((meal, idx) => {
        if (idx === mealIndex) {
          return {
            ...meal,
            delivery_address_id: addressId,
          }
        }
        return meal
      }),
    }
    setScheduledOrders(updated)
  }

  // Cambiar ubicación de recogida por comida individual
  const handleMealPickupLocationChange = (orderIndex: number, mealIndex: number, location: string) => {
    const order = scheduledOrders[orderIndex]
    if (!order.can_modify) {
      setError('No puedes modificar este pedido. El plazo de modificación ha expirado.')
      return
    }

    const updated = [...scheduledOrders]
    updated[orderIndex] = {
      ...order,
      meals: order.meals.map((meal, idx) => {
        if (idx === mealIndex) {
          return {
            ...meal,
            pickup_location: location,
          }
        }
        return meal
      }),
    }
    setScheduledOrders(updated)
  }

  // Cambiar hora de entrega por comida individual
  const handleMealDeliveryTimeChange = (orderIndex: number, mealIndex: number, time: string) => {
    const order = scheduledOrders[orderIndex]
    if (!order.can_modify) {
      setError('No puedes modificar este pedido. El plazo de modificación ha expirado.')
      return
    }

    const meal = order.meals[mealIndex]
    const mealType = meal.meal_type || meal.type
    const hour = parseInt(time.split(':')[0])

    // Validar rango de horas
    if (mealType === 'lunch' && (hour < 12 || hour > 16)) {
      setError('La hora de entrega para el almuerzo debe estar entre las 12:00 y las 16:00')
      return
    }
    if (mealType === 'dinner' && (hour < 19 || hour > 23)) {
      setError('La hora de entrega para la cena debe estar entre las 19:00 y las 23:00')
      return
    }

    const updated = [...scheduledOrders]
    updated[orderIndex] = {
      ...order,
      meals: order.meals.map((m, idx) => {
        if (idx === mealIndex) {
          return {
            ...m,
            delivery_time: time,
          }
        }
        return m
      }),
    }
    setScheduledOrders(updated)
    setError(null)
  }

  const handleSaveOrder = async (orderIndex: number) => {
    const order = scheduledOrders[orderIndex]
    
    if (!order.can_modify) {
      setError('No puedes modificar este pedido. El plazo de modificación ha expirado.')
      return
    }

    // Validar todas las comidas
    const mealsToSave = order.meals.filter((m) => {
      const mealType = m.meal_type || m.type
      return mealType === 'lunch' || mealType === 'dinner'
    })

    for (const meal of mealsToSave) {
      if (meal.delivery_mode === 'delivery' && !meal.delivery_address_id) {
        setError(`Debes seleccionar una dirección de entrega para ${getMealTypeText(meal.meal_type || meal.type)}`)
        return
      }

      if (meal.delivery_mode === 'pickup' && !meal.pickup_location?.trim()) {
        setError(`Debes especificar una ubicación de recogida para ${getMealTypeText(meal.meal_type || meal.type)}`)
        return
      }

      if (!meal.delivery_time) {
        setError(`Debes especificar una hora de entrega para ${getMealTypeText(meal.meal_type || meal.type)}`)
        return
      }

      // Validar rango de horas
      const hour = parseInt(meal.delivery_time.split(':')[0])
      const mealType = meal.meal_type || meal.type
      if (mealType === 'lunch' && (hour < 12 || hour > 16)) {
        setError('La hora de entrega para el almuerzo debe estar entre las 12:00 y las 16:00')
        return
      }
      if (mealType === 'dinner' && (hour < 19 || hour > 23)) {
        setError('La hora de entrega para la cena debe estar entre las 19:00 y las 23:00')
        return
      }
    }

    if (mealsToSave.length === 0) {
      setError('No hay comidas configuradas para guardar')
      return
    }

    setSaving(order.date)
    setError(null)

    try {
      const mealsPayload = mealsToSave.map((meal) => {
        const mealId = meal.id || ('meal_id' in meal ? meal.meal_id : undefined)
        if (!mealId) {
          throw new Error('No se pudo identificar una de las comidas del pedido')
        }
        const normalizedType = (meal.meal_type || meal.type) === 'dinner' ? 'dinner' : 'lunch'
        return {
          meal_id: mealId,
          meal_type: normalizedType,
          delivery_mode: meal.delivery_mode,
          delivery_address_id: meal.delivery_mode === 'delivery' ? meal.delivery_address_id || null : null,
          pickup_location: meal.delivery_mode === 'pickup' ? (meal.pickup_location || '').trim() || null : null,
          delivery_time: meal.delivery_time,
          scheduled_date: order.date,
        }
      })

      const baseMeal = mealsPayload[0]
      let responseData: any = null

      if (order.id) {
        const response = await fetch(`/api/orders/${order.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meal_settings: mealsPayload }),
        })

        if (!response.ok) {
          throw new Error('Error al actualizar el pedido')
        }

        responseData = await response.json()
      } else {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            total_amount: 0,
            delivery_mode: baseMeal?.delivery_mode,
            delivery_address_id:
              baseMeal?.delivery_mode === 'delivery' ? baseMeal?.delivery_address_id : undefined,
            pickup_location: baseMeal?.delivery_mode === 'pickup' ? baseMeal?.pickup_location : undefined,
            meal_settings: mealsPayload,
          }),
        })

        if (!response.ok) {
          throw new Error('Error al crear el pedido')
        }

        responseData = await response.json()
      }

      const updatedOrderData = responseData?.order
      const updatedMealSettings = updatedOrderData?.meal_settings || []

      setScheduledOrders((prev) => {
        const next = [...prev]
        next[orderIndex] = {
          ...next[orderIndex],
          id: updatedOrderData?.id || next[orderIndex].id,
          meals: next[orderIndex].meals.map((meal) => {
            const mealId = meal.id || ('meal_id' in meal ? meal.meal_id : undefined)
            const setting = updatedMealSettings.find((s: any) => s.meal_id === mealId)
            if (!setting) {
              return meal
            }
            const normalizedTime = setting.delivery_time ? setting.delivery_time.slice(0, 5) : meal.delivery_time
            return {
              ...meal,
              delivery_mode: setting.delivery_mode,
              delivery_address_id:
                setting.delivery_mode === 'delivery'
                  ? setting.delivery_address_id || meal.delivery_address_id
                  : undefined,
              pickup_location:
                setting.delivery_mode === 'pickup'
                  ? setting.pickup_location || meal.pickup_location || ''
                  : undefined,
              delivery_time: normalizedTime,
            }
          }),
        }
        return next
      })

      setSuccess(`Configuración guardada para ${order.dayName}`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error saving order:', error)
      setError(error.message || 'Error al guardar la configuración')
    } finally {
      setSaving(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getMealTypeText = (type: string) => {
    return type === 'lunch' ? 'Almuerzo' : type === 'dinner' ? 'Cena' : type
  }

  const getTimeUntilDeadline = (deadline: string) => {
    const now = new Date()
    const deadlineDate = new Date(deadline)
    const hours = Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60))
    
    if (hours < 0) return 'Expirado'
    if (hours < 1) return `${Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60))} minutos`
    return `${hours} hora${hours !== 1 ? 's' : ''}`
  }

  // Componente para configuración de entrega por comida
  const MealDeliveryConfig = ({
    order,
    orderIndex,
    mealIndex,
    addresses,
    router,
    canModify,
    onDeliveryModeChange,
    onAddressChange,
    onPickupLocationChange,
    onDeliveryTimeChange,
    onSave,
    saving,
  }: {
    order: ScheduledOrder
    orderIndex: number
    mealIndex: number
    addresses: DeliveryAddress[]
    router: any
    canModify: boolean
    onDeliveryModeChange: (orderIndex: number, mealIndex: number, mode: 'delivery' | 'pickup') => void
    onAddressChange: (orderIndex: number, mealIndex: number, addressId: string) => void
    onPickupLocationChange: (orderIndex: number, mealIndex: number, location: string) => void
    onDeliveryTimeChange: (orderIndex: number, mealIndex: number, time: string) => void
    onSave: () => void
    saving: boolean
  }) => {
    const meal = order.meals[mealIndex]
    if (!meal) return null

    const mealType = meal.meal_type || meal.type
    const isLunch = mealType === 'lunch'
    const minHour = isLunch ? 12 : 19
    const maxHour = isLunch ? 16 : 23

    // Validar si puede guardar
    const canSave = meal.delivery_mode === 'delivery' 
      ? meal.delivery_address_id 
      : meal.pickup_location?.trim()

    return (
      <div className="space-y-4">
        {/* Método de entrega */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Método de Entrega
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onDeliveryModeChange(orderIndex, mealIndex, 'delivery')}
              disabled={!canModify}
              className={`p-4 rounded-lg border-2 transition-all ${
                meal.delivery_mode === 'delivery'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              } ${!canModify ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex flex-col items-center gap-2">
                <span className="text-2xl">🚚</span>
                <span className="font-medium text-gray-900 text-sm">Delivery</span>
              </div>
            </button>
            <button
              onClick={() => onDeliveryModeChange(orderIndex, mealIndex, 'pickup')}
              disabled={!canModify}
              className={`p-4 rounded-lg border-2 transition-all ${
                meal.delivery_mode === 'pickup'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              } ${!canModify ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex flex-col items-center gap-2">
                <span className="text-2xl">📦</span>
                <span className="font-medium text-gray-900 text-sm">Pickup</span>
              </div>
            </button>
          </div>
        </div>

        {/* Hora de entrega */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hora de Entrega {canModify && <span className="text-red-500 ml-1">*</span>}
            <span className="text-xs text-gray-500 ml-2">({minHour}:00 - {maxHour}:00)</span>
          </label>
          <input
            type="time"
            value={meal.delivery_time || ''}
            onChange={(e) => onDeliveryTimeChange(orderIndex, mealIndex, e.target.value)}
            disabled={!canModify}
            min={`${minHour.toString().padStart(2, '0')}:00`}
            max={`${maxHour.toString().padStart(2, '0')}:59`}
            className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
              !canModify ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''
            }`}
          />
        </div>

        {/* Dirección de entrega */}
        {meal.delivery_mode === 'delivery' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección de Entrega
              {canModify && <span className="text-red-500 ml-1">*</span>}
            </label>
            {addresses.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 mb-2">
                  No tienes direcciones registradas.{' '}
                  <button
                    onClick={() => router.push('/suscriptor/direcciones')}
                    className="underline font-medium"
                  >
                    Agregar dirección
                  </button>
                </p>
              </div>
            ) : (
              <select
                value={meal.delivery_address_id || ''}
                onChange={(e) => onAddressChange(orderIndex, mealIndex, e.target.value)}
                disabled={!canModify}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                  !canModify ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''
                }`}
              >
                <option value="">Seleccionar dirección</option>
                {addresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.address_line1}
                    {address.address_line2 && `, ${address.address_line2}`}
                    {address.is_primary && ' (Principal)'}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Ubicación de recogida */}
        {meal.delivery_mode === 'pickup' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ubicación de Recogida
              {canModify && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={meal.pickup_location || ''}
              onChange={(e) => onPickupLocationChange(orderIndex, mealIndex, e.target.value)}
              disabled={!canModify}
              placeholder="Ej: Local Zona Azul - Calle Principal 123"
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                !canModify ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''
              }`}
            />
          </div>
        )}

        {/* Botón guardar */}
        {canModify && (
          <button
            onClick={onSave}
            disabled={saving || !canSave}
            className={`w-full px-4 py-2 rounded-lg font-medium transition ${
              saving || !canSave
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary/90'
            }`}
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando pedidos programados...</p>
        </div>
      </div>
    )
  }

  if (!currentWeekMenu || scheduledOrders.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 sm:p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">No hay pedidos programados</h2>
            <p className="text-gray-600 mb-6">
              Los pedidos se generan automáticamente según tu plan de comidas. 
              Cuando tengas un menú semanal activo, podrás configurar el método de entrega aquí.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ Información:</strong> Los pedidos se crean automáticamente basados en tu plan 
                (1 comida, 1 cena, o ambas según corresponda). Puedes cambiar el método de entrega 
                hasta 1 hora antes de la fecha programada.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
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
        title="Configurar Método de Entrega"
        description="Los pedidos se generan automáticamente según tu plan. Puedes cambiar el método de entrega hasta 1 hora antes."
      />

      {/* Información importante */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Recordatorio importante:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Los pedidos se generan automáticamente según tu plan (1 comida, 1 cena, o ambas)</li>
              <li>Las entregas solo están disponibles de <strong>lunes a viernes</strong> (sábado y domingo el local cierra)</li>
              <li>Puedes cambiar el método de entrega hasta 1 hora antes de la fecha programada</li>
              <li>Si eliges delivery, asegúrate de tener una dirección configurada</li>
              <li>Horarios de entrega: Almuerzo (12:00-16:00), Cena (19:00-23:00)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Lista de pedidos programados */}
      <div className="space-y-4">
        {scheduledOrders.map((order, index) => (
          <div
            key={order.date}
            className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6"
          >
            {/* Header del día */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 capitalize">
                  {order.dayName}
                </h3>
                <p className="text-sm text-gray-600">{formatDate(order.date)}</p>
              </div>
              <div className="flex items-center gap-2">
                {order.can_modify ? (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    ✓ Modificable (hasta {getTimeUntilDeadline(order.modification_deadline)})
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                    ✗ No modificable (plazo expirado)
                  </span>
                )}
              </div>
            </div>

            {/* Configuración de entrega por comida */}
            {subscription && subscription.meals_per_day === 1 ? (
              // Si solo tiene 1 comida por día, mostrar la comida seleccionada en el plan de comidas
              // La selección se hace en el apartado de "Plan de Comidas", no aquí
              order.meals.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800">
                      <strong>ℹ️ Nota:</strong> La selección entre almuerzo o cena se realiza en el apartado de <strong>"Plan de Comidas"</strong>.
                      Aquí solo puedes configurar el método y hora de entrega.
                    </p>
                  </div>
                  <MealDeliveryConfig
                    order={order}
                    orderIndex={index}
                    mealIndex={0}
                    addresses={addresses}
                    router={router}
                    canModify={order.can_modify}
                    onDeliveryModeChange={handleMealDeliveryModeChange}
                    onAddressChange={handleMealAddressChange}
                    onPickupLocationChange={handleMealPickupLocationChange}
                    onDeliveryTimeChange={handleMealDeliveryTimeChange}
                    onSave={() => handleSaveOrder(index)}
                    saving={saving === order.date}
                  />
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    No hay comida configurada para este día. Por favor, selecciona tu comida en el apartado de <strong>"Plan de Comidas"</strong>.
                  </p>
                </div>
              )
            ) : (
              // Si tiene 2 comidas por día, mostrar configuración para cada una (almuerzo y cena)
              <div className="space-y-6">
                {order.meals
                  .filter((meal) => {
                    const mealType = meal.meal_type || meal.type
                    return mealType === 'lunch' || mealType === 'dinner'
                  })
                  .sort((a, b) => {
                    // Ordenar: lunch primero, luego dinner
                    const typeA = a.meal_type || a.type
                    const typeB = b.meal_type || b.type
                    if (typeA === 'lunch' && typeB === 'dinner') return -1
                    if (typeA === 'dinner' && typeB === 'lunch') return 1
                    return 0
                  })
                  .map((meal, mealIndex) => {
                    const actualIndex = order.meals.findIndex((m) => m.id === meal.id)
                    return (
                      <div key={meal.id || mealIndex} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-gray-50 dark:bg-slate-800/50">
                        <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
                          {getMealTypeText(meal.meal_type || meal.type)}: {meal.name}
                        </h4>
                        <MealDeliveryConfig
                          order={order}
                          orderIndex={index}
                          mealIndex={actualIndex}
                          addresses={addresses}
                          router={router}
                          canModify={order.can_modify}
                          onDeliveryModeChange={handleMealDeliveryModeChange}
                          onAddressChange={handleMealAddressChange}
                          onPickupLocationChange={handleMealPickupLocationChange}
                          onDeliveryTimeChange={handleMealDeliveryTimeChange}
                          onSave={() => handleSaveOrder(index)}
                          saving={saving === order.date}
                        />
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
