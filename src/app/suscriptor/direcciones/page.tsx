'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import type { DeliveryAddress } from '@/lib/types'

export default function DireccionesPage() {
  const { userId } = useAuth()
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<DeliveryAddress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    address_line1: '',
    address_line2: '',
    city: '',
    postal_code: '',
    country: 'España',
    is_primary: false,
    delivery_instructions: '',
  })

  useEffect(() => {
    if (userId) {
      loadAddresses()
    }
  }, [userId])

  const loadAddresses = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/delivery-addresses?user_id=${userId}`)
      if (!response.ok) throw new Error('Error al cargar direcciones')
      
      const data = await response.json()
      setAddresses(data)
    } catch (error: any) {
      console.error('Error loading addresses:', error)
      setError(error.message || 'Error al cargar direcciones')
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async (addressId: string) => {
    try {
      const response = await fetch(`/api/delivery-addresses/history?address_id=${addressId}`)
      if (response.ok) {
        const data = await response.json()
        setHistory(data)
      }
    } catch (error) {
      console.error('Error loading history:', error)
    }
  }

  const handleCreate = async () => {
    if (!formData.address_line1.trim() || !formData.city.trim() || !formData.postal_code.trim()) {
      setError('Debes completar los campos requeridos')
      return
    }

    try {
      const response = await fetch('/api/delivery-addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          user_id: userId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear dirección')
      }

      setSuccess('Dirección creada correctamente')
      loadAddresses()
      setIsCreateModalOpen(false)
      setFormData({
        address_line1: '',
        address_line2: '',
        city: '',
        postal_code: '',
        country: 'España',
        is_primary: false,
        delivery_instructions: '',
      })
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error creating address:', error)
      setError(error.message || 'Error al crear dirección')
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleUpdate = async () => {
    if (!selectedAddress || !formData.address_line1.trim() || !formData.city.trim() || !formData.postal_code.trim()) {
      setError('Debes completar los campos requeridos')
      return
    }

    try {
      const response = await fetch('/api/delivery-addresses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address_id: selectedAddress.id,
          ...formData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar dirección')
      }

      setSuccess('Dirección actualizada correctamente')
      loadAddresses()
      setIsEditModalOpen(false)
      setSelectedAddress(null)
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error updating address:', error)
      setError(error.message || 'Error al actualizar dirección')
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleDelete = async (addressId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta dirección? Los cambios se archivarán en el historial.')) return

    try {
      const response = await fetch(`/api/delivery-addresses?address_id=${addressId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar dirección')
      }

      setSuccess('Dirección eliminada correctamente')
      loadAddresses()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error deleting address:', error)
      setError(error.message || 'Error al eliminar dirección')
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleViewHistory = async (address: DeliveryAddress) => {
    setSelectedAddress(address)
    await loadHistory(address.id)
    setIsHistoryModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando direcciones...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
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

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Direcciones</h1>
          <p className="text-sm text-gray-600 mt-1">
            Gestiona tus direcciones de entrega. Los cambios se archivan automáticamente.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium"
        >
          + Agregar Dirección
        </button>
      </header>

      {/* Lista de direcciones */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {addresses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No tienes direcciones registradas. Agrega una para poder realizar pedidos con delivery.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {addresses.map((address) => (
              <div key={address.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {address.address_line1}
                        {address.address_line2 && `, ${address.address_line2}`}
                      </h3>
                      {address.is_primary && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {address.city}, {address.postal_code}, {address.country}
                    </p>
                    {address.delivery_instructions && (
                      <p className="text-sm text-gray-500 mt-1">
                        Instrucciones: {address.delivery_instructions}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Creada: {new Date(address.created_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewHistory(address)}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                    >
                      Historial
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAddress(address)
                        setFormData({
                          address_line1: address.address_line1,
                          address_line2: address.address_line2 || '',
                          city: address.city,
                          postal_code: address.postal_code,
                          country: address.country,
                          is_primary: address.is_primary,
                          delivery_instructions: address.delivery_instructions || '',
                        })
                        setIsEditModalOpen(true)
                      }}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(address.id)}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal crear dirección */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setFormData({
            address_line1: '',
            address_line2: '',
            city: '',
            postal_code: '',
            country: 'España',
            is_primary: false,
            delivery_instructions: '',
          })
        }}
        title="Agregar Dirección"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección Línea 1 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.address_line1}
              onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Calle y número"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección Línea 2 (opcional)
            </label>
            <input
              type="text"
              value={formData.address_line2}
              onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Piso, apartamento, etc."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ciudad <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código Postal <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              País
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instrucciones de Entrega (opcional)
            </label>
            <textarea
              value={formData.delivery_instructions}
              onChange={(e) => setFormData({ ...formData, delivery_instructions: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ej: Llamar antes de llegar, dejar en la puerta, etc."
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_primary"
              checked={formData.is_primary}
              onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <label htmlFor="is_primary" className="ml-2 text-sm text-gray-700">
              Marcar como dirección principal
            </label>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false)
                setFormData({
                  address_line1: '',
                  address_line2: '',
                  city: '',
                  postal_code: '',
                  country: 'España',
                  is_primary: false,
                  delivery_instructions: '',
                })
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreate}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Crear Dirección
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal editar dirección */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedAddress(null)
        }}
        title="Editar Dirección"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección Línea 1 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.address_line1}
              onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección Línea 2 (opcional)
            </label>
            <input
              type="text"
              value={formData.address_line2}
              onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ciudad <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código Postal <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              País
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instrucciones de Entrega (opcional)
            </label>
            <textarea
              value={formData.delivery_instructions}
              onChange={(e) => setFormData({ ...formData, delivery_instructions: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_primary_edit"
              checked={formData.is_primary}
              onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <label htmlFor="is_primary_edit" className="ml-2 text-sm text-gray-700">
              Marcar como dirección principal
            </label>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false)
                setSelectedAddress(null)
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleUpdate}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Actualizar Dirección
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal historial */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false)
          setSelectedAddress(null)
          setHistory([])
        }}
        title={`Historial de Dirección - ${selectedAddress?.address_line1}`}
        size="lg"
      >
        <div className="space-y-4">
          {history.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No hay historial de cambios para esta dirección
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      entry.change_type === 'created' ? 'bg-green-100 text-green-800' :
                      entry.change_type === 'updated' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {entry.change_type === 'created' ? 'Creada' :
                       entry.change_type === 'updated' ? 'Actualizada' :
                       'Eliminada'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(entry.changed_at).toLocaleDateString('es-ES')} {new Date(entry.changed_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>{entry.address_line1}{entry.address_line2 && `, ${entry.address_line2}`}</p>
                    <p>{entry.city}, {entry.postal_code}, {entry.country}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}


