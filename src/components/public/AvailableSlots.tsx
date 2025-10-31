"use client"
import React from 'react'
import { availableSlots } from '../../lib/mockData'

export default function AvailableSlots({ onSelect }: { onSelect: (slotId: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="muted">Selecciona un slot disponible</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {availableSlots.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="text-left p-3 border rounded hover:bg-gray-50"
          >
            <div className="font-medium">{s.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
