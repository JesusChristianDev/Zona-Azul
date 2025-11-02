"use client"
import React from 'react'
import { availableSlots } from '../../lib/mockData'

interface AvailableSlotsProps {
  onSelect: (slotId: string) => void
  selectedSlot?: string | null
}

export default function AvailableSlots({ onSelect, selectedSlot }: AvailableSlotsProps) {
  return (
    <div className="space-y-2 sm:space-y-3">
      <p className="muted text-sm sm:text-base">Selecciona un slot disponible</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        {availableSlots.map((s) => {
          const isSelected = selectedSlot === s.id
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className={`text-left p-3 sm:p-4 border rounded-lg transition-all ${
                isSelected
                  ? 'bg-primary text-white border-primary shadow-md'
                  : 'hover:bg-gray-50 border-gray-300'
              }`}
            >
              <div className="font-medium text-sm sm:text-base">{s.label}</div>
              {isSelected && (
                <div className="text-xs sm:text-sm mt-1 opacity-90">✓ Seleccionado</div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
