import { NextRequest, NextResponse } from 'next/server'
import { getNutritionistSchedule } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Obtener horarios de un nutricionista (público para mostrar disponibilidad)
export async function GET(
  request: NextRequest,
  { params }: { params: { nutricionistaId: string } }
) {
  try {
    const schedule = await getNutritionistSchedule(params.nutricionistaId)
    
    // Si no hay horarios configurados, retornar valores por defecto
    if (!schedule) {
      return NextResponse.json({
        schedule: {
          monday_start_hour: 9,
          monday_end_hour: 18,
          monday_enabled: true,
          tuesday_start_hour: 9,
          tuesday_end_hour: 18,
          tuesday_enabled: true,
          wednesday_start_hour: 9,
          wednesday_end_hour: 18,
          wednesday_enabled: true,
          thursday_start_hour: 9,
          thursday_end_hour: 18,
          thursday_enabled: true,
          friday_start_hour: 9,
          friday_end_hour: 18,
          friday_enabled: true,
          saturday_start_hour: null,
          saturday_end_hour: null,
          saturday_enabled: false,
          sunday_start_hour: null,
          sunday_end_hour: null,
          sunday_enabled: false,
          slot_duration_minutes: 60,
        }
      })
    }

    return NextResponse.json({ schedule })
  } catch (error: any) {
    console.error('Error fetching nutritionist schedule:', error)
    return NextResponse.json(
      { error: 'Error al obtener horarios', details: error?.message },
      { status: 500 }
    )
  }
}

