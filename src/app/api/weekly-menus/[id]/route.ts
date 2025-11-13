import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET: Obtener un menú semanal específico con sus días y comidas
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: weeklyMenu, error: menuError } = await supabase
      .from('weekly_menus')
      .select('*')
      .eq('id', params.id)
      .single()

    if (menuError || !weeklyMenu) {
      return NextResponse.json(
        { error: 'Menú semanal no encontrado' },
        { status: 404 }
      )
    }

    // Obtener días del menú
    const { data: days, error: daysError } = await supabase
      .from('weekly_menu_days')
      .select('*')
      .eq('weekly_menu_id', params.id)
      .order('day_number', { ascending: true })

    if (daysError) {
      console.error('Error fetching menu days:', daysError)
      return NextResponse.json(
        { error: 'Error al obtener días del menú' },
        { status: 500 }
      )
    }

    // Para cada día, obtener las comidas
    const daysWithMeals = await Promise.all(
      (days || []).map(async (day) => {
        const { data: dayMeals, error: mealsError } = await supabase
          .from('weekly_menu_day_meals')
          .select(`
            *,
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
          `)
          .eq('weekly_menu_day_id', day.id)
          .order('order_index', { ascending: true })

        if (mealsError) {
          console.error('Error fetching day meals:', mealsError)
          return { ...day, meals: [] }
        }

        return {
          ...day,
          meals: (dayMeals || []).map((dm: any) => ({
            id: dm.meals?.id || dm.meal_id,
            name: dm.meals?.name || 'Comida',
            description: dm.meals?.description,
            type: dm.meals?.type || dm.meal_type,
            meal_type: dm.meal_type,
            calories: dm.meals?.calories,
            protein: dm.meals?.protein,
            carbs: dm.meals?.carbs,
            fats: dm.meals?.fats,
            image_url: dm.meals?.image_url,
          })),
        }
      })
    )

    return NextResponse.json({
      ...weeklyMenu,
      days: daysWithMeals,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener menú semanal' },
      { status: 500 }
    )
  }
}

