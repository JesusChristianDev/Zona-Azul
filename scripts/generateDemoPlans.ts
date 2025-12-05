import { config } from 'dotenv'

config({ path: '.env.local', override: true })

import { generateWeeklyPlan } from '../src/lib/planGenerator'

const DEMO_PLAN_BASE_ID = '0dcb51f3-4c06-48aa-9c61-6af7d2fb1a06'
const DEMO_USERS = [
  { userId: '2c3ac638-c3b0-4d6e-92c7-188b7aa32d86', label: 'Gregorio' },
  { userId: '411dc188-0abb-4801-aaea-d94f0ade3058', label: 'Paco' },
  { userId: '588034f2-117f-433d-bfdb-1e0679df5079', label: 'Jesús Cristian' },
  { userId: 'a1b2c3d4-e5f6-4789-a012-345678901234', label: 'María García' },
  { userId: 'b2c3d4e5-f6a7-4890-b123-456789012345', label: 'Juan Pérez' },
]

function getNextWeekdayMonday(): string {
  const date = new Date()
  const day = date.getDay()
  const diff = day === 1 ? 0 : (8 - day) % 7
  date.setDate(date.getDate() + diff)
  return date.toISOString().split('T')[0]
}

async function bootstrap() {
  const weekStartDate = process.env.DEMO_WEEK_START_DATE || getNextWeekdayMonday()

  console.log('➡️  Generando planes semanales demo a partir del', weekStartDate)

  for (const demoUser of DEMO_USERS) {
    try {
      console.log(`   • Ajustando plan para ${demoUser.label} (${demoUser.userId})`)
      await generateWeeklyPlan({
        userId: demoUser.userId,
        planBaseId: DEMO_PLAN_BASE_ID,
        weekStartDate,
      })
      console.log('     ✅ Plan semanal actualizado')
    } catch (error) {
      console.error('     ❌ Error generando plan', error)
    }
  }

  console.log('✔️  Planes demo listos. Abre la app como suscriptor para ver el plan de comidas ajustado.')
}

bootstrap().catch((error) => {
  console.error('Error al generar planes demo:', error)
  process.exit(1)
})





