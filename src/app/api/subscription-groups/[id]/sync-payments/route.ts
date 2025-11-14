import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// POST: Sincronizar pagos de un grupo manualmente (si es necesario)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id

    // Obtener todas las suscripciones del grupo
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('group_id', groupId)
      .in('status', ['active', 'pending_approval'])

    if (subError) {
      console.error('Error fetching subscriptions:', subError)
      return NextResponse.json(
        { error: 'Error al obtener suscripciones del grupo' },
        { status: 500 }
      )
    }

    const results = []

    for (const subscription of subscriptions || []) {
      // Obtener plan
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', subscription.plan_id)
        .single()

      if (!plan) continue

      // Obtener grupo
      const { data: group } = await supabase
        .from('subscription_groups')
        .select('*')
        .eq('id', groupId)
        .single()

      if (!group) continue

      // Calcular nuevo precio según comidas por día
      const mealsPerDay = subscription.meals_per_day || 1
      const pricePerMealPerMonth = plan.price_per_meal_per_month || (plan.base_price / plan.duration_months)
      
      let basePrice: number
      if (mealsPerDay === 2) {
        // Precio especial: 275€ por mes para 2 comidas (en lugar de 300€)
        basePrice = 275.00 * plan.duration_months
      } else {
        // Precio normal: 150€ por comida por mes
        basePrice = pricePerMealPerMonth * mealsPerDay * plan.duration_months
      }
      
      const planDiscount = (basePrice * plan.discount_percentage) / 100
      const groupDiscount = (basePrice * group.discount_percentage) / 100
      const newPrice = basePrice - planDiscount - groupDiscount
      const totalDiscount = plan.discount_percentage + group.discount_percentage

      // Actualizar suscripción si el precio cambió
      if (subscription.price !== newPrice) {
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            price: newPrice,
            discount_applied: totalDiscount,
          })
          .eq('id', subscription.id)

        if (updateError) {
          console.error('Error updating subscription:', updateError)
          continue
        }

        // Calcular total pagado
        const { data: payments } = await supabase
          .from('payment_history')
          .select('amount')
          .eq('subscription_id', subscription.id)
          .eq('payment_status', 'completed')

        const totalPaid = payments?.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0
        const remaining = newPrice - totalPaid

        // Si hay monto restante, crear o actualizar pago pendiente
        if (remaining > 0) {
          const { data: existingPending } = await supabase
            .from('payment_history')
            .select('id')
            .eq('subscription_id', subscription.id)
            .eq('payment_status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (existingPending) {
            await supabase
              .from('payment_history')
              .update({
                amount: remaining,
                notes: 'Ajuste automático por cambio de descuento del grupo',
              })
              .eq('id', existingPending.id)
          } else {
            await supabase
              .from('payment_history')
              .insert({
                subscription_id: subscription.id,
                user_id: subscription.user_id,
                amount: remaining,
                payment_date: new Date().toISOString().split('T')[0],
                payment_status: 'pending',
                notes: 'Ajuste automático por cambio de descuento del grupo',
              })
          }
        }

        results.push({
          subscription_id: subscription.id,
          old_price: subscription.price,
          new_price: newPrice,
          updated: true,
        })
      }
    }

    return NextResponse.json({
      message: 'Pagos sincronizados correctamente',
      results,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al sincronizar pagos' },
      { status: 500 }
    )
  }
}


