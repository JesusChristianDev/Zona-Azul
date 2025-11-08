const history = [
  {
    id: 'PED-2024-180',
    deliveredAt: '07 nov · 12:10',
    rating: 5,
    feedback: 'Entrega puntual y muy amable.',
  },
  {
    id: 'PED-2024-176',
    deliveredAt: '06 nov · 19:45',
    rating: 4,
    feedback: 'Llegó caliente, pero tardó un poco más de lo previsto.',
  },
  {
    id: 'PED-2024-172',
    deliveredAt: '05 nov · 13:20',
    rating: 5,
    feedback: 'Excelente trato, gracias por seguir las indicaciones.',
  },
]

export default function RepartidorHistorialPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-highlight/30 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">Historial de entregas</h2>
        <p className="mt-2 text-sm text-gray-600">
          Revisa tus últimos servicios y mantén niveles de excelencia. Usa el feedback para compartir mejores
          prácticas con el equipo.
        </p>
      </header>

      <section className="space-y-3">
        {history.map((item) => (
          <article key={item.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{item.id}</h3>
                <p className="text-xs uppercase tracking-wider text-gray-400">Entrega completada</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {item.deliveredAt}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-1 text-yellow-400">
              {Array.from({ length: 5 }).map((_, index) => (
                <svg
                  key={index}
                  className={`h-4 w-4 ${index < item.rating ? 'fill-current' : 'stroke-current text-gray-300'}`}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81H7.03a1 1 0 00.95-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="mt-3 text-sm text-gray-600 italic">“{item.feedback}”</p>
          </article>
        ))}
      </section>
    </div>
  )
}

