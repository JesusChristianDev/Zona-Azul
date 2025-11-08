const assignedDeliveries = [
  {
    id: 'PED-2024-210',
    customer: 'Valeria Mendoza',
    address: 'Av. Horizonte 234, Torre B',
    schedule: '13:15',
    instructions: 'Dejar en recepción, cliente en reunión',
  },
  {
    id: 'PED-2024-208',
    customer: 'Miguel Díaz',
    address: 'Cowork Distrito Azul',
    schedule: '14:00',
    instructions: 'Solicitar código 9245 en seguridad',
  },
  {
    id: 'PED-2024-205',
    customer: 'Mariana León',
    address: 'Fitness Hub Zona Azul',
    schedule: '14:45',
    instructions: 'Entrega directa en sala 2, sesión con coach',
  },
]

export default function RepartidorPedidosPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-primary/20 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">Pedidos asignados</h2>
        <p className="mt-2 text-sm text-gray-600">
          Organiza tus entregas priorizando la experiencia del cliente. Marca incidencias para que el equipo de
          soporte actúe en minutos.
        </p>
      </header>

      <section className="space-y-3">
        {assignedDeliveries.map((delivery) => (
          <article key={delivery.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{delivery.customer}</h3>
                <p className="text-xs uppercase tracking-wider text-gray-400">{delivery.id}</p>
              </div>
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                Entrega a las {delivery.schedule}
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Dirección: <span className="font-medium text-gray-900">{delivery.address}</span>
            </p>
            <p className="mt-2 text-xs italic text-gray-500">Instrucciones: {delivery.instructions}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <button className="rounded-full border border-gray-200 px-3 py-1 font-semibold text-gray-600 hover:border-primary hover:text-primary transition">
                Iniciar ruta
              </button>
              <button className="rounded-full border border-gray-200 px-3 py-1 font-semibold text-gray-600 hover:border-highlight hover:text-highlight transition">
                Reportar incidencia
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}

