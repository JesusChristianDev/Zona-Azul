import dynamic from 'next/dynamic'
import Link from 'next/link'

const BookingForm = dynamic(() => import('../../components/public/BookingForm'), { ssr: false })

export default function BookingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-accent">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-16 sm:py-20 lg:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <Link
              href="/"
              className="inline-flex items-center text-white/80 hover:text-white transition-colors text-sm font-medium mb-8 group"
            >
              <svg className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver al inicio
            </Link>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-6">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              <span className="text-sm font-medium uppercase tracking-wider text-white/90">Primer Paso</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-white">
              Agenda tu diagnóstico nutricional
            </h1>
            <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
              Comienza tu transformación con una consulta personalizada. 
              Nuestros nutricionistas te ayudarán a definir tus objetivos y crear un plan a tu medida.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-50 to-transparent"></div>
      </section>

      {/* Main Content */}
      <section className="py-12 sm:py-16 lg:py-20 -mt-12 relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-3 gap-8 lg:gap-10">
              {/* Form Section */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-10 lg:p-12 border border-gray-100/50 backdrop-blur-sm">
                  <div className="mb-8 pb-6 border-b border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                        Completa tu solicitud
                      </h2>
                    </div>
                    <p className="text-gray-600 text-sm sm:text-base ml-[52px]">
                      Llena el formulario y selecciona un horario disponible. Te contactaremos para confirmar tu cita.
                    </p>
                  </div>
                  <BookingForm />
                </div>
              </div>

              {/* Info Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                {/* Qué esperar */}
                <div className="bg-gradient-to-br from-primary/5 via-accent/5 to-highlight/5 rounded-3xl p-6 sm:p-7 border border-primary/10 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">¿Qué esperar?</h3>
                  </div>
                  <ul className="space-y-3.5">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-700 leading-relaxed">Análisis de tus hábitos actuales</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-700 leading-relaxed">Definición de objetivos personalizados</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-700 leading-relaxed">Recomendaciones nutricionales iniciales</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-700 leading-relaxed">Plan de acción para los próximos pasos</span>
                    </li>
                  </ul>
                </div>

                {/* Beneficios */}
                <div className="bg-white rounded-3xl shadow-sm p-6 sm:p-7 border border-gray-100/50">
                  <h3 className="text-lg font-bold text-gray-900 mb-5">Beneficios de la consulta</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 group">
                      <div className="w-11 h-11 bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110">
                        <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">Sin juicios</h4>
                        <p className="text-xs text-gray-600 leading-relaxed">Un espacio seguro para compartir tus retos y objetivos</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 group">
                      <div className="w-11 h-11 bg-gradient-to-br from-highlight/10 to-highlight/5 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110">
                        <svg className="w-5 h-5 text-highlight" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">Resultados reales</h4>
                        <p className="text-xs text-gray-600 leading-relaxed">Planes adaptados a tu estilo de vida y preferencias</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 group">
                      <div className="w-11 h-11 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">Acompañamiento</h4>
                        <p className="text-xs text-gray-600 leading-relaxed">Seguimiento continuo y ajustes en tiempo real</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA adicional */}
                <div className="bg-gradient-to-br from-primary via-primary/95 to-accent rounded-3xl p-6 sm:p-7 text-white shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold mb-2">¿Tienes preguntas?</h3>
                    <p className="text-sm text-white/90 mb-5 leading-relaxed">
                      Nuestro equipo está aquí para ayudarte en cada paso del proceso.
                    </p>
                    <Link
                      href="/menu"
                      className="inline-flex items-center justify-center w-full px-4 py-3 bg-white text-primary font-semibold rounded-xl hover:bg-white/95 transition-all shadow-md hover:shadow-lg text-sm"
                    >
                      Ver nuestra carta
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
