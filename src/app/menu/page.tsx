import dynamic from 'next/dynamic'

const RestaurantMenuGrid = dynamic(() => import('../../components/public/RestaurantMenuGrid'), { ssr: false })

export default function MenuPage() {
  return (
    <section className="container space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Carta del restaurante</h2>
        <a href="/" className="text-sm text-gray-600">Volver</a>
      </div>

      <RestaurantMenuGrid />
    </section>
  )
}
