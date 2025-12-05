'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { Report } from '@/lib/types'

export default function ReportesPage() {
  const { userId } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    target_user_id: '',
    period_start: '',
    period_end: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/reports/nutritionist')
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

  const handleGenerateReport = async () => {
    if (!formData.period_start || !formData.period_end) {
      setError('Debes seleccionar un período')
      return
    }

    try {
      const response = await fetch('/api/reports/nutritionist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_user_id: formData.target_user_id || null,
          period_start: formData.period_start,
          period_end: formData.period_end,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al generar reporte')
      }

      setSuccess('Reporte generado correctamente')
      setIsGenerateModalOpen(false)
      setFormData({ target_user_id: '', period_start: '', period_end: '' })
      loadReports()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error generating report:', error)
      setError(error.message || 'Error al generar reporte')
      setTimeout(() => setError(null), 5000)
    }
  }

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      nutritionist_weekly: 'Semanal',
      nutritionist_monthly: 'Mensual',
      nutritionist_manual: 'Manual',
    }
    return labels[type] || type
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

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-700 text-sm">
          {success}
        </div>
      )}

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-600 mt-1">
            Reportes automáticos y manuales de menús y modificaciones
          </p>
        </div>
        <button
          onClick={() => setIsGenerateModalOpen(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium"
        >
          + Generar Reporte Manual
        </button>
      </header>

      {reports.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No hay reportes generados aún.
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
                        Reporte {getReportTypeLabel(report.report_type)}
                      </h3>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {report.report_type === 'nutritionist_weekly' ? 'Automático' :
                         report.report_type === 'nutritionist_monthly' ? 'Automático' :
                         'Manual'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Período: {new Date(report.period_start).toLocaleDateString('es-ES')} - {new Date(report.period_end).toLocaleDateString('es-ES')}
                    </p>
                    {report.report_data?.metrics && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-gray-500">Menús Generados</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {report.report_data.metrics.total_menus}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Modificaciones</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {report.report_data.metrics.total_modifications}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Aprobadas</p>
                          <p className="text-lg font-semibold text-green-600">
                            {report.report_data.metrics.approved_modifications}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Tasa de Aprobación</p>
                          <p className="text-lg font-semibold text-primary">
                            {report.report_data.metrics.approval_rate.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-4">
                      Generado: {new Date(report.created_at).toLocaleString('es-ES')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal generar reporte */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generar Reporte Manual</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Inicio <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.period_start}
                  onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.period_end}
                  onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setIsGenerateModalOpen(false)
                    setFormData({ target_user_id: '', period_start: '', period_end: '' })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGenerateReport}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                >
                  Generar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


