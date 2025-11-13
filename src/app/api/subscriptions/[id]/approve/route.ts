import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// POST: Aprobar suscripción (admin o nutricionista)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const subscriptionId = params.id
    const body = await request.json()
    const { approved_by, role, consultation_completed } = body

    if (!approved_by || !role) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: approved_by, role' },
        { status: 400 }
      )
    }

    // Validar rol
    if (role !== 'admin' && role !== 'nutricionista') {
      return NextResponse.json(
        { error: 'Solo administradores y nutricionistas pueden aprobar suscripciones' },
        { status: 403 }
      )
    }

    // Obtener suscripción actual
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single()

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'Suscripción no encontrada' },
        { status: 404 }
      )
    }

    // Actualizar aprobación según el rol
    const updateData: any = {}
    
    if (role === 'admin') {
      updateData.admin_approved = true
      updateData.admin_approved_by = approved_by
      updateData.admin_approved_at = new Date().toISOString()
    } else if (role === 'nutricionista') {
      updateData.nutricionista_approved = true
      updateData.nutricionista_approved_by = approved_by
      updateData.nutricionista_approved_at = new Date().toISOString()
    }

    // Si se completa la consulta
    if (consultation_completed !== undefined) {
      updateData.consultation_completed = consultation_completed
    }

    // Si ambas aprobaciones están completas, activar suscripción
    const willBeFullyApproved = 
      (role === 'admin' && subscription.nutricionista_approved) ||
      (role === 'nutricionista' && subscription.admin_approved) ||
      (updateData.admin_approved && updateData.nutricionista_approved)

    if (willBeFullyApproved && subscription.status === 'pending_approval') {
      updateData.status = 'active'
      updateData.start_date = new Date().toISOString().split('T')[0]
      
      // Calcular fecha de fin
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('duration_months')
        .eq('id', subscription.plan_id)
        .single()

      if (plan) {
        const endDate = new Date()
        endDate.setMonth(endDate.getMonth() + plan.duration_months)
        updateData.end_date = endDate.toISOString().split('T')[0]
      }
    }

    // Actualizar suscripción
    const { data: updated, error: updateError } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
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

    if (updateError) {
      console.error('Error approving subscription:', updateError)
      return NextResponse.json(
        { error: 'Error al aprobar suscripción' },
        { status: 500 }
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al aprobar suscripción' },
      { status: 500 }
    )
  }
}


