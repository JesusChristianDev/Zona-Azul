import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { SubscriptionPlan } from '@/lib/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET: Obtener todos los planes de suscripción activos
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('duration_months', { ascending: true })

    if (error) {
      console.error('Error fetching subscription plans:', error)
      return NextResponse.json(
        { error: 'Error al obtener planes de suscripción' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener planes' },
      { status: 500 }
    )
  }
}

// POST: Crear un nuevo plan de suscripción (solo admin)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, duration_months, base_price, price_per_meal_per_month, discount_percentage, description } = body

    // Validar campos requeridos
    if (!name || !duration_months || !base_price) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: name, duration_months, base_price' },
        { status: 400 }
      )
    }

    // Validar que el nombre sea uno de los permitidos
    const validNames = ['Mensual', 'Trimestral', 'Anual']
    if (!validNames.includes(name)) {
      return NextResponse.json(
        { error: 'El nombre del plan debe ser: Mensual, Trimestral o Anual' },
        { status: 400 }
      )
    }

    // Calcular price_per_meal_per_month si no se proporciona
    const pricePerMealPerMonth = price_per_meal_per_month 
      ? parseFloat(price_per_meal_per_month)
      : parseFloat(base_price) / parseInt(duration_months)

    const { data, error } = await supabase
      .from('subscription_plans')
      .insert({
        name,
        duration_months: parseInt(duration_months),
        base_price: parseFloat(base_price),
        price_per_meal_per_month: pricePerMealPerMonth,
        discount_percentage: discount_percentage ? parseFloat(discount_percentage) : 0,
        description: description || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating subscription plan:', error)
      return NextResponse.json(
        { error: 'Error al crear plan de suscripción' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al crear plan' },
      { status: 500 }
    )
  }
}


