import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { WeeklyMenu } from '@/lib/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET: Obtener menús semanales
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const weekStart = searchParams.get('week_start')
    const status = searchParams.get('status')

    let query = supabase
      .from('weekly_menus')
      .select(`
        *,
        weekly_menu_days (
          id,
          day_name,
          day_number,
          date,
          weekly_menu_day_meals (
            id,
            meal_id,
            meal_type,
            order_index,
            is_original,
            meals:meal_id (
              id,
              name,
              description,
              type,
              calories,
              protein,
              carbs,
              fats,
              image_url
            )
          )
        )
      `)
      .order('week_start_date', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (weekStart) {
      query = query.eq('week_start_date', weekStart)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching weekly menus:', error)
      return NextResponse.json(
        { error: 'Error al obtener menús semanales' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener menús' },
      { status: 500 }
    )
  }
}


