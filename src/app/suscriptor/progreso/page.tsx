import { mockProgress } from '../../../lib/mockProgress'

export default function SuscriptorProgresoPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-highlight/30 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">Progreso integral</h2>
        <p className="mt-2 text-sm text-gray-600">
          Visualiza cómo evolucionan tus métricas principales. Recuerda registrar tu peso y nivel de energía
          cada mañana para obtener recomendaciones personalizadas.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {mockProgress.metrics.map((metric) => (
          <article key={metric.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">{metric.label}</p>
            <p className="mt-3 text-3xl font-bold text-gray-900">{metric.value}</p>
            <p className="mt-2 text-xs text-gray-500">Meta semanal: {metric.goal}</p>
            <p className="mt-2 text-sm font-medium text-gray-600">{metric.tip}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Notas del plan</h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          Tu nutricionista sugiere añadir 10 minutos de respiración consciente después del almuerzo para
          mejorar la digestión y reducir el estrés. También puedes registrar sensaciones y energía en la app
          móvil para ajustar el plan semanalmente.
        </p>
      </section>
    </div>
  )
}

