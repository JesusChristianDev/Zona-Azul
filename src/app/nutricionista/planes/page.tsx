const templates = [
  {
    name: 'Plan Azul Energía',
    focus: 'Balance mente-cuerpo',
    duration: '4 semanas',
    audience: 'Suscriptores nuevos',
  },
  {
    name: 'Plan Fortaleza',
    focus: 'Ganancia de masa magra',
    duration: '6 semanas',
    audience: 'Atletas recreativos',
  },
  {
    name: 'Plan Ligereza',
    focus: 'Déficit calórico sostenible',
    duration: '8 semanas',
    audience: 'Clientes con sobrepeso moderado',
  },
]

export default function NutricionistaPlanesPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-accent/30 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">Biblioteca de planes</h2>
        <p className="mt-2 text-sm text-gray-600">
          Inspírate con plantillas estratégicas y duplica las más efectivas para nuevos suscriptores.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {templates.map((template) => (
          <article
            key={template.name}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
            <p className="mt-2 text-sm text-primary font-medium">{template.focus}</p>
            <ul className="mt-3 space-y-1 text-xs text-gray-500">
              <li>Duración: {template.duration}</li>
              <li>Orientado a: {template.audience}</li>
            </ul>
            <button className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition">
              Crear versión personalizada
            </button>
          </article>
        ))}
      </section>
    </div>
  )
}

