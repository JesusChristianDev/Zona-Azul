'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import type { DeliveryAddress, WeeklyMenu, WeeklyMenuDay } from '@/lib/types'

interface ScheduledOrder {
  id?: string
  date: string
  dayName: string
  meals: Array<{
    id: string
    name: string
    type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    meal_type: string
  }>
  delivery_mode: 'delivery' | 'pickup'
  delivery_address_id?: string
  pickup_location?: string
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
      // Cargar menú semanal actual
      const menuResponse = await fetch(`/api/weekly-menus?user_id=${userId}`)
      if (menuResponse.ok) {
        const menus = await menuResponse.json()
        // Obtener el menú de la semana actual o próxima
        const today = new Date()
        const currentMenu = menus.find((m: WeeklyMenu) => {
          const weekStart = new Date(m.week_start_date)
          const weekEnd = new Date(m.week_end_date)
          return today >= weekStart && today <= weekEnd
        }) || menus[0] // Si no hay de esta semana, tomar el primero

        if (currentMenu) {
          setCurrentWeekMenu(currentMenu)
          await loadScheduledOrders(currentMenu.id)
        }
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

  const loadScheduledOrders = async (weeklyMenuId: string) => {
    try {
      // Obtener detalles del menú semanal con días y comidas
      const menuDetailResponse = await fetch(`/api/weekly-menus/${weeklyMenuId}`)
      if (menuDetailResponse.ok) {
        const menuDetail = await menuDetailResponse.json()
        
        // Obtener pedidos existentes para esta semana (si existen)
        const ordersResponse = await fetch(`/api/orders?user_id=${userId}`)
        const orders = ordersResponse.ok ? await ordersResponse.json() : []

        // Construir pedidos programados desde el menú
        const scheduled: ScheduledOrder[] = []
        
        if (menuDetail.days) {
          for (const day of menuDetail.days) {
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

            scheduled.push({
              id: existingOrder?.id,
              date: day.date,
              dayName: day.day_name,
              meals: (day.meals || []).map((m: any) => ({
              id: m.id || m.meal_id,
              name: m.name || 'Comida',
              type: m.type || m.meal_type,
              meal_type: m.meal_type || m.type,
            })),
              delivery_mode: existingOrder?.delivery_mode || 'delivery',
              delivery_address_id: existingOrder?.delivery_address_id,
              pickup_location: existingOrder?.pickup_location,
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

  const handleDeliveryModeChange = async (orderIndex: number, mode: 'delivery' | 'pickup') => {
    const order = scheduledOrders[orderIndex]
    if (!order.can_modify) {
      setError('No puedes modificar este pedido. El plazo de modificación ha expirado (1 hora antes de la entrega).')
      return
    }

    const updated = [...scheduledOrders]
    updated[orderIndex] = {
      ...order,
      delivery_mode: mode,
      delivery_address_id: mode === 'delivery' ? (addresses[0]?.id || '') : undefined,
      pickup_location: mode === 'pickup' ? '' : undefined,
    }
    setScheduledOrders(updated)
  }

  const handleAddressChange = (orderIndex: number, addressId: string) => {
    const order = scheduledOrders[orderIndex]
    if (!order.can_modify) {
      setError('No puedes modificar este pedido. El plazo de modificación ha expirado.')
      return
    }

    const updated = [...scheduledOrders]
    updated[orderIndex] = {
      ...order,
      delivery_address_id: addressId,
    }
    setScheduledOrders(updated)
  }

  const handlePickupLocationChange = (orderIndex: number, location: string) => {
    const order = scheduledOrders[orderIndex]
    if (!order.can_modify) {
      setError('No puedes modificar este pedido. El plazo de modificación ha expirado.')
      return
    }

    const updated = [...scheduledOrders]
    updated[orderIndex] = {
      ...order,
      pickup_location: location,
    }
    setScheduledOrders(updated)
  }

  const handleSaveOrder = async (orderIndex: number) => {
    const order = scheduledOrders[orderIndex]
    
    if (!order.can_modify) {
      setError('No puedes modificar este pedido. El plazo de modificación ha expirado.')
      return
    }

    if (order.delivery_mode === 'delivery' && !order.delivery_address_id) {
      setError('Debes seleccionar una dirección de entrega')
      return
    }

    if (order.delivery_mode === 'pickup' && !order.pickup_location?.trim()) {
      setError('Debes especificar una ubicación de recogida')
      return
    }

    setSaving(order.date)
    setError(null)

    try {
      if (order.id) {
        // Actualizar pedido existente
        const response = await fetch(`/api/orders/${order.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            delivery_mode: order.delivery_mode,
            delivery_address_id: order.delivery_mode === 'delivery' ? order.delivery_address_id : null,
            pickup_location: order.delivery_mode === 'pickup' ? order.pickup_location : null,
          }),
        })

        if (!response.ok) {
          throw new Error('Error al actualizar el pedido')
        }
      } else {
        // Crear nuevo pedido (aunque normalmente deberían existir)
        // Esto es un fallback por si acaso
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            total_amount: 0, // Se calculará automáticamente
            delivery_mode: order.delivery_mode,
            delivery_address_id: order.delivery_mode === 'delivery' ? order.delivery_address_id : undefined,
            pickup_location: order.delivery_mode === 'pickup' ? order.pickup_location : undefined,
            scheduled_date: order.date,
          }),
        })

        if (!response.ok) {
          throw new Error('Error al crear el pedido')
        }
      }

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
    const types: Record<string, string> = {
      breakfast: 'Desayuno',
      lunch: 'Almuerzo',
      dinner: 'Cena',
      snack: 'Snack',
    }
    return types[type] || type
  }

  const getTimeUntilDeadline = (deadline: string) => {
    const now = new Date()
    const deadlineDate = new Date(deadline)
    const hours = Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60))
    
    if (hours < 0) return 'Expirado'
    if (hours < 1) return `${Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60))} minutos`
    return `${hours} hora${hours !== 1 ? 's' : ''}`
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
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Configurar Método de Entrega</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">
          Los pedidos se generan automáticamente según tu plan. Puedes cambiar el método de entrega hasta 1 hora antes.
        </p>
      </header>

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
              <li>Puedes cambiar el método de entrega hasta 1 hora antes de la fecha programada</li>
              <li>Si eliges delivery, asegúrate de tener una dirección configurada</li>
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

            {/* Comidas programadas */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Comidas incluidas:</p>
              <div className="flex flex-wrap gap-2">
                {order.meals.map((meal, mealIndex) => (
                  <span
                    key={mealIndex}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm"
                  >
                    {getMealTypeText(meal.meal_type || meal.type)}: {meal.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Configuración de entrega */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Método de Entrega
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleDeliveryModeChange(index, 'delivery')}
                    disabled={!order.can_modify}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      order.delivery_mode === 'delivery'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${!order.can_modify ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-2xl">🚚</span>
                      <span className="font-medium text-gray-900 text-sm">Delivery</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleDeliveryModeChange(index, 'pickup')}
                    disabled={!order.can_modify}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      order.delivery_mode === 'pickup'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${!order.can_modify ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-2xl">📦</span>
                      <span className="font-medium text-gray-900 text-sm">Pickup</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Dirección de entrega */}
              {order.delivery_mode === 'delivery' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección de Entrega
                    {order.can_modify && <span className="text-red-500 ml-1">*</span>}
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
                      value={order.delivery_address_id || ''}
                      onChange={(e) => handleAddressChange(index, e.target.value)}
                      disabled={!order.can_modify}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                        !order.can_modify ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''
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
              {order.delivery_mode === 'pickup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ubicación de Recogida
                    {order.can_modify && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type="text"
                    value={order.pickup_location || ''}
                    onChange={(e) => handlePickupLocationChange(index, e.target.value)}
                    disabled={!order.can_modify}
                    placeholder="Ej: Local Zona Azul - Calle Principal 123"
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                      !order.can_modify ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''
                    }`}
                  />
                </div>
              )}

              {/* Botón guardar */}
              {order.can_modify && (
                <button
                  onClick={() => handleSaveOrder(index)}
                  disabled={!!saving || (order.delivery_mode === 'delivery' && !order.delivery_address_id) || (order.delivery_mode === 'pickup' && !order.pickup_location?.trim())}
                  className={`w-full px-4 py-2 rounded-lg font-medium transition ${
                    saving === order.date || (order.delivery_mode === 'delivery' && !order.delivery_address_id) || (order.delivery_mode === 'pickup' && !order.pickup_location?.trim())
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-primary/90'
                  }`}
                >
                  {saving === order.date ? 'Guardando...' : 'Guardar Configuración'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
