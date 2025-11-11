"use client"
import { useState, useEffect, useMemo } from 'react'
import { getCalendarAvailability, getNutritionistScheduleById } from '../../lib/api'
import { availableSlots as fallbackSlots } from '../../lib/mockData'

interface AvailableSlotsProps {
  onSelect: (slotId: string) => void
  selectedSlot?: string | null
  nutricionistaId?: string
}

interface Slot {
  id: string
  label: string
  dateTime: string
  available: boolean
}

interface Schedule {
  monday_start_hour: number
  monday_end_hour: number
  monday_enabled: boolean
  tuesday_start_hour: number
  tuesday_end_hour: number
  tuesday_enabled: boolean
  wednesday_start_hour: number
  wednesday_end_hour: number
  wednesday_enabled: boolean
  thursday_start_hour: number
  thursday_end_hour: number
  thursday_enabled: boolean
  friday_start_hour: number
  friday_end_hour: number
  friday_enabled: boolean
  saturday_start_hour: number | null
  saturday_end_hour: number | null
  saturday_enabled: boolean
  sunday_start_hour: number | null
  sunday_end_hour: number | null
  sunday_enabled: boolean
  slot_duration_minutes: number
}

export default function AvailableSlots({ onSelect, selectedSlot, nutricionistaId }: AvailableSlotsProps) {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // Cargar horarios del nutricionista
  useEffect(() => {
    const loadSchedule = async () => {
      if (nutricionistaId) {
        try {
          const nutritionistSchedule = await getNutritionistScheduleById(nutricionistaId)
          setSchedule(nutritionistSchedule)
        } catch (error) {
          console.error('Error loading schedule:', error)
          // Usar valores por defecto si hay error
          setSchedule({
            monday_start_hour: 9,
            monday_end_hour: 18,
            monday_enabled: true,
            tuesday_start_hour: 9,
            tuesday_end_hour: 18,
            tuesday_enabled: true,
            wednesday_start_hour: 9,
            wednesday_end_hour: 18,
            wednesday_enabled: true,
            thursday_start_hour: 9,
            thursday_end_hour: 18,
            thursday_enabled: true,
            friday_start_hour: 9,
            friday_end_hour: 18,
            friday_enabled: true,
            saturday_start_hour: null,
            saturday_end_hour: null,
            saturday_enabled: false,
            sunday_start_hour: null,
            sunday_end_hour: null,
            sunday_enabled: false,
            slot_duration_minutes: 60,
          })
        }
      } else {
        // Valores por defecto si no hay nutricionista
        setSchedule({
          monday_start_hour: 9,
          monday_end_hour: 18,
          monday_enabled: true,
          tuesday_start_hour: 9,
          tuesday_end_hour: 18,
          tuesday_enabled: true,
          wednesday_start_hour: 9,
          wednesday_end_hour: 18,
          wednesday_enabled: true,
          thursday_start_hour: 9,
          thursday_end_hour: 18,
          thursday_enabled: true,
          friday_start_hour: 9,
          friday_end_hour: 18,
          friday_enabled: true,
          saturday_start_hour: null,
          saturday_end_hour: null,
          saturday_enabled: false,
          sunday_start_hour: null,
          sunday_end_hour: null,
          sunday_enabled: false,
          slot_duration_minutes: 60,
        })
      }
    }
    loadSchedule()
  }, [nutricionistaId])

  // Generar slots disponibles para las próximas 2 semanas
  const generateAvailableSlots = (busyTimes: Array<{ start: string; end: string }> = [], scheduleData: Schedule | null): Slot[] => {
    if (!scheduleData) return []
    
    const slots: Slot[] = []
    const now = new Date()
    const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    const slotDuration = scheduleData.slot_duration_minutes || 60
    
    // Mapeo de días de la semana (0=domingo, 1=lunes, ..., 6=sábado) a nombres de campos
    const dayConfig = [
      { name: 'sunday', enabled: scheduleData.sunday_enabled, start: scheduleData.sunday_start_hour, end: scheduleData.sunday_end_hour },
      { name: 'monday', enabled: scheduleData.monday_enabled, start: scheduleData.monday_start_hour, end: scheduleData.monday_end_hour },
      { name: 'tuesday', enabled: scheduleData.tuesday_enabled, start: scheduleData.tuesday_start_hour, end: scheduleData.tuesday_end_hour },
      { name: 'wednesday', enabled: scheduleData.wednesday_enabled, start: scheduleData.wednesday_start_hour, end: scheduleData.wednesday_end_hour },
      { name: 'thursday', enabled: scheduleData.thursday_enabled, start: scheduleData.thursday_start_hour, end: scheduleData.thursday_end_hour },
      { name: 'friday', enabled: scheduleData.friday_enabled, start: scheduleData.friday_start_hour, end: scheduleData.friday_end_hour },
      { name: 'saturday', enabled: scheduleData.saturday_enabled, start: scheduleData.saturday_start_hour, end: scheduleData.saturday_end_hour },
    ]
    
    let currentDate = new Date(now)
    let slotIndex = 1
    
    while (currentDate <= twoWeeksLater) {
      const dayOfWeek = currentDate.getDay() // 0 = domingo, 1 = lunes, ..., 6 = sábado
      const day = dayConfig[dayOfWeek]
      
      // Solo procesar días habilitados
      if (day.enabled && day.start !== null && day.end !== null) {
        // Generar slots cada hora (o según slot_duration_minutes)
        const hours: number[] = []
        for (let hour = day.start; hour < day.end; hour++) {
          hours.push(hour)
        }
        
        for (const hour of hours) {
          const slotDateTime = new Date(currentDate)
          slotDateTime.setHours(hour, 0, 0, 0)
          
          // Solo mostrar slots futuros
          if (slotDateTime > now) {
            // Verificar si el slot está ocupado
            const slotEnd = new Date(slotDateTime)
            slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration)
            
            const isBusy = busyTimes.some(busy => {
              const busyStart = new Date(busy.start)
              const busyEnd = new Date(busy.end)
              // Verificar si hay solapamiento
              return (slotDateTime < busyEnd && slotEnd > busyStart)
            })
            
            const slotId = `slot_${slotIndex}`
            const formattedDate = slotDateTime.toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })
            const formattedTime = slotDateTime.toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
            })
            
            slots.push({
              id: slotId,
              label: `${formattedDate} a las ${formattedTime}`,
              dateTime: slotDateTime.toISOString(),
              available: !isBusy,
            })
            
            slotIndex++
          }
        }
      }
      
      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1)
      currentDate.setHours(0, 0, 0, 0)
    }
    
    // Retornar todos los slots disponibles (sin límite, se agruparán por día)
    return slots.filter(s => s.available)
  }

  // Agrupar slots por día
  const groupSlotsByDay = (slots: Slot[]) => {
    const grouped: { [key: string]: Slot[] } = {}
    
    slots.forEach(slot => {
      const date = new Date(slot.dateTime)
      const dateKey = date.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long',
        year: 'numeric'
      })
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(slot)
    })
    
    return grouped
  }

  useEffect(() => {
    const loadSlots = async () => {
      if (!schedule) {
        setLoading(true)
        return // Esperar a que se cargue el schedule
      }
      
      setLoading(true)
      
      try {
        if (nutricionistaId) {
          // Obtener disponibilidad del calendario
          const now = new Date()
          const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
          
          let busyTimes: Array<{ start: string; end: string }> = []
          try {
            busyTimes = await getCalendarAvailability(
              nutricionistaId,
              now.toISOString(),
              twoWeeksLater.toISOString()
            )
          } catch (error) {
            console.warn('Error loading calendar availability (using schedule only):', error)
            // Continuar sin disponibilidad del calendario, solo usar horarios configurados
          }
          
          const generatedSlots = generateAvailableSlots(busyTimes, schedule)
          setSlots(generatedSlots)
        } else {
          // Si no hay nutricionista específico, usar slots de fallback
          const fallback = fallbackSlots.map((s, idx) => ({
            id: s.id,
            label: s.label,
            dateTime: new Date().toISOString(), // Placeholder
            available: true,
          }))
          setSlots(fallback)
        }
      } catch (error) {
        console.error('Error loading slots:', error)
        // Usar slots de fallback en caso de error
        const fallback = fallbackSlots.map((s) => ({
          id: s.id,
          label: s.label,
          dateTime: new Date().toISOString(),
          available: true,
        }))
        setSlots(fallback)
      } finally {
        setLoading(false)
      }
    }
    
    loadSlots()
  }, [nutricionistaId, schedule])

  // Organizar días disponibles (formato europeo: Lunes primero)
  const organizeAvailableDays = (slots: Slot[]) => {
    const grouped = groupSlotsByDay(slots)
    const days = Object.keys(grouped).sort((a, b) => {
      return new Date(grouped[a][0].dateTime).getTime() - new Date(grouped[b][0].dateTime).getTime()
    })
    
    return days.map(dayKey => {
      const daySlots = grouped[dayKey]
      const date = new Date(daySlots[0].dateTime)
      return {
        dateKey: dayKey,
        date,
        slots: daySlots
      }
    })
  }

  // TODOS LOS HOOKS DEBEN IR ANTES DE CUALQUIER RETURN CONDICIONAL
  const availableDays = useMemo(() => organizeAvailableDays(slots), [slots])
  const today = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }, [])

  // Obtener slots del día seleccionado
  const selectedDaySlots = useMemo(() => {
    if (!selectedDay) return []
    return availableDays.find(d => d.dateKey === selectedDay)?.slots || []
  }, [selectedDay, availableDays])

  // Si hay un slot seleccionado, mostrar el día correspondiente
  useEffect(() => {
    if (selectedSlot && !selectedDay && availableDays.length > 0) {
      const slotDate = new Date(selectedSlot)
      slotDate.setHours(0, 0, 0, 0)
      const day = availableDays.find(d => {
        const dDate = new Date(d.date)
        dDate.setHours(0, 0, 0, 0)
        return dDate.getTime() === slotDate.getTime()
      })
      if (day) {
        setSelectedDay(day.dateKey)
      }
    }
  }, [selectedSlot, availableDays, selectedDay])

  // AHORA SÍ PUEDEN IR LOS RETURNS CONDICIONALES
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8 text-gray-500">
          <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm">Cargando horarios disponibles...</p>
        </div>
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No hay horarios disponibles en este momento.</p>
          <p className="text-xs mt-2">Por favor, intenta más tarde o contacta directamente.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Selección de día */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700">Selecciona un día</h4>
          {selectedDay && (
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Ver todos los días
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {availableDays.map((day, index) => {
            const dayDate = new Date(day.date)
            dayDate.setHours(0, 0, 0, 0)
            const isToday = dayDate.getTime() === today.getTime()
            const isSelected = selectedDay === day.dateKey
            const shouldShow = !selectedDay || isSelected
            
            const dayName = dayDate.toLocaleDateString('es-ES', { weekday: 'long' })
            const dayNumber = dayDate.getDate()
            const monthName = dayDate.toLocaleDateString('es-ES', { month: 'short' })

            // Calcular delay para animación
            let delay = 0
            if (selectedDay) {
              if (isSelected) {
                // El día seleccionado aparece primero
                delay = 0
              } else {
                // Los demás desaparecen con delay escalonado
                delay = index * 15
              }
            } else {
              // Al revertir, todos aparecen con delay escalonado
              delay = index * 20
            }

            return (
              <div
                key={day.dateKey}
                className={`transition-all duration-500 ease-in-out ${
                  shouldShow
                    ? 'opacity-100 scale-100 max-h-[200px] mb-0'
                    : 'opacity-0 scale-90 pointer-events-none max-h-0 mb-0 overflow-hidden'
                }`}
                style={{
                  transitionDelay: `${delay}ms`,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDay(day.dateKey)
                  }}
                  className={`w-full p-4 border-2 rounded-xl text-left transition-all duration-300 ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-lg scale-105 ring-2 ring-primary/20'
                      : 'border-gray-200 bg-white hover:border-primary/50 hover:bg-primary/5 hover:scale-[1.02]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium uppercase transition-colors duration-200 ${isSelected ? 'text-primary' : 'text-gray-500'}`}>
                      {isToday ? 'Hoy' : dayName}
                    </span>
                    <div className="flex items-center gap-2">
                      {isToday && !isSelected && (
                        <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                      )}
                      {isSelected && (
                        <svg className="w-4 h-4 text-primary animate-in fade-in zoom-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className={`text-lg font-bold transition-colors duration-200 ${isSelected ? 'text-primary' : 'text-gray-900'}`}>
                    {dayNumber}
                  </div>
                  <div className={`text-xs transition-colors duration-200 ${isSelected ? 'text-primary' : 'text-gray-500'}`}>
                    {monthName}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {day.slots.length} horario{day.slots.length !== 1 ? 's' : ''}
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Horarios del día seleccionado */}
      {selectedDay && selectedDaySlots.length > 0 && (
        <div className="pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-700">
              Horarios disponibles
            </h4>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Cambiar día
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {selectedDaySlots.map((s) => {
              const isSelected = selectedSlot === s.dateTime
              const timeOnly = new Date(s.dateTime).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect(s.dateTime)}
                  className={`py-3 px-4 rounded-xl font-medium text-sm transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg scale-105'
                      : 'bg-white border-2 border-gray-200 hover:border-primary hover:bg-primary/5 text-gray-700'
                  }`}
                >
                  {timeOnly}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
