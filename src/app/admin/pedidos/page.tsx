const globalOrders = [
  {
    id: 'PED-00192',
    customer: 'Valeria Mendoza',
    role: 'Suscriptor',
    status: 'Preparando',
    eta: '20 min',
    channel: 'App PWA',
  },
  {
    id: 'PED-00191',
    customer: 'Corporativo Atlas',
    role: 'Ocasional',
    status: 'Entregado',
    eta: '—',
    channel: 'Kiosk restaurante',
  },
  {
    id: 'PED-00190',
    customer: 'Carlos Ramírez',
    role: 'Suscriptor',
    status: 'Despachado',
    eta: '45 min',
    channel: 'App PWA',
  },
]

export default function AdminPedidosPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-highlight/30 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">Pedidos globales</h2>
        <p className="mt-2 text-sm text-gray-600">
          Supervisa pedidos en tiempo real e identifica cuellos de botella entre cocina, nutrición y reparto.
          Esta vista consolida datos de la app y puntos físicos.
        </p>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        {globalOrders.map((order) => (
          <article key={order.id} className="rounded-2xl border border-gray-100 p-4 transition hover:border-primary/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Pedido {order.id}{' '}
                  <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    {order.channel}
                  </span>
                </h3>
                <p className="text-sm text-gray-500">
                  Cliente: <span className="font-semibold text-gray-900">{order.customer}</span> · Rol: {order.role}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  order.status === 'Entregado'
                    ? 'bg-primary/10 text-primary'
                    : order.status === 'Preparando'
                    ? 'bg-highlight/10 text-highlight'
                    : 'bg-accent/10 text-accent'
                }`}
              >
                {order.status}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
              <span>
                ETA: <strong className="text-gray-700">{order.eta}</strong>
              </span>
              <div className="flex gap-2">
                <button className="rounded-full border border-gray-200 px-3 py-1 font-medium text-gray-600 hover:border-primary hover:text-primary transition">
                  Ver detalle
                </button>
                <button className="rounded-full border border-gray-200 px-3 py-1 font-medium text-gray-600 hover:border-highlight hover:text-highlight transition">
                  Escalar incidencia
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}

