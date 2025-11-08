const mockOrders = [
  {
    id: 'PED-20241108-01',
    status: 'En camino',
    eta: '35 min',
    totalCalories: 620,
    items: ['Bowl Vitalidad', 'Smoothie Verde'],
    notes: 'Entrega sin contacto',
  },
  {
    id: 'PED-20241106-02',
    status: 'Entregado',
    eta: '—',
    totalCalories: 540,
    items: ['Wrap Proteico', 'Infusión Antioxidante'],
    notes: 'Recibido por el cliente',
  },
  {
    id: 'PED-20241103-04',
    status: 'Programado',
    eta: 'Mañana 12:30',
    totalCalories: 710,
    items: ['Ensalada Omega', 'Agua alcalina'],
    notes: 'Añadir cubiertos de bambú',
  },
]

export default function SuscriptorPedidosPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-accent/30 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">Pedidos y entregas</h2>
        <p className="mt-2 text-sm text-gray-600">
          Realiza seguimiento de tus pedidos activos, consulta el historial y agrega notas para el equipo de
          repartidores.
        </p>
      </header>

      <div className="space-y-4">
        {mockOrders.map((order) => (
          <article key={order.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Pedido #{order.id}</h3>
                <p className="text-xs uppercase tracking-wider text-gray-400">Calorías totales {order.totalCalories}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  order.status === 'Entregado'
                    ? 'bg-primary/10 text-primary'
                    : order.status === 'En camino'
                    ? 'bg-highlight/10 text-highlight'
                    : 'bg-accent/10 text-accent'
                }`}
              >
                {order.status}
              </span>
            </div>
            <ul className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-600">
              {order.items.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-gray-200 bg-slate-50 px-3 py-1 text-xs font-medium"
                >
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
              <span>
                <strong className="text-gray-700">ETA:</strong> {order.eta}
              </span>
              <span className="italic">Notas: {order.notes}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

