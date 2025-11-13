import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// POST: Enviar notificación de menú semanal a un usuario
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const weeklyMenuId = params.id

    // Obtener información del menú
    const { data: weeklyMenu, error: menuError } = await supabase
      .from('weekly_menus')
      .select('*')
      .eq('id', weeklyMenuId)
      .single()

    if (menuError || !weeklyMenu) {
      return NextResponse.json(
        { error: 'Menú semanal no encontrado' },
        { status: 404 }
      )
    }

    // Verificar preferencias de notificación del usuario
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('notifications_weekly_menu, notifications_enabled')
      .eq('user_id', weeklyMenu.user_id)
      .single()

    // Verificar si es notificación obligatoria (por defecto, los menús semanales no son obligatorios)
    const isMandatory = false // Los menús semanales respetan las preferencias del usuario

    // Si las notificaciones están deshabilitadas y NO es obligatoria, no enviar
    if (!isMandatory && userSettings && (!userSettings.notifications_enabled || !userSettings.notifications_weekly_menu)) {
      // Marcar como enviada pero sin notificar realmente
      await supabase
        .from('weekly_menus')
        .update({
          notification_sent: true,
          notification_sent_at: new Date().toISOString(),
        })
        .eq('id', weeklyMenuId)

      return NextResponse.json({
        message: 'Notificación omitida (preferencias del usuario)',
        sent: false,
      })
    }

    // Actualizar estado del menú
    await supabase
      .from('weekly_menus')
      .update({
        notification_sent: true,
        notification_sent_at: new Date().toISOString(),
      })
      .eq('id', weeklyMenuId)

    // Registrar en el log de notificaciones
    const weekStartDate = new Date(weeklyMenu.week_start_date)
    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekStartDate.getDate() + 6)

    await supabase
      .from('notifications_log')
      .insert({
        user_id: weeklyMenu.user_id,
        notification_type: 'weekly_menu',
        title: '¡Nuevo menú semanal disponible!',
        message: `Tu menú para la semana del ${weekStartDate.toLocaleDateString('es-ES')} al ${weekEndDate.toLocaleDateString('es-ES')} está listo`,
        is_mandatory: false, // Los menús semanales respetan las preferencias del usuario
      })

    return NextResponse.json({
      message: 'Notificación enviada correctamente',
      sent: true,
      user_id: weeklyMenu.user_id,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al enviar notificación' },
      { status: 500 }
    )
  }
}

