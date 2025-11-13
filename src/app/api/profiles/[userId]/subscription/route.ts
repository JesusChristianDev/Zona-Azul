import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getProfileByUserId, createOrUpdateProfile } from '@/lib/db'

export const dynamic = 'force-dynamic'

// PATCH - Actualizar estado de suscripción (solo admin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const cookieStore = await cookies()
    const role = cookieStore.get('user_role')?.value

    // Solo admin puede actualizar suscripciones
    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado. Solo administradores pueden modificar suscripciones.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { subscription_status, subscription_end_date } = body

    if (!subscription_status || !['active', 'inactive', 'expired'].includes(subscription_status)) {
      return NextResponse.json(
        { error: 'Estado de suscripción inválido. Debe ser: active, inactive o expired' },
        { status: 400 }
      )
    }

    // Obtener perfil actual o crear uno nuevo
    const currentProfile = await getProfileByUserId(params.userId)
    
    const profile = await createOrUpdateProfile(params.userId, {
      subscription_status: subscription_status as 'active' | 'inactive' | 'expired',
      subscription_end_date: subscription_end_date || null,
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Error al actualizar suscripción' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      profile,
      message: `Suscripción actualizada a: ${subscription_status}` 
    })
  } catch (error: any) {
    console.error('Error updating subscription:', error)
    return NextResponse.json(
      { error: 'Error al actualizar suscripción', details: error?.message },
      { status: 500 }
    )
  }
}

