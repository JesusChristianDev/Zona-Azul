"use client"
import React, { useState } from 'react'
import AvailableSlots from './AvailableSlots'

export default function BookingForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { name, email, phone, slot: selectedSlot }
    // Try to POST to local API; fallback to localStorage if network fails
    ;(async () => {
      try {
        const res = await fetch('/api/appointments/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const data = await res.json()
          showToast('Solicitud enviada ✔️')
          setTimeout(() => (window.location.href = '/booking/success'), 800)
          return
        }
        throw new Error('API responded with ' + res.status)
      } catch (err) {
        // fallback
        const existing = JSON.parse(localStorage.getItem('demo_appointments') || '[]')
        existing.push({ id: `m-${Date.now()}`, ...payload })
        localStorage.setItem('demo_appointments', JSON.stringify(existing))
        showToast('Solicitud guardada localmente ✔️')
        setTimeout(() => (window.location.href = '/booking/success'), 900)
      }
    })()
  }

  function showToast(text: string) {
    const toast = document.createElement('div')
    toast.textContent = text
    toast.style.position = 'fixed'
    toast.style.right = '20px'
    toast.style.top = '20px'
    toast.style.background = '#059669'
    toast.style.color = 'white'
    toast.style.padding = '10px 14px'
    toast.style.borderRadius = '8px'
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 1200)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 card">
      <h2 className="text-xl font-semibold">Solicitar cita con nutricionista</h2>

      <div>
        <label className="block text-sm">Nombre</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 p-2 border rounded" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-sm">Email</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mt-1 p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm">Teléfono</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full mt-1 p-2 border rounded" />
        </div>
      </div>

      <AvailableSlots onSelect={(id) => setSelectedSlot(id)} />

      <div>
        <button type="submit" disabled={!selectedSlot} className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50">
          Enviar solicitud
        </button>
      </div>
    </form>
  )
}
