const summary = [
  { label: 'Clientes activos', value: 48, delta: '+5 esta semana' },
  { label: 'Planes en revisión', value: 12, delta: '4 con feedback pendiente' },
  { label: 'Satisfacción promedio', value: '4.8/5', delta: 'basado en 120 encuestas' },
]

const upcomingSessions = [
  { client: 'Fernanda Ríos', date: 'Lunes 11:30', focus: 'Revisión plan flexitariano' },
  { client: 'Alonso Vega', date: 'Martes 09:00', focus: 'Optimizar proteína vegetal' },
  { client: 'Camila Soto', date: 'Miércoles 14:00', focus: 'Control impacto glucémico' },
]

export default function NutricionistaPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        {summary.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-primary/20 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-primary/60">{item.label}</p>
            <p className="mt-3 text-3xl font-bold text-gray-900">{item.value}</p>
            <p className="mt-2 text-xs font-medium text-gray-500">{item.delta}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Sesiones próximas</h2>
            <p className="text-sm text-gray-500">Organiza tu agenda de seguimiento semanal.</p>
          </div>
          <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition">
            Añadir sesión
          </button>
        </div>
        <div className="mt-5 space-y-3">
          {upcomingSessions.map((session) => (
            <article key={session.client} className="rounded-2xl border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-900">{session.client}</p>
              <p className="text-xs text-gray-500">{session.date}</p>
              <p className="mt-2 text-sm text-gray-600">{session.focus}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

