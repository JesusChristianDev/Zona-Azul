"use client"
import { availableSlots } from '../../lib/mockData'

interface AvailableSlotsProps {
  onSelect: (slotId: string) => void
  selectedSlot?: string | null
}

export default function AvailableSlots({ onSelect, selectedSlot }: AvailableSlotsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {availableSlots.map((s) => {
          const isSelected = selectedSlot === s.id
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className={`group relative text-left p-4 border-2 rounded-xl transition-all duration-200 ${
                isSelected
                  ? 'bg-gradient-to-br from-primary to-accent text-white border-primary shadow-lg scale-105'
                  : 'bg-white hover:bg-primary/5 border-gray-200 hover:border-primary/50 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className={`font-semibold text-base ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                    {s.label}
                  </div>
                  {isSelected && (
                    <div className="text-xs text-white/90 mt-1 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Seleccionado
                    </div>
                  )}
                </div>
                {!isSelected && (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 group-hover:border-primary transition-colors flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-transparent group-hover:bg-primary/20 transition-colors"></div>
                  </div>
                )}
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
