import dynamic from 'next/dynamic'

const BookingForm = dynamic(() => import('../../components/public/BookingForm'), { ssr: false })

export default function BookingPage() {
  return (
    <section className="container">
      <div className="card p-4 sm:p-6">
        <BookingForm />
      </div>
    </section>
  )
}
