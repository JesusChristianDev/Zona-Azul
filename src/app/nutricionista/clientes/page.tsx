const clientList = [
  {
    name: 'Fernanda Ríos',
    plan: 'Flexitariano',
    progress: '85%',
    lastCheck: '03 Nov',
    notes: 'Aumentar ingesta de omega 3',
  },
  {
    name: 'Miguel Díaz',
    plan: 'Pérdida de peso',
    progress: '62%',
    lastCheck: '05 Nov',
    notes: 'Registrar hidratación diaria',
  },
  {
    name: 'Laura Pérez',
    plan: 'Ganancia de masa',
    progress: '78%',
    lastCheck: '01 Nov',
    notes: 'Refuerzo de proteína post entreno',
  },
]

export default function NutricionistaClientesPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-primary/20 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">Clientes activos</h2>
        <p className="mt-2 text-sm text-gray-600">
          Visualiza el estado de cada suscriptor, identifica quién necesita soporte adicional y agrega notas
          para la app móvil.
        </p>
      </header>

      <section className="space-y-3">
        {clientList.map((client) => (
          <article key={client.name} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                <p className="text-xs uppercase tracking-wider text-gray-400">{client.plan}</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Progreso {client.progress}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
              <span>Última revisión: {client.lastCheck}</span>
              <span className="italic text-gray-500">Nota: {client.notes}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <button className="rounded-full border border-gray-200 px-3 py-1 font-semibold text-gray-600 hover:border-primary hover:text-primary transition">
                Abrir ficha nutricional
              </button>
              <button className="rounded-full border border-gray-200 px-3 py-1 font-semibold text-gray-600 hover:border-highlight hover:text-highlight transition">
                Enviar recomendación
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}

