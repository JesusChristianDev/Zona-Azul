import dynamic from 'next/dynamic'
import Link from 'next/link'

const RestaurantMenuGrid = dynamic(() => import('../../components/public/RestaurantMenuGrid'), { ssr: false })

export default function MenuPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-accent py-12 sm:py-16 lg:py-20">
        <div className="absolute inset-0 bg-[url('/images/bowl.svg')] opacity-5 bg-no-repeat bg-center bg-contain"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center text-white">
            <div className="inline-block mb-4 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
              <span className="text-sm font-semibold uppercase tracking-wider">Carta Dinámica</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              Nuestra Carta
            </h1>
            <p className="text-lg sm:text-xl text-white/90 mb-6 max-w-2xl mx-auto leading-relaxed">
              Platos diseñados por nutricionistas, frescos y balanceados. 
              Cada receta es un paso más cerca de tus metas de bienestar.
            </p>
            <Link
              href="/"
              className="inline-flex items-center text-white/90 hover:text-white transition-colors text-sm sm:text-base"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver al inicio
            </Link>
          </div>
        </div>
      </section>

      {/* Introducción */}
      <section className="py-8 sm:py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Nutrición que se adapta a ti
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              Nuestra carta dinámica incluye platos diseñados para diferentes objetivos: 
              pérdida de peso, ganancia muscular, mantenimiento o simplemente comer más saludable. 
              Todos nuestros platos incluyen información nutricional detallada para que tomes decisiones informadas.
            </p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {[
                { icon: '🥗', label: 'Fresco y natural' },
                { icon: '⚖️', label: 'Balanceado' },
                { icon: '📊', label: 'Info nutricional' },
                { icon: '👨‍⚕️', label: 'Diseñado por expertos' },
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-lg border border-primary/20">
                  <span className="text-2xl">{feature.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{feature.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Grid de Platos */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-white to-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 sm:mb-12 text-center">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
                Explora nuestros platos
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Haz clic en cualquier plato para ver detalles completos, ingredientes y valores nutricionales
              </p>
            </div>
            <RestaurantMenuGrid />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 bg-gradient-to-br from-primary/5 via-accent/5 to-highlight/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center bg-white rounded-2xl p-8 sm:p-12 shadow-lg border border-primary/20">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              ¿Quieres un plan personalizado?
            </h2>
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              Nuestros nutricionistas pueden crear un plan semanal adaptado a tus objetivos, 
              preferencias y estilo de vida. Agenda tu consulta gratuita.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/booking"
                className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-lg hover:from-primary/90 hover:to-accent/90 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Agendar consulta
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-8 py-4 bg-white border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary/5 transition-all"
              >
                Acceder a la app
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
