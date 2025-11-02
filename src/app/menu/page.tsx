import dynamic from 'next/dynamic'
import Link from 'next/link'

const RestaurantMenuGrid = dynamic(() => import('../../components/public/RestaurantMenuGrid'), { ssr: false })

export default function MenuPage() {
  return (
    <section className="container space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold">Carta del restaurante</h2>
        <Link
          href="/"
          className="text-xs sm:text-sm text-gray-600 hover:text-primary transition-colors"
        >
          ← Volver
        </Link>
      </div>

      <RestaurantMenuGrid />
    </section>
  )
}
