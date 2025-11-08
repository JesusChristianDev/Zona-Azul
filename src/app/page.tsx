import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-accent py-20 sm:py-28 lg:py-32">
        <div className="absolute inset-0 bg-[url('/images/salad.svg')] opacity-5 bg-no-repeat bg-center bg-contain"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center text-white">
            <div className="inline-block mb-6 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
              <span className="text-sm font-semibold uppercase tracking-wider">Bienestar Integral</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 leading-tight">
              Tu Zona Azul personal
              <br />
              <span className="text-accent">comienza aquí</span>
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
              Más que comida saludable: un espacio y guía para mejorar hábitos y resultados. 
              Planes personalizados, acompañamiento nutricional y comunidad comprometida.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/booking"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary font-semibold rounded-lg hover:bg-white/90 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1 text-base sm:text-lg min-w-[200px]"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Agendar diagnóstico
              </Link>
              <Link
                href="/menu"
                className="inline-flex items-center justify-center px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-all text-base sm:text-lg min-w-[200px]"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Explorar Menú
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Propuesta de Valor */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Zona Azul es más que comida saludable
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Es un espacio y guía para mejorar hábitos y resultados. Transformamos tu rutina en un hábito azul: 
              fácil, humano y sostenible.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: '🎯',
                title: 'Planes Personalizados',
                description: 'Nutricionistas dedicados crean planes que se adaptan a ti, no al revés. Cada plato es un paso más cerca de tus metas.',
                color: 'from-primary to-primary/80',
              },
              {
                icon: '🤝',
                title: 'Acompañamiento Constante',
                description: 'No lo haces en solitario. Seguimiento semanal, ajustes en tiempo real y feedback continuo para mantener tu momentum.',
                color: 'from-accent to-accent/80',
              },
              {
                icon: '📊',
                title: 'Seguimiento 360°',
                description: 'Dashboards intuitivos que muestran tu progreso: calorías, hidratación, peso y energía. Pequeñas victorias diarias, resultados que permanecen.',
                color: 'from-highlight to-highlight/80',
              },
              {
                icon: '🌱',
                title: 'Comunidad Activa',
                description: 'Retos gamificados, logros compartidos y contenido motivador. Celebra cada avance sin juicios junto a personas con objetivos similares.',
                color: 'from-green-500 to-green-600',
              },
              {
                icon: '🍽️',
                title: 'Carta Dinámica',
                description: '10+ platos iniciales diseñados por nutricionistas. Bowl Vitalidad, Ensalada Omega, Wrap Proteico y más. Fresco, balanceado y delicioso.',
                color: 'from-purple-500 to-purple-600',
              },
              {
                icon: '🚀',
                title: 'Escalabilidad',
                description: 'Fundamentos listos para expansión física, alianzas con gimnasios y presencia omnicanal. Tu bienestar tiene un mapa, tracémoslo juntos.',
                color: 'from-blue-500 to-blue-600',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-primary/20 transform hover:-translate-y-1"
              >
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed text-center">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planes de Suscripción */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Elige tu plan de bienestar
            </h2>
            <p className="text-lg text-gray-600">
              Tres niveles diseñados para acompañarte en cada etapa de tu transformación
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {[
              {
                name: 'Esencial',
                price: '€69',
                period: '/mes',
                features: [
                  'Diagnóstico mensual con nutricionista',
                  '5 comidas saludables por semana',
                  'Métricas básicas de progreso',
                  'Acceso a la app PWA',
                  'Soporte por email',
                ],
                cta: 'Comenzar',
                popular: false,
              },
              {
                name: 'Intensivo',
                price: '€119',
                period: '/mes',
                features: [
                  'Check-in quincenal con nutricionista',
                  '10 comidas saludables por semana',
                  'Panel de progreso completo',
                  'Acceso a retos gamificados',
                  'Soporte prioritario',
                  'Sesiones grupales online',
                ],
                cta: 'Más Popular',
                popular: true,
              },
              {
                name: 'Elite',
                price: '€189',
                period: '/mes',
                features: [
                  'Nutricionista dedicado semanal',
                  '14 comidas saludables por semana',
                  'Sesiones breathwork/fitness aliadas',
                  'Chat prioritario 24/7',
                  'Beneficios cruzados con gimnasios',
                  'Contenido educativo exclusivo',
                ],
                cta: 'Premium',
                popular: false,
              },
            ].map((plan, index) => (
              <div
                key={index}
                className={`relative bg-white rounded-2xl p-6 lg:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 ${
                  plan.popular
                    ? 'border-primary scale-105 lg:scale-110 z-10'
                    : 'border-gray-200 hover:border-primary/50'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-xs font-semibold">
                    Más Popular
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                      <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/booking"
                  className={`block w-full text-center py-3 px-6 rounded-lg font-semibold transition-all ${
                    plan.popular
                      ? 'bg-primary text-white hover:bg-primary/90 shadow-lg'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Estadísticas */}
      <section className="py-16 sm:py-20 bg-gradient-to-r from-primary via-accent to-primary text-white">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-3 gap-8 lg:gap-12 max-w-5xl mx-auto text-center">
            <div>
              <div className="text-5xl sm:text-6xl font-bold mb-3">2500+</div>
              <p className="text-lg text-white/90">Personas acompañadas</p>
            </div>
            <div>
              <div className="text-5xl sm:text-6xl font-bold mb-3">1500+</div>
              <p className="text-lg text-white/90">Planes personalizados entregados</p>
            </div>
            <div>
              <div className="text-5xl sm:text-6xl font-bold mb-3">100%</div>
              <p className="text-lg text-white/90">Enfoque motivador y empático</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary/5 via-accent/5 to-highlight/5 rounded-3xl p-8 sm:p-12 border border-primary/20">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              ¿Listo para activar tu Zona Azul?
            </h2>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Haz match con tu nutricionista, tu menú y tu próximo objetivo. 
              Tu progreso importa. Aquí celebramos cada avance sin juicios.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/booking"
                className="inline-flex items-center justify-center px-8 py-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Solicitar acompañamiento
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
