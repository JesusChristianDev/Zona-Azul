import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Subscription } from '@/lib/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET: Obtener suscripciones (filtradas por usuario si es suscriptor)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('subscriptions')
      .select(`
        *,
        subscription_plans:plan_id (
          id,
          name,
          duration_months,
          base_price,
          price_per_meal_per_month,
          discount_percentage
        ),
        subscription_groups:group_id (
          id,
          name,
          group_type,
          primary_user_id
        ),
        users:user_id (
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching subscriptions:', error)
      return NextResponse.json(
        { error: 'Error al obtener suscripciones' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener suscripciones' },
      { status: 500 }
    )
  }
}

// POST: Crear una nueva suscripción (solo admin puede activar)
export async function POST(request: NextRequest) {
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const role = cookieStore.get('user_role')?.value

    // Solo el admin puede crear/activar suscripciones
    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo el administrador puede crear y activar suscripciones' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { user_id, plan_id, group_id, group_type, meals_per_day } = body

    // Validar campos requeridos
    if (!user_id || !plan_id) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: user_id, plan_id' },
        { status: 400 }
      )
    }

    // Validar meals_per_day
    const mealsPerDay = meals_per_day === 2 ? 2 : 1

    // Obtener el plan para calcular el precio
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .single()

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Plan de suscripción no encontrado' },
        { status: 404 }
      )
    }

    // Calcular precio base según comidas por día y duración
    // Precio por comida por mes: 150€
    // Precio especial para 2 comidas/día por mes: 275€ (no 300€)
    const pricePerMealPerMonth = plan.price_per_meal_per_month || (plan.base_price / plan.duration_months)
    
    let basePrice: number
    if (mealsPerDay === 2) {
      // Precio especial: 275€ por mes para 2 comidas (en lugar de 300€)
      basePrice = 275.00 * plan.duration_months
    } else {
      // Precio normal: 150€ por comida por mes
      basePrice = pricePerMealPerMonth * mealsPerDay * plan.duration_months
    }

    // Calcular precio con descuento
    const discountAmount = (basePrice * plan.discount_percentage) / 100
    const finalPrice = basePrice - discountAmount

    // Si es un grupo, crear o obtener el grupo
    let groupId = group_id || null
    if (group_type && group_type !== 'individual') {
      // Crear grupo si no existe
      const { data: newGroup, error: groupError } = await supabase
        .from('subscription_groups')
        .insert({
          group_type,
          primary_user_id: user_id,
          discount_percentage: 0, // Admin puede modificar después
          is_active: true,
        })
        .select()
        .single()

      if (groupError) {
        return NextResponse.json(
          { error: 'Error al crear grupo de suscripción' },
          { status: 500 }
        )
      }

      groupId = newGroup.id

      // Agregar usuario como miembro principal del grupo
      await supabase
        .from('subscription_group_members')
        .insert({
          group_id: groupId,
          user_id,
          is_primary: true,
          meals_per_week: 7,
        })
    }

    // Calcular fechas
    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + plan.duration_months)

    // Crear suscripción
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id,
        plan_id,
        group_id: groupId,
        status: 'pending_approval',
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        price: finalPrice,
        discount_applied: plan.discount_percentage,
        meals_per_day: mealsPerDay,
        admin_approved: false,
        nutricionista_approved: false,
        requires_consultation: true,
        consultation_completed: false,
      })
      .select(`
        *,
        subscription_plans:plan_id (
          id,
          name,
          duration_months,
          base_price,
          price_per_meal_per_month,
          discount_percentage
        )
      `)
      .single()

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError)
      return NextResponse.json(
        { error: 'Error al crear suscripción' },
        { status: 500 }
      )
    }

    return NextResponse.json(subscription, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al crear suscripción' },
      { status: 500 }
    )
  }
}


