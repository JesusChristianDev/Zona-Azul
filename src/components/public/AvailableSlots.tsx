"use client"
import { useState, useEffect, useMemo } from 'react'
import { getCalendarAvailability, getNutritionistScheduleById } from '../../lib/api'
import { availableSlots as fallbackSlots } from '../../lib/mockData'
import MonthlyCalendar from './MonthlyCalendar'

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
  schedule_mode?: 'continuous' | 'split'
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
  saturday_second_start_hour?: number | null
  saturday_second_end_hour?: number | null
  saturday_enabled: boolean
  sunday_start_hour: number | null
  sunday_end_hour: number | null
  sunday_second_start_hour?: number | null
  sunday_second_end_hour?: number | null
  sunday_enabled: boolean
  monday_second_start_hour?: number | null
  monday_second_end_hour?: number | null
  tuesday_second_start_hour?: number | null
  tuesday_second_end_hour?: number | null
  wednesday_second_start_hour?: number | null
  wednesday_second_end_hour?: number | null
  thursday_second_start_hour?: number | null
  thursday_second_end_hour?: number | null
  friday_second_start_hour?: number | null
  friday_second_end_hour?: number | null
  slot_duration_minutes: number
}

export default function AvailableSlots({ onSelect, selectedSlot, nutricionistaId }: AvailableSlotsProps) {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Cargar horarios del nutricionista
  useEffect(() => {
    const loadSchedule = async () => {
      if (nutricionistaId) {
        try {
          const nutritionistSchedule = await getNutritionistScheduleById(nutricionistaId)
          setSchedule({ schedule_mode: 'continuous', ...nutritionistSchedule })
        } catch (error) {
          console.error('❌ Error loading schedule:', error)
          // Usar valores por defecto si hay error
          setSchedule({
            schedule_mode: 'continuous',
            monday_start_hour: 9,
            monday_end_hour: 18,
            monday_second_start_hour: null,
            monday_second_end_hour: null,
            monday_enabled: true,
            tuesday_start_hour: 9,
            tuesday_end_hour: 18,
            tuesday_second_start_hour: null,
            tuesday_second_end_hour: null,
            tuesday_enabled: true,
            wednesday_start_hour: 9,
            wednesday_end_hour: 18,
            wednesday_second_start_hour: null,
            wednesday_second_end_hour: null,
            wednesday_enabled: true,
            thursday_start_hour: 9,
            thursday_end_hour: 18,
            thursday_second_start_hour: null,
            thursday_second_end_hour: null,
            thursday_enabled: true,
            friday_start_hour: 9,
            friday_end_hour: 18,
            friday_second_start_hour: null,
            friday_second_end_hour: null,
            friday_enabled: true,
            saturday_start_hour: null,
            saturday_end_hour: null,
            saturday_second_start_hour: null,
            saturday_second_end_hour: null,
            saturday_enabled: false,
            sunday_start_hour: null,
            sunday_end_hour: null,
            sunday_second_start_hour: null,
            sunday_second_end_hour: null,
            sunday_enabled: false,
            slot_duration_minutes: 60,
          })
        }
      } else {
        // Valores por defecto si no hay nutricionista
        setSchedule({
          schedule_mode: 'continuous',
          monday_start_hour: 9,
          monday_end_hour: 18,
          monday_second_start_hour: null,
          monday_second_end_hour: null,
          monday_enabled: true,
          tuesday_start_hour: 9,
          tuesday_end_hour: 18,
          tuesday_second_start_hour: null,
          tuesday_second_end_hour: null,
          tuesday_enabled: true,
          wednesday_start_hour: 9,
          wednesday_end_hour: 18,
          wednesday_second_start_hour: null,
          wednesday_second_end_hour: null,
          wednesday_enabled: true,
          thursday_start_hour: 9,
          thursday_end_hour: 18,
          thursday_second_start_hour: null,
          thursday_second_end_hour: null,
          thursday_enabled: true,
          friday_start_hour: 9,
          friday_end_hour: 18,
          friday_second_start_hour: null,
          friday_second_end_hour: null,
          friday_enabled: true,
          saturday_start_hour: null,
          saturday_end_hour: null,
          saturday_second_start_hour: null,
          saturday_second_end_hour: null,
          saturday_enabled: false,
          sunday_start_hour: null,
          sunday_end_hour: null,
          sunday_second_start_hour: null,
          sunday_second_end_hour: null,
          sunday_enabled: false,
          slot_duration_minutes: 60,
        })
      }
    }
    loadSchedule()
  }, [nutricionistaId])

  // Generar slots disponibles para los próximos 3 meses (para el calendario mensual)
  const generateAvailableSlots = (busyTimes: Array<{ start: string; end: string }> = [], scheduleData: Schedule | null): Slot[] => {
    if (!scheduleData) return []
    
    const slots: Slot[] = []
    const now = new Date()
    // Generar slots para los próximos 3 meses (90 días) para que el calendario mensual funcione correctamente
    const threeMonthsLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
    const slotDuration = scheduleData.slot_duration_minutes || 60
    
    const isSplit = scheduleData.schedule_mode === 'split'

    // Mapeo de días de la semana (0=domingo, 1=lunes, ..., 6=sábado) a nombres de campos con rangos de mañana y tarde
    const dayConfig = [
      {
        name: 'sunday',
        enabled: scheduleData.sunday_enabled,
        ranges: [
          { start: scheduleData.sunday_start_hour, end: scheduleData.sunday_end_hour },
          ...(isSplit ? [{ start: scheduleData.sunday_second_start_hour ?? null, end: scheduleData.sunday_second_end_hour ?? null }] : []),
        ],
      },
      {
        name: 'monday',
        enabled: scheduleData.monday_enabled,
        ranges: [
          { start: scheduleData.monday_start_hour, end: scheduleData.monday_end_hour },
          ...(isSplit ? [{ start: scheduleData.monday_second_start_hour ?? null, end: scheduleData.monday_second_end_hour ?? null }] : []),
        ],
      },
      {
        name: 'tuesday',
        enabled: scheduleData.tuesday_enabled,
        ranges: [
          { start: scheduleData.tuesday_start_hour, end: scheduleData.tuesday_end_hour },
          ...(isSplit ? [{ start: scheduleData.tuesday_second_start_hour ?? null, end: scheduleData.tuesday_second_end_hour ?? null }] : []),
        ],
      },
      {
        name: 'wednesday',
        enabled: scheduleData.wednesday_enabled,
        ranges: [
          { start: scheduleData.wednesday_start_hour, end: scheduleData.wednesday_end_hour },
          ...(isSplit ? [{ start: scheduleData.wednesday_second_start_hour ?? null, end: scheduleData.wednesday_second_end_hour ?? null }] : []),
        ],
      },
      {
        name: 'thursday',
        enabled: scheduleData.thursday_enabled,
        ranges: [
          { start: scheduleData.thursday_start_hour, end: scheduleData.thursday_end_hour },
          ...(isSplit ? [{ start: scheduleData.thursday_second_start_hour ?? null, end: scheduleData.thursday_second_end_hour ?? null }] : []),
        ],
      },
      {
        name: 'friday',
        enabled: scheduleData.friday_enabled,
        ranges: [
          { start: scheduleData.friday_start_hour, end: scheduleData.friday_end_hour },
          ...(isSplit ? [{ start: scheduleData.friday_second_start_hour ?? null, end: scheduleData.friday_second_end_hour ?? null }] : []),
        ],
      },
      {
        name: 'saturday',
        enabled: scheduleData.saturday_enabled,
        ranges: [
          { start: scheduleData.saturday_start_hour, end: scheduleData.saturday_end_hour },
          ...(isSplit ? [{ start: scheduleData.saturday_second_start_hour ?? null, end: scheduleData.saturday_second_end_hour ?? null }] : []),
        ],
      },
    ]
    
    // Empezar desde hoy, pero normalizar a medianoche para evitar problemas de zona horaria
    let currentDate = new Date(now)
    currentDate.setHours(0, 0, 0, 0)
    let slotIndex = 1
    
    while (currentDate <= threeMonthsLater) {
      const dayOfWeek = currentDate.getDay() // 0 = domingo, 1 = lunes, ..., 6 = sábado
      const day = dayConfig[dayOfWeek]
      
      
      // Solo procesar días habilitados
      if (day.enabled) {
        day.ranges.forEach((range) => {
          if (range.start === null || range.end === null) return

          let minutesFromMidnight = range.start * 60
          const endMinutes = range.end * 60

          while (minutesFromMidnight + slotDuration <= endMinutes) {
            const slotDateTime = new Date(currentDate)
            slotDateTime.setHours(0, 0, 0, 0)
            slotDateTime.setMinutes(minutesFromMidnight)

            if (slotDateTime > now) {
              const slotEnd = new Date(slotDateTime)
              slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration)

              const isBusy = busyTimes.some((busy) => {
                const busyStart = new Date(busy.start)
                const busyEnd = new Date(busy.end)
                return slotDateTime < busyEnd && slotEnd > busyStart
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

            minutesFromMidnight += slotDuration
          }
        })
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
          // Obtener disponibilidad del calendario para los próximos 3 meses
          const now = new Date()
          const threeMonthsLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
          
          let busyTimes: Array<{ start: string; end: string }> = []
          try {
            busyTimes = await getCalendarAvailability(
              nutricionistaId,
              now.toISOString(),
              threeMonthsLater.toISOString()
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

  // Obtener slots del día seleccionado
  const selectedDaySlots = useMemo(() => {
    if (selectedDate) {
      // Normalizar la fecha seleccionada a medianoche para comparación
      const normalizedSelectedDate = new Date(selectedDate)
      normalizedSelectedDate.setHours(0, 0, 0, 0)
      
      return slots.filter(slot => {
        const slotDate = new Date(slot.dateTime)
        slotDate.setHours(0, 0, 0, 0) // Normalizar a medianoche
        return slotDate.getTime() === normalizedSelectedDate.getTime()
      })
    }
    if (!selectedDay) return []
    return availableDays.find(d => d.dateKey === selectedDay)?.slots || []
  }, [selectedDate, selectedDay, availableDays, slots])

  // Si hay un slot seleccionado, mostrar el día correspondiente
  useEffect(() => {
    if (selectedSlot && !selectedDate) {
      const slotDate = new Date(selectedSlot)
      slotDate.setHours(0, 0, 0, 0)
      setSelectedDate(slotDate)
    }
  }, [selectedSlot, selectedDate])

  const handleDateSelect = (date: Date) => {
    // Normalizar la fecha a medianoche antes de guardarla
    const normalizedDate = new Date(date)
    normalizedDate.setHours(0, 0, 0, 0)
    setSelectedDate(normalizedDate)
    setSelectedDay(null) // Limpiar selección antigua
  }

  // AHORA SÍ PUEDEN IR LOS RETURNS CONDICIONALES
  if (loading) {
    return (
      <div className="space-y-4" style={{ minHeight: '400px', contain: 'layout' }}>
        <div className="text-center py-8 text-gray-500">
          <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-primary" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm">Cargando horarios disponibles...</p>
        </div>
        {/* Skeleton para evitar CLS */}
        <div className="space-y-3 animate-pulse">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="space-y-4" style={{ minHeight: '200px', contain: 'layout' }}>
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No hay horarios disponibles en este momento.</p>
          <p className="text-xs mt-2">Por favor, intenta más tarde o contacta directamente.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" style={{ contain: 'layout' }}>
      {/* Calendario mensual */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-700">Selecciona una fecha</h4>
          {selectedDate && (
            <button
              type="button"
              onClick={() => {
                setSelectedDate(null)
                setSelectedDay(null)
              }}
              className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Limpiar selección
            </button>
          )}
        </div>
        <MonthlyCalendar
          slots={slots}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          selectedSlot={selectedSlot || undefined}
        />
      </div>

      {/* Horarios del día seleccionado */}
      {selectedDate && selectedDaySlots.length > 0 && (
        <div className="pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-700">
              Horarios disponibles para {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h4>
            <button
              type="button"
              onClick={() => {
                setSelectedDate(null)
                setSelectedDay(null)
              }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Cambiar fecha
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3" style={{ contain: 'layout', minHeight: '200px' }}>
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
