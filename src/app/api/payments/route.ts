import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { PaymentHistory } from '@/lib/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET: Obtener historial de pagos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get('subscription_id')
    const userId = searchParams.get('user_id')
    const paymentStatus = searchParams.get('payment_status')

    let query = supabase
      .from('payment_history')
      .select(`
        *,
        subscriptions:subscription_id (
          id,
          user_id,
          plan_id,
          status,
          subscription_plans:plan_id (
            name,
            duration_months
          )
        )
      `)
      .order('payment_date', { ascending: false })

    if (subscriptionId) {
      query = query.eq('subscription_id', subscriptionId)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching payment history:', error)
      return NextResponse.json(
        { error: 'Error al obtener historial de pagos' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener historial de pagos' },
      { status: 500 }
    )
  }
}

// POST: Registrar un nuevo pago (para pagos externos)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      subscription_id,
      user_id,
      amount,
      payment_date,
      payment_method,
      payment_status,
      external_payment_id,
      installment_number,
      total_installments,
      notes,
    } = body

    // Validar campos requeridos
    if (!subscription_id || !user_id || !amount || !payment_date) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: subscription_id, user_id, amount, payment_date' },
        { status: 400 }
      )
    }

    // Validar que la suscripción existe
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .single()

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'Suscripción no encontrada' },
        { status: 404 }
      )
    }

    // Crear registro de pago
    const { data, error } = await supabase
      .from('payment_history')
      .insert({
        subscription_id,
        user_id,
        amount: parseFloat(amount),
        payment_date,
        payment_method: payment_method || 'external_entity',
        payment_status: payment_status || 'pending',
        external_payment_id: external_payment_id || null,
        installment_number: installment_number ? parseInt(installment_number) : null,
        total_installments: total_installments ? parseInt(total_installments) : null,
        notes: notes || null,
      })
      .select(`
        *,
        subscriptions:subscription_id (
          id,
          user_id,
          plan_id,
          status,
          subscription_plans:plan_id (
            name,
            duration_months
          )
        )
      `)
      .single()

    if (error) {
      console.error('Error creating payment record:', error)
      return NextResponse.json(
        { error: 'Error al registrar pago' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al registrar pago' },
      { status: 500 }
    )
  }
}

// PATCH: Actualizar estado de pago
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { payment_id, payment_status, notes } = body

    if (!payment_id || !payment_status) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: payment_id, payment_status' },
        { status: 400 }
      )
    }

    const updateData: any = {
      payment_status,
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    const { data, error } = await supabase
      .from('payment_history')
      .update(updateData)
      .eq('id', payment_id)
      .select(`
        *,
        subscriptions:subscription_id (
          id,
          user_id,
          plan_id,
          status,
          subscription_plans:plan_id (
            name,
            duration_months
          )
        )
      `)
      .single()

    if (error) {
      console.error('Error updating payment:', error)
      return NextResponse.json(
        { error: 'Error al actualizar pago' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al actualizar pago' },
      { status: 500 }
    )
  }
}


