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
          discount_percentage
        ),
        subscription_groups:group_id (
          id,
          name,
          group_type,
          primary_user_id
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

// POST: Crear una nueva suscripción
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, plan_id, group_id, group_type } = body

    // Validar campos requeridos
    if (!user_id || !plan_id) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: user_id, plan_id' },
        { status: 400 }
      )
    }

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

    // Calcular precio con descuento
    const discountAmount = (plan.base_price * plan.discount_percentage) / 100
    const finalPrice = plan.base_price - discountAmount

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


