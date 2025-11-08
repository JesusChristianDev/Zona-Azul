const metrics = [
  { label: 'Pedidos del día', value: 18, delta: '+3 vs ayer' },
  { label: 'Tiempo promedio', value: '28 min', delta: 'Objetivo < 30 min' },
  { label: 'Satisfacción clientes', value: '4.9/5', delta: 'Basado en 42 calificaciones' },
]

const safetyTips = [
  'Verifica que cada entrega tenga contacto actualizado antes de salir.',
  'Utiliza las bolsas térmicas oficiales Zona Azul para preservar la calidad.',
  'Registra comentarios o incidencias desde la app para dar seguimiento inmediato.',
]

export default function RepartidorPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-2xl border border-highlight/30 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-highlight/80">{metric.label}</p>
            <p className="mt-3 text-3xl font-bold text-gray-900">{metric.value}</p>
            <p className="mt-2 text-xs font-medium text-gray-500">{metric.delta}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Tips de excelencia Zona Azul</h2>
        <ul className="mt-4 space-y-2 text-sm text-gray-600">
          {safetyTips.map((tip) => (
            <li key={tip} className="flex items-start gap-2">
              <span className="mt-1 block h-2 w-2 rounded-full bg-accent"></span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

