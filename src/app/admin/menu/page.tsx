const featuredItems = [
  { name: 'Bowl Vitalidad', category: 'Plato principal', price: 11.9, availability: 'Disponible', calories: 620 },
  { name: 'Smoothie Azul', category: 'Bebida funcional', price: 4.5, availability: 'Disponible', calories: 180 },
  { name: 'Wrap Proteico', category: 'On the go', price: 9.2, availability: 'Agendar reposición', calories: 540 },
]

export default function AdminMenuPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-primary/20 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">Gestión del menú activo</h2>
        <p className="mt-2 text-sm text-gray-600">
          Ajusta disponibilidad, precios y márgenes para mantener una carta nutritiva y rentable. Esta vista
          se sincroniza con las recomendaciones del equipo de nutrición.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {featuredItems.map((item) => (
          <article key={item.name} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                <p className="text-xs uppercase tracking-wide text-gray-400">{item.category}</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {item.availability}
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              {item.calories} kcal · Precio actual{' '}
              <span className="font-semibold text-primary">€{item.price.toFixed(2)}</span>
            </p>
            <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition">
              Editar plato
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.414 2.586a2 2 0 010 2.828l-1.793 1.793-2.828-2.828 1.793-1.793a2 2 0 012.828 0zM2 13.586l10-10 2.828 2.828-10 10H2v-2.828z" />
              </svg>
            </button>
          </article>
        ))}
      </section>
    </div>
  )
}

