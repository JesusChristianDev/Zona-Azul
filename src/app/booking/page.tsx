import dynamic from 'next/dynamic'
import Link from 'next/link'

const BookingForm = dynamic(() => import('../../components/public/BookingForm'), { ssr: false })

export default function BookingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-accent py-12 sm:py-16 lg:py-20">
        <div className="absolute inset-0 bg-[url('/images/salad.svg')] opacity-5 bg-no-repeat bg-center bg-contain"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center text-white">
            <div className="inline-block mb-4 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
              <span className="text-sm font-semibold uppercase tracking-wider">Primer Paso</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              Agenda tu diagnóstico nutricional
            </h1>
            <p className="text-lg sm:text-xl text-white/90 mb-6 max-w-2xl mx-auto leading-relaxed">
              Comienza tu transformación con una consulta personalizada. 
              Nuestros nutricionistas te ayudarán a definir tus objetivos y crear un plan a tu medida.
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

      {/* Main Content */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
              {/* Form Section */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 lg:p-10 border border-gray-100">
                  <div className="mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                      Completa tu solicitud
                    </h2>
                    <p className="text-gray-600">
                      Llena el formulario y selecciona un horario disponible. Te contactaremos para confirmar tu cita.
                    </p>
                  </div>
                  <BookingForm />
                </div>
              </div>

              {/* Info Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                {/* Qué esperar */}
                <div className="bg-gradient-to-br from-primary/5 via-accent/5 to-highlight/5 rounded-2xl p-6 border border-primary/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white text-xl">
                      🎯
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">¿Qué esperar?</h3>
                  </div>
                  <ul className="space-y-3 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Análisis de tus hábitos actuales</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Definición de objetivos personalizados</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Recomendaciones nutricionales iniciales</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Plan de acción para los próximos pasos</span>
                    </li>
                  </ul>
                </div>

                {/* Beneficios */}
                <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Beneficios de la consulta</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">Sin juicios</h4>
                        <p className="text-xs text-gray-600">Un espacio seguro para compartir tus retos y objetivos</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-highlight/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-highlight" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">Resultados reales</h4>
                        <p className="text-xs text-gray-600">Planes adaptados a tu estilo de vida y preferencias</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">Acompañamiento</h4>
                        <p className="text-xs text-gray-600">Seguimiento continuo y ajustes en tiempo real</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA adicional */}
                <div className="bg-gradient-to-br from-primary to-accent rounded-2xl p-6 text-white">
                  <h3 className="text-lg font-bold mb-2">¿Tienes preguntas?</h3>
                  <p className="text-sm text-white/90 mb-4">
                    Nuestro equipo está aquí para ayudarte en cada paso del proceso.
                  </p>
                  <Link
                    href="/menu"
                    className="inline-flex items-center justify-center w-full px-4 py-2 bg-white text-primary font-semibold rounded-lg hover:bg-white/90 transition-colors text-sm"
                  >
                    Ver nuestra carta
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
