'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface Report {
  id: string
  report_type: string
  period_start: string
  period_end: string
  report_data: any
  is_shared_with_repartidores: boolean
  created_at: string
}

export default function ReportesLogisticaPage() {
  const { userId } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/reports?report_type=delivery_satisfaction_weekly,delivery_satisfaction_monthly')
      if (!response.ok) throw new Error('Error al cargar reportes')
      
      const data = await response.json()
      setReports(data)
    } catch (error: any) {
      console.error('Error loading reports:', error)
      setError(error.message || 'Error al cargar reportes')
    } finally {
      setLoading(false)
    }
  }

  const handleShareWithRepartidores = async (report: Report, share: boolean) => {
    try {
      const response = await fetch(`/api/reports/${report.id}/share`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_shared_with_repartidores: share }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar visibilidad')
      }

      await loadReports()
      setIsShareModalOpen(false)
      setSelectedReport(null)
    } catch (error: any) {
      console.error('Error sharing report:', error)
      setError(error.message || 'Error al compartir reporte')
      setTimeout(() => setError(null), 5000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando reportes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <header>
        <h1 className="text-2xl font-bold text-gray-900">Reportes de Satisfacción de Entrega</h1>
        <p className="text-sm text-gray-600 mt-1">
          Reportes automáticos de satisfacción. Decide qué compartir con los repartidores.
        </p>
      </header>

      {reports.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No hay reportes de satisfacción generados aún.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {reports.map((report) => (
              <div key={report.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        Reporte de Satisfacción {report.report_type.includes('weekly') ? 'Semanal' : 'Mensual'}
                      </h3>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Automático
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Período: {new Date(report.period_start).toLocaleDateString('es-ES')} - {new Date(report.period_end).toLocaleDateString('es-ES')}
                    </p>
                    {report.report_data?.metrics && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-gray-500">Total Valoraciones</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {report.report_data.metrics.total_ratings}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Promedio</p>
                          <p className="text-lg font-semibold text-primary">
                            {report.report_data.metrics.average_rating.toFixed(1)} ⭐
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">5 Estrellas</p>
                          <p className="text-lg font-semibold text-yellow-600">
                            {report.report_data.metrics.rating_distribution[5]}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">1 Estrella</p>
                          <p className="text-lg font-semibold text-red-600">
                            {report.report_data.metrics.rating_distribution[1]}
                          </p>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-4">
                      Generado: {new Date(report.created_at).toLocaleString('es-ES')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        report.is_shared_with_repartidores
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {report.is_shared_with_repartidores ? 'Compartido' : 'No compartido'}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedReport(report)
                        setIsShareModalOpen(true)
                      }}
                      className="px-3 py-1 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                    >
                      {report.is_shared_with_repartidores ? 'Ocultar' : 'Compartir'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal para compartir/ocultar */}
      {isShareModalOpen && selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedReport.is_shared_with_repartidores
                ? 'Ocultar reporte de repartidores'
                : 'Compartir reporte con repartidores'}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {selectedReport.is_shared_with_repartidores
                ? '¿Estás seguro de ocultar este reporte de los repartidores?'
                : '¿Deseas compartir este reporte con todos los repartidores?'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsShareModalOpen(false)
                  setSelectedReport(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleShareWithRepartidores(selectedReport, !selectedReport.is_shared_with_repartidores)}
                className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition ${
                  selectedReport.is_shared_with_repartidores
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {selectedReport.is_shared_with_repartidores ? 'Ocultar' : 'Compartir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


