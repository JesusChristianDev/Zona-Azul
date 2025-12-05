import { NextRequest, NextResponse } from 'next/server'
import { getNutritionistSchedule, createOrUpdateNutritionistSchedule } from '@/lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener horarios del nutricionista
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('user_role')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Solo nutricionistas pueden ver/editar sus horarios
    if (role !== 'nutricionista' && role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    const schedule = await getNutritionistSchedule(userId)
    
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

// PATCH - Actualizar horarios del nutricionista
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('user_role')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Solo nutricionistas pueden editar sus horarios
    if (role !== 'nutricionista' && role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const scheduleMode = body.schedule_mode || 'continuous'
    
    // Validar que los horarios sean válidos
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    for (const day of days) {
      const startHour = body[`${day}_start_hour`]
      const endHour = body[`${day}_end_hour`]
      const secondStartHour = body[`${day}_second_start_hour`]
      const secondEndHour = body[`${day}_second_end_hour`]
      const enabled = body[`${day}_enabled`]

      if (enabled && (startHour === undefined || endHour === undefined)) {
        return NextResponse.json(
          { error: `Horarios incompletos para ${day}` },
          { status: 400 }
        )
      }
      
      if (enabled && startHour >= endHour) {
        return NextResponse.json(
          { error: `La hora de inicio debe ser menor que la hora de fin para ${day}` },
          { status: 400 }
        )
      }

      if (scheduleMode === 'split' && enabled) {
        if (
          secondStartHour === undefined ||
          secondEndHour === undefined ||
          secondStartHour === null ||
          secondEndHour === null
        ) {
          return NextResponse.json(
            { error: `Completa el horario de tarde para ${day}` },
            { status: 400 }
          )
        }

        if (secondStartHour >= secondEndHour) {
          return NextResponse.json(
            { error: `La hora de inicio de la tarde debe ser menor que la hora de fin para ${day}` },
            { status: 400 }
          )
        }
      }
    }

    const schedule = await createOrUpdateNutritionistSchedule(userId, { ...body, schedule_mode: scheduleMode })
    
    if (!schedule) {
      return NextResponse.json(
        { error: 'Error al guardar horarios' },
        { status: 500 }
      )
    }

    return NextResponse.json({ schedule })
  } catch (error: any) {
    console.error('Error updating nutritionist schedule:', error)
    return NextResponse.json(
      { error: 'Error al actualizar horarios', details: error?.message },
      { status: 500 }
    )
  }
}

