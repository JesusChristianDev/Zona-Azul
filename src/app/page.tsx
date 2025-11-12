import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-accent py-16 sm:py-20 md:py-24 lg:py-28">
        <div className="absolute inset-0 bg-[url('/images/salad.svg')] opacity-5 bg-no-repeat bg-center bg-contain"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center text-white">
            <div className="inline-block mb-4 sm:mb-6 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
              <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider">Bienestar Integral</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 leading-tight px-2">
              Tu Zona Azul personal
              <br />
              <span className="text-accent">comienza aquí</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-4">
              Más que comida saludable: un espacio y guía para mejorar hábitos y resultados. 
              Planes personalizados, acompañamiento nutricional y comunidad comprometida.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
              <Link
                href="/booking"
                className="inline-flex items-center justify-center w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-primary font-semibold rounded-lg hover:bg-white/90 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1 text-sm sm:text-base md:text-lg"
                prefetch={true}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Agendar diagnóstico
              </Link>
              <Link
                href="/menu"
                className="inline-flex items-center justify-center w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-all text-sm sm:text-base md:text-lg"
                prefetch={true}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Explorar Menú
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo Funciona - Proceso Paso a Paso */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-white via-gray-50/30 to-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Tu transformación en 3 pasos simples
            </h2>
            <p className="text-base sm:text-lg text-gray-600 px-4">
              Un proceso claro y acompañado desde el primer día
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-12 relative">
              {/* Línea conectora solo en desktop */}
              <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-primary via-accent to-primary -z-10"></div>
              
              {[
                {
                  step: "01",
                  title: "Agenda tu diagnóstico",
                  description: "Reserva una consulta gratuita con un nutricionista. Hablamos de tus objetivos, hábitos y estilo de vida.",
                  icon: "📅",
                  duration: "30 min",
                  color: "from-primary to-primary/80"
                },
                {
                  step: "02",
                  title: "Recibe tu plan personalizado",
                  description: "En 48h tendrás tu plan de comidas, objetivos y estrategias adaptadas a ti. Sin dietas genéricas.",
                  icon: "📋",
                  duration: "48h",
                  color: "from-accent to-accent/80"
                },
                {
                  step: "03",
                  title: "Acompañamiento continuo",
                  description: "Seguimiento semanal, ajustes en tiempo real y comunidad que te motiva. No estás solo en esto.",
                  icon: "🤝",
                  duration: "Continuo",
                  color: "from-highlight to-highlight/80"
                }
              ].map((step, idx) => (
                <div key={idx} className="relative">
                  <div className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-8 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-primary/20 transform hover:-translate-y-1 h-full">
                    <div className="flex flex-col items-center text-center">
                      {/* Número de paso */}
                      <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shadow-lg mb-3 sm:mb-4`}>
                        {step.step}
                      </div>
                      
                      {/* Icono */}
                      <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">{step.icon}</div>
                      
                      {/* Título */}
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 px-2">{step.title}</h3>
                      
                      {/* Descripción */}
                      <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4 px-2">{step.description}</p>
                      
                      {/* Duración */}
                      <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 bg-gray-100 rounded-full">
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-medium text-gray-700">{step.duration}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Propuesta de Valor */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-primary/5 via-white to-accent/5 relative overflow-hidden border-y border-primary/10">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">
              Zona Azul es más que comida saludable
            </h2>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed px-4">
              Es un espacio y guía para mejorar hábitos y resultados. Transformamos tu rutina en un hábito azul: 
              fácil, humano y sostenible.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-6xl mx-auto">
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
                className="group bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-primary/20 transform hover:-translate-y-1 h-full flex flex-col"
              >
                <div className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-xl sm:rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-2xl sm:text-3xl shadow-lg group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 text-center">{feature.title}</h3>
                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed text-center flex-grow">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planes de Suscripción */}
      <section className="py-12 sm:py-16 md:py-20 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(29,78,216,0.03),transparent_50%)]"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">
              Elige tu plan de bienestar
            </h2>
            <p className="text-base sm:text-lg text-gray-600 px-4">
              Tres niveles diseñados para acompañarte en cada etapa de tu transformación
            </p>
          </div>

          <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-6xl mx-auto">
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
                className={`relative bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 ${
                  plan.popular
                    ? 'border-primary md:scale-105 lg:scale-110 z-10'
                    : 'border-gray-200 hover:border-primary/50'
                } flex flex-col`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2 bg-primary text-white px-3 sm:px-4 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                    Más Popular
                  </div>
                )}
                <div className="text-center mb-4 sm:mb-6">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl sm:text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-sm sm:text-base text-gray-600">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 flex-grow">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-gray-600">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/booking"
                  className={`block w-full text-center py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg text-sm sm:text-base font-semibold transition-all ${
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

      {/* Testimonios / Social Proof */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-white via-slate-50/50 to-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-white to-transparent"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">
              Historias de transformación real
            </h2>
            <p className="text-base sm:text-lg text-gray-600 px-4">
              Personas que han activado su Zona Azul y están viendo resultados
            </p>
          </div>

          <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "María G.",
                role: "Suscriptora • 6 meses",
                quote: "No solo perdí 8kg, recuperé mi energía y mi relación con la comida cambió completamente. El acompañamiento semanal fue clave.",
                results: "8kg menos • +30% energía",
                rating: 5,
                avatar: "MG"
              },
              {
                name: "Carlos M.",
                role: "Suscriptor • 4 meses",
                quote: "Como deportista, necesitaba optimizar mi nutrición. El plan personalizado mejoró mi rendimiento y recuperación notablemente.",
                results: "Mejor rendimiento • Recuperación optimizada",
                rating: 5,
                avatar: "CM"
              },
              {
                name: "Ana L.",
                role: "Suscriptora • 8 meses",
                quote: "Lo mejor es que no me siento en dieta. Tengo un plan que se adapta a mi vida y objetivos. La comunidad me motiva cada día.",
                results: "12kg menos • Hábitos sostenibles",
                rating: 5,
                avatar: "AL"
              }
            ].map((testimonial, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-primary/20 flex flex-col h-full"
              >
                {/* Rating */}
                <div className="flex gap-1 mb-3 sm:mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>

                {/* Quote */}
                <p className="text-gray-700 mb-3 sm:mb-4 leading-relaxed italic text-sm sm:text-base flex-grow">
                  "{testimonial.quote}"
                </p>

                {/* Results */}
                <div className="mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-gray-100">
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {testimonial.results.split(" • ").map((result, i) => (
                      <span key={i} className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {result}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Author */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-base sm:text-lg flex-shrink-0">
                    {testimonial.avatar}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">{testimonial.name}</div>
                    <div className="text-xs sm:text-sm text-gray-600 truncate">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Estadísticas */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-primary via-primary/95 to-accent text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/salad.svg')] opacity-5 bg-no-repeat bg-center bg-contain"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 lg:gap-12 max-w-5xl mx-auto text-center">
            <div className="px-4">
              <div className="text-4xl sm:text-5xl md:text-6xl font-bold mb-2 sm:mb-3">2500+</div>
              <p className="text-sm sm:text-base md:text-lg text-white/90">Personas acompañadas</p>
            </div>
            <div className="px-4">
              <div className="text-4xl sm:text-5xl md:text-6xl font-bold mb-2 sm:mb-3">1500+</div>
              <p className="text-sm sm:text-base md:text-lg text-white/90">Planes personalizados entregados</p>
            </div>
            <div className="px-4">
              <div className="text-4xl sm:text-5xl md:text-6xl font-bold mb-2 sm:mb-3">100%</div>
              <p className="text-sm sm:text-base md:text-lg text-white/90">Enfoque motivador y empático</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ - Preguntas Frecuentes */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-white via-gray-50 to-white relative overflow-hidden border-t border-gray-200">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">
              Preguntas frecuentes
            </h2>
            <p className="text-base sm:text-lg text-gray-600 px-4">
              Resolvemos tus dudas para que tomes la mejor decisión
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4">
            {[
              {
                question: "¿Cuánto tiempo tarda en verse resultados?",
                answer: "La mayoría de nuestros suscriptores notan mejoras en energía y bienestar durante las primeras 2-3 semanas. Los resultados físicos medibles (peso, medidas) suelen aparecer entre 4-8 semanas, dependiendo de tus objetivos y compromiso con el plan."
              },
              {
                question: "¿Puedo cancelar mi suscripción en cualquier momento?",
                answer: "Sí, absolutamente. No hay compromiso de permanencia. Puedes cancelar tu suscripción en cualquier momento desde tu panel de usuario, sin penalizaciones ni preguntas."
              },
              {
                question: "¿Los planes incluyen las comidas o solo el plan nutricional?",
                answer: "Depende del plan que elijas. El plan Esencial incluye el plan nutricional personalizado y acceso a la app. Los planes Intensivo y Elite incluyen además comidas preparadas entregadas a domicilio (5, 10 o 14 comidas por semana según el plan)."
              },
              {
                question: "¿Funciona si tengo restricciones alimentarias o alergias?",
                answer: "Por supuesto. Todos nuestros planes se adaptan a restricciones alimentarias, alergias, intolerancias y preferencias (vegetariano, vegano, sin gluten, etc.). Tu nutricionista diseñará un plan específico para ti."
              },
              {
                question: "¿Qué pasa si no me gusta el plan o no funciona para mí?",
                answer: "Tienes 30 días de garantía de satisfacción. Si el plan no se adapta a ti, trabajamos contigo para ajustarlo o te devolvemos tu dinero. Tu satisfacción es nuestra prioridad."
              },
              {
                question: "¿Hay garantía de resultados?",
                answer: "Garantizamos nuestro compromiso contigo: planes personalizados, acompañamiento profesional y ajustes continuos. Los resultados dependen de múltiples factores (genética, metabolismo, adherencia), pero te acompañamos en cada paso para maximizar tus posibilidades de éxito."
              }
            ].map((faq, idx) => (
              <details
                key={idx}
                className="group bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none gap-3">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 pr-2 flex-1">
                    {faq.question}
                  </h3>
                  <svg
                    className="w-5 h-5 text-gray-500 flex-shrink-0 transition-transform group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Signals / Garantías */}
      <section className="py-8 sm:py-12 bg-gradient-to-r from-gray-50 via-white to-gray-50 border-y border-gray-200 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.015]"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
              {[
                { icon: "✓", text: "Garantía 30 días", subtext: "Satisfacción garantizada" },
                { icon: "🔒", text: "Sin compromiso", subtext: "Cancela cuando quieras" },
                { icon: "👨‍⚕️", text: "Nutricionistas certificados", subtext: "Profesionales cualificados" },
                { icon: "💳", text: "Pago seguro", subtext: "Datos protegidos" }
              ].map((trust, idx) => (
                <div key={idx} className="flex flex-col items-center px-2">
                  <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">{trust.icon}</div>
                  <div className="font-semibold text-gray-900 text-xs sm:text-sm mb-0.5 sm:mb-1">{trust.text}</div>
                  <div className="text-xs text-gray-600 leading-tight">{trust.subtext}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-white via-primary/5 to-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(29,78,216,0.05),transparent_70%)]"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary/5 via-accent/5 to-highlight/5 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 border border-primary/20">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              ¿Listo para activar tu Zona Azul?
            </h2>
            <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 leading-relaxed px-2">
              Haz match con tu nutricionista, tu menú y tu próximo objetivo. 
              Tu progreso importa. Aquí celebramos cada avance sin juicios.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <Link
                href="/booking"
                className="inline-flex items-center justify-center w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 text-sm sm:text-base"
              >
                Solicitar acompañamiento
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary/5 transition-all text-sm sm:text-base"
              >
                Acceder a la app
              </Link>
            </div>
            <p className="mt-4 text-xs sm:text-sm text-gray-500 px-4">
              Sin compromiso • Consulta gratuita • Cancela cuando quieras
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
