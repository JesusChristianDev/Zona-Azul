const teamMembers = [
  { name: 'María Ortega', role: 'Nutricionista', clients: 32, status: 'Activa' },
  { name: 'Luis Ramírez', role: 'Administrador', clients: 0, status: 'Activa' },
  { name: 'Ana Torres', role: 'Repartidor', clients: 18, status: 'Entrenamiento' },
]

export default function AdminUsuariosPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-accent/30 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">Usuarios y roles</h2>
        <p className="mt-2 text-sm text-gray-600">
          Coordina permisos y asignaciones para cada perfil. Esta vista se integra con el flujo de onboarding
          digital y seguimiento de desempeño.
        </p>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Equipo activo</h3>
            <p className="text-sm text-gray-500">Roles conectados con dashboards y app de Zona Azul.</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition">
            Crear nuevo usuario
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {teamMembers.map((member) => (
            <article key={member.name} className="rounded-2xl border border-gray-200 p-4 transition hover:border-primary/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.role}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {member.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                <span>Clientes asignados: {member.clients}</span>
                <div className="flex gap-2">
                  <button className="rounded-full border border-gray-200 px-3 py-1 font-medium text-gray-600 hover:border-primary hover:text-primary transition">
                    Ajustar permisos
                  </button>
                  <button className="rounded-full border border-gray-200 px-3 py-1 font-medium text-gray-600 hover:border-highlight hover:text-highlight transition">
                    Enviar recordatorio
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

