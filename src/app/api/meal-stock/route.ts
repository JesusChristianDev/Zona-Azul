import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET: Obtener stock de platos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mealId = searchParams.get('meal_id')
    const outOfStock = searchParams.get('out_of_stock')

    let query = supabase
      .from('meal_stock')
      .select(`
        *,
        meals:meal_id (
          id,
          name,
          description,
          type,
          calories,
          image_url,
          available
        )
      `)
      .order('created_at', { ascending: false })

    if (mealId) {
      query = query.eq('meal_id', mealId)
    }

    if (outOfStock === 'true') {
      query = query.eq('is_out_of_stock', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching meal stock:', error)
      return NextResponse.json(
        { error: 'Error al obtener stock de platos' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener stock' },
      { status: 500 }
    )
  }
}

// POST: Crear o actualizar stock de un plato
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { meal_id, stock_quantity, min_stock_threshold } = body

    if (!meal_id || stock_quantity === undefined) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: meal_id, stock_quantity' },
        { status: 400 }
      )
    }

    // Verificar si ya existe registro de stock
    const { data: existing } = await supabase
      .from('meal_stock')
      .select('id')
      .eq('meal_id', meal_id)
      .single()

    let result
    if (existing) {
      // Actualizar stock existente
      const updateData: any = {
        stock_quantity: parseInt(stock_quantity),
      }

      if (min_stock_threshold !== undefined) {
        updateData.min_stock_threshold = parseInt(min_stock_threshold)
      }

      // El trigger actualizará automáticamente is_out_of_stock
      const { data, error } = await supabase
        .from('meal_stock')
        .update(updateData)
        .eq('id', existing.id)
        .select(`
          *,
          meals:meal_id (
            id,
            name,
            description,
            type,
            calories,
            image_url,
            available
          )
        `)
        .single()

      if (error) {
        console.error('Error updating stock:', error)
        return NextResponse.json(
          { error: 'Error al actualizar stock' },
          { status: 500 }
        )
      }

      result = data
    } else {
      // Crear nuevo registro de stock
      const { data, error } = await supabase
        .from('meal_stock')
        .insert({
          meal_id,
          stock_quantity: parseInt(stock_quantity),
          min_stock_threshold: min_stock_threshold ? parseInt(min_stock_threshold) : 5,
          is_out_of_stock: parseInt(stock_quantity) <= 0,
        })
        .select(`
          *,
          meals:meal_id (
            id,
            name,
            description,
            type,
            calories,
            image_url,
            available
          )
        `)
        .single()

      if (error) {
        console.error('Error creating stock:', error)
        return NextResponse.json(
          { error: 'Error al crear registro de stock' },
          { status: 500 }
        )
      }

      result = data
    }

    // Si el plato quedó sin stock, notificar al nutricionista
    if (result.is_out_of_stock && !result.nutritionist_notified) {
      await notifyNutritionistAboutOutOfStock(result.meal_id, result.meals?.name || 'Plato')
    }

    return NextResponse.json(result, { status: existing ? 200 : 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al gestionar stock' },
      { status: 500 }
    )
  }
}

// Función auxiliar para notificar al nutricionista
async function notifyNutritionistAboutOutOfStock(mealId: string, mealName: string) {
  try {
    // Obtener todos los nutricionistas
    const { data: nutritionists } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'nutricionista')

    if (!nutritionists || nutritionists.length === 0) return

    // Crear notificaciones para cada nutricionista
    for (const nutritionist of nutritionists) {
      // Registrar en log de notificaciones
      await supabase
        .from('notifications_log')
        .insert({
          user_id: nutritionist.id,
          notification_type: 'stock_alert',
          title: '⚠️ Plato sin stock',
          message: `El plato "${mealName}" se ha quedado sin stock y ha sido bloqueado automáticamente.`,
          is_mandatory: false,
        })

      // Marcar como notificado
      await supabase
        .from('meal_stock')
        .update({
          nutritionist_notified: true,
          nutritionist_notified_at: new Date().toISOString(),
        })
        .eq('meal_id', mealId)
    }
  } catch (error) {
    console.error('Error notifying nutritionists:', error)
  }
}


