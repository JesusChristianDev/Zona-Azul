"use client"
import { useState, useMemo } from 'react'

interface Slot {
  id: string
  label: string
  dateTime: string
  available: boolean
}

interface MonthlyCalendarProps {
  slots: Slot[]
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  selectedSlot?: string | null
}

export default function MonthlyCalendar({ slots, selectedDate, onDateSelect, selectedSlot }: MonthlyCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Agrupar slots por fecha (solo día, sin hora) - normalizando fechas a medianoche
  const slotsByDate = useMemo(() => {
    const grouped: { [key: string]: Slot[] } = {}
    slots.forEach(slot => {
      const date = new Date(slot.dateTime)
      // Normalizar a medianoche para evitar problemas de zona horaria
      date.setHours(0, 0, 0, 0)
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(slot)
    })
    return grouped
  }, [slots])

  // Obtener el primer día del mes y el número de días
  const monthStart = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    return start
  }, [currentMonth])

  const monthEnd = useMemo(() => {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
  }, [currentMonth])

  const daysInMonth = monthEnd.getDate()
  const firstDayOfWeek = monthStart.getDay() // 0 = domingo, 1 = lunes, etc.

  // Ajustar para que la semana empiece en lunes (1) en lugar de domingo (0)
  const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  // Generar días del mes
  const days = useMemo(() => {
    const daysArray: Array<{ date: Date; isCurrentMonth: boolean; hasSlots: boolean; slotCount: number }> = []
    
    // Días del mes anterior (para completar la primera semana)
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 0)
    const daysInPrevMonth = prevMonth.getDate()
    
    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, daysInPrevMonth - i)
      date.setHours(0, 0, 0, 0) // Normalizar a medianoche
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      daysArray.push({
        date,
        isCurrentMonth: false,
        hasSlots: !!slotsByDate[dateKey],
        slotCount: slotsByDate[dateKey]?.length || 0
      })
    }

    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      date.setHours(0, 0, 0, 0) // Normalizar a medianoche
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      
      daysArray.push({
        date,
        isCurrentMonth: true,
        hasSlots: !!slotsByDate[dateKey],
        slotCount: slotsByDate[dateKey]?.length || 0
      })
    }

    // Días del mes siguiente (para completar la última semana)
    const remainingDays = 42 - daysArray.length // 6 semanas * 7 días = 42
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, day)
      date.setHours(0, 0, 0, 0) // Normalizar a medianoche
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      daysArray.push({
        date,
        isCurrentMonth: false,
        hasSlots: !!slotsByDate[dateKey],
        slotCount: slotsByDate[dateKey]?.length || 0
      })
    }

    return daysArray
  }, [currentMonth, slotsByDate, adjustedFirstDay, daysInMonth])

  const today = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }, [])

  const monthName = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1)

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  const isDateSelected = (date: Date) => {
    if (!selectedDate) return false
    return date.getTime() === selectedDate.getTime()
  }

  const isToday = (date: Date) => {
    return date.getTime() === today.getTime()
  }

  const handleDateClick = (date: Date) => {
    if (date < today) return // No permitir seleccionar fechas pasadas
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    if (slotsByDate[dateKey] && slotsByDate[dateKey].length > 0) {
      onDateSelect(date)
    }
  }

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
      {/* Header del calendario */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Mes anterior"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="flex items-center gap-3">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
            {capitalizedMonthName}
          </h3>
          <button
            type="button"
            onClick={goToToday}
            className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-medium"
          >
            Hoy
          </button>
        </div>

        <button
          type="button"
          onClick={goToNextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Mes siguiente"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, index) => (
          <div
            key={index}
            className="text-center text-xs sm:text-sm font-semibold text-gray-600 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Días del calendario */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((dayData, index) => {
          const { date, isCurrentMonth, hasSlots, slotCount } = dayData
          const isPast = date < today
          const isSelected = isDateSelected(date)
          const isTodayDate = isToday(date)

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleDateClick(date)}
              disabled={!hasSlots || isPast || !isCurrentMonth}
              className={`
                relative p-2 sm:p-3 rounded-lg text-center transition-all duration-200
                ${!isCurrentMonth 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : isPast
                  ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                  : hasSlots
                  ? isSelected
                    ? 'bg-primary text-white shadow-lg scale-105 ring-2 ring-primary/20'
                    : 'bg-white text-gray-900 hover:bg-primary/10 hover:border-primary border-2 border-transparent hover:scale-105'
                  : 'text-gray-400 bg-gray-50 cursor-not-allowed'
                }
                ${isTodayDate && !isSelected ? 'ring-2 ring-primary/30' : ''}
              `}
            >
              <div className={`text-sm sm:text-base font-semibold ${isSelected ? 'text-white' : ''}`}>
                {date.getDate()}
              </div>
              {hasSlots && !isPast && isCurrentMonth && (
                <div className={`text-xs mt-1 ${isSelected ? 'text-white/90' : 'text-primary'}`}>
                  {slotCount}
                </div>
              )}
              {isTodayDate && !isSelected && (
                <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full"></div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

