import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Suspense } from 'react'

// Preload del formulario para mejorar LCP
const BookingForm = dynamic(() => import('../../components/public/BookingForm'), { 
  ssr: false,
  loading: () => (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
      <div className="h-32 bg-gray-200 rounded"></div>
    </div>
  )
})

// Skeleton para el sidebar para evitar CLS
function SidebarSkeleton() {
  return (
    <div className="lg:col-span-1 space-y-6">
      <div className="bg-gradient-to-br from-primary/5 via-accent/5 to-highlight/5 rounded-3xl p-6 sm:p-7 border border-primary/10 shadow-sm h-[280px] animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
      <div className="bg-white rounded-3xl shadow-sm p-6 sm:p-7 border border-gray-100/50 h-[320px] animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-2/3 mb-4"></div>
        <div className="space-y-4">
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
      <div className="bg-gradient-to-br from-primary via-primary/95 to-accent rounded-3xl p-6 sm:p-7 h-[180px] animate-pulse">
        <div className="h-6 bg-white/20 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-white/20 rounded w-full mb-4"></div>
        <div className="h-10 bg-white/20 rounded"></div>
      </div>
    </div>
  )
}

export default function BookingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Hero Section - Optimizado para LCP */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-accent">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" style={{ willChange: 'auto' }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" style={{ willChange: 'auto' }}></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-16 sm:py-20 lg:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <Link
              href="/"
              className="inline-flex items-center text-white/80 hover:text-white transition-colors text-sm font-medium mb-8 group"
              prefetch={true}
            >
              <svg className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver al inicio
            </Link>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-6">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              <span className="text-sm font-medium uppercase tracking-wider text-white/90">Primer Paso</span>
            </div>
            {/* H1 optimizado para LCP */}
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
            <div className="max-w-4xl mx-auto">
              {/* Form Section */}
              <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 lg:p-12 border border-gray-100/50 backdrop-blur-sm">
                <div className="mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                        Completa tu solicitud
                      </h2>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm sm:text-base ml-0 sm:ml-[52px] mt-3 sm:mt-0">
                    Llena el formulario y selecciona un horario disponible. Te contactaremos para confirmar tu cita.
                  </p>
                </div>
                <div>
                  <Suspense fallback={
                    <div className="space-y-6 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-10 bg-gray-200 rounded"></div>
                      <div className="h-10 bg-gray-200 rounded"></div>
                      <div className="h-10 bg-gray-200 rounded"></div>
                      <div className="h-32 bg-gray-200 rounded"></div>
                    </div>
                  }>
                    <BookingForm />
                  </Suspense>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
