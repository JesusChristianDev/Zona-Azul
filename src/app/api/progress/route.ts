import { NextRequest, NextResponse } from 'next/server'
import { getProgressByUserId, createOrUpdateProgress } from '../../../lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener progreso del usuario
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date') || undefined
    const endDate = searchParams.get('end_date') || undefined

    const progress = await getProgressByUserId(userId, startDate, endDate)
    return NextResponse.json({ progress })
  } catch (error) {
    console.error('Error fetching progress:', error)
    return NextResponse.json(
      { error: 'Error al obtener progreso' },
      { status: 500 }
    )
  }
}

// POST - Crear o actualizar progreso
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { date, weight, calories, water, protein, carbs, fats, mood, sleep_hours, steps, notes } = body

    if (!date) {
      return NextResponse.json(
        { error: 'La fecha es requerida' },
        { status: 400 }
      )
    }

    const progress = await createOrUpdateProgress(userId, date, {
      weight: weight ? parseFloat(weight) : undefined,
      calories: calories ? parseInt(calories) : undefined,
      water: water ? parseInt(water) : undefined,
      protein: protein ? parseFloat(protein) : undefined,
      carbs: carbs ? parseFloat(carbs) : undefined,
      fats: fats ? parseFloat(fats) : undefined,
      mood: mood || undefined,
      sleep_hours: sleep_hours ? parseFloat(sleep_hours) : undefined,
      steps: steps ? parseInt(steps) : undefined,
      notes: notes || undefined,
    })

    if (!progress) {
      return NextResponse.json(
        { error: 'Error al guardar progreso' },
        { status: 500 }
      )
    }

    return NextResponse.json({ progress }, { status: 201 })
  } catch (error) {
    console.error('Error saving progress:', error)
    return NextResponse.json(
      { error: 'Error al guardar progreso' },
      { status: 500 }
    )
  }
}

