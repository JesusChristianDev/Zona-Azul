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
          schedule_mode: 'continuous',
          monday_start_hour: 9,
          monday_end_hour: 18,
          monday_second_start_hour: null,
          monday_second_end_hour: null,
          monday_enabled: true,
          tuesday_start_hour: 9,
          tuesday_end_hour: 18,
          tuesday_second_start_hour: null,
          tuesday_second_end_hour: null,
          tuesday_enabled: true,
          wednesday_start_hour: 9,
          wednesday_end_hour: 18,
          wednesday_second_start_hour: null,
          wednesday_second_end_hour: null,
          wednesday_enabled: true,
          thursday_start_hour: 9,
          thursday_end_hour: 18,
          thursday_second_start_hour: null,
          thursday_second_end_hour: null,
          thursday_enabled: true,
          friday_start_hour: 9,
          friday_end_hour: 18,
          friday_second_start_hour: null,
          friday_second_end_hour: null,
          friday_enabled: true,
          saturday_start_hour: null,
          saturday_end_hour: null,
          saturday_second_start_hour: null,
          saturday_second_end_hour: null,
          saturday_enabled: false,
          sunday_start_hour: null,
          sunday_end_hour: null,
          sunday_second_start_hour: null,
          sunday_second_end_hour: null,
          sunday_enabled: false,
          slot_duration_minutes: 60,
        }
      })
    }

    return NextResponse.json({ schedule: { schedule_mode: 'continuous', ...schedule } })
  } catch (error: any) {
    console.error('Error fetching nutritionist schedule:', error)
    return NextResponse.json(
      { error: 'Error al obtener horarios', details: error?.message },
      { status: 500 }
    )
  }
}

