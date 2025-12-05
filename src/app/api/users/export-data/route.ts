import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getUserById, getProfileByUserId } from '@/lib/db'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Exportar todos los datos del usuario
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

    // Obtener datos del usuario
    const user = await getUserById(userId)
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Obtener perfil
    const profile = await getProfileByUserId(userId)

    // Obtener suscripciones
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)

    // Obtener pedidos
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)

    // Obtener progreso
    const { data: progress } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    // Obtener mensajes
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    // Obtener citas
    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .order('date_time', { ascending: false })

    // Preparar datos exportados (sin información sensible)
    const exportData = {
      export_date: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        created_at: user.created_at,
      },
      profile: profile
        ? {
            subscription_status: profile.subscription_status,
            subscription_end_date: profile.subscription_end_date,
            goals_weight: profile.goals_weight,
            goals_calories: profile.goals_calories,
            goals_water: profile.goals_water,
            address: profile.address,
            delivery_instructions: profile.delivery_instructions,
          }
        : null,
      subscriptions: subscriptions || [],
      orders: orders || [],
      progress: progress || [],
      messages: messages || [],
      appointments: appointments || [],
    }

    // Devolver como JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="zona-azul-datos-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error: any) {
    console.error('Error exporting data:', error)
    return NextResponse.json(
      {
        error: 'Error al exportar los datos',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    )
  }
}


