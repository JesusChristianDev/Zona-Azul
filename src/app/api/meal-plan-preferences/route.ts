import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const dynamic = 'force-dynamic'

// GET: Obtener preferencias de comida/cena del usuario para un plan
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
    const mealPlanId = searchParams.get('meal_plan_id')

    if (!mealPlanId) {
      return NextResponse.json(
        { error: 'meal_plan_id es requerido' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('meal_plan_day_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('meal_plan_id', mealPlanId)

    if (error) {
      console.error('Error fetching preferences:', error)
      return NextResponse.json(
        { error: 'Error al obtener preferencias' },
        { status: 500 }
      )
    }

    // Convertir a formato más fácil de usar: { day_id: 'lunch' | 'dinner' }
    const preferences: Record<string, 'lunch' | 'dinner'> = {}
    if (data) {
      data.forEach((pref) => {
        preferences[pref.meal_plan_day_id] = pref.preferred_meal_type
      })
    }

    return NextResponse.json({ preferences })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener preferencias' },
      { status: 500 }
    )
  }
}

// POST: Guardar o actualizar preferencias de comida/cena
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

    // Verificar que sea sábado o domingo (solo se puede modificar en estos días)
    const day = new Date().getDay() // 0 = Domingo, 1 = Lunes, ..., 5 = Viernes, 6 = Sábado
    if (day !== 6 && day !== 0) {
      return NextResponse.json(
        { error: 'Solo puedes modificar tu selección los sábados y domingos' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { meal_plan_id, meal_plan_day_id, preferred_meal_type } = body

    if (!meal_plan_id || !meal_plan_day_id || !preferred_meal_type) {
      return NextResponse.json(
        { error: 'meal_plan_id, meal_plan_day_id y preferred_meal_type son requeridos' },
        { status: 400 }
      )
    }

    if (preferred_meal_type !== 'lunch' && preferred_meal_type !== 'dinner') {
      return NextResponse.json(
        { error: 'preferred_meal_type debe ser "lunch" o "dinner"' },
        { status: 400 }
      )
    }

    // Usar upsert para insertar o actualizar
    const { data, error } = await supabase
      .from('meal_plan_day_preferences')
      .upsert({
        user_id: userId,
        meal_plan_id,
        meal_plan_day_id,
        preferred_meal_type,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,meal_plan_day_id',
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving preference:', error)
      return NextResponse.json(
        { error: 'Error al guardar preferencia' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, preference: data })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al guardar preferencia' },
      { status: 500 }
    )
  }
}

