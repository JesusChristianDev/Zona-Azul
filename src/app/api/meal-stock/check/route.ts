import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// POST: Verificar y actualizar stock de todos los platos (ejecutar periódicamente)
export async function POST(request: NextRequest) {
  try {
    // Obtener todos los platos con stock
    const { data: allStock, error: stockError } = await supabase
      .from('meal_stock')
      .select(`
        *,
        meals:meal_id (
          id,
          name,
          available
        )
      `)

    if (stockError) {
      console.error('Error fetching stock:', stockError)
      return NextResponse.json(
        { error: 'Error al obtener stock' },
        { status: 500 }
      )
    }

    const results = []

    for (const stock of allStock || []) {
      // Si está sin stock y no se ha notificado, notificar
      if (stock.is_out_of_stock && !stock.nutritionist_notified) {
        // Obtener nutricionistas
        const { data: nutritionists } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'nutricionista')

        if (nutritionists && nutritionists.length > 0) {
          for (const nutritionist of nutritionists) {
            await supabase
              .from('notifications_log')
              .insert({
                user_id: nutritionist.id,
                notification_type: 'stock_alert',
                title: '⚠️ Plato sin stock',
                message: `El plato "${stock.meals?.name || 'N/A'}" se ha quedado sin stock y ha sido bloqueado automáticamente.`,
                is_mandatory: false,
              })
          }

          // Marcar como notificado
          await supabase
            .from('meal_stock')
            .update({
              nutritionist_notified: true,
              nutritionist_notified_at: new Date().toISOString(),
            })
            .eq('id', stock.id)

          // Bloquear el plato (marcar como no disponible)
          await supabase
            .from('meals')
            .update({ available: false })
            .eq('id', stock.meal_id)

          results.push({
            meal_id: stock.meal_id,
            meal_name: stock.meals?.name,
            action: 'blocked_and_notified',
          })
        }
      }
    }

    return NextResponse.json({
      message: 'Verificación de stock completada',
      results,
      total_checked: allStock?.length || 0,
      total_blocked: results.length,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al verificar stock' },
      { status: 500 }
    )
  }
}


