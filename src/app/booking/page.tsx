import dynamic from 'next/dynamic'

const BookingForm = dynamic(() => import('../../components/public/BookingForm'), { ssr: false })

export default function BookingPage() {
  return (
    <section className="container">
      <div className="card">
        <BookingForm />
      </div>
    </section>
  )
}
