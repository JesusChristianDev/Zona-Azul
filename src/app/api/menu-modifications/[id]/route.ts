import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET: Obtener una modificación específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const modificationId = params.id

    const { data, error } = await supabase
      .from('menu_modifications')
      .select(`
        *,
        original_meal:original_meal_id (
          id,
          name,
          description,
          type,
          calories,
          protein,
          carbs,
          fats,
          image_url
        ),
        requested_meal:requested_meal_id (
          id,
          name,
          description,
          type,
          calories,
          protein,
          carbs,
          fats,
          image_url
        ),
        weekly_menus:weekly_menu_id (
          id,
          user_id,
          week_start_date,
          week_end_date
        )
      `)
      .eq('id', modificationId)
      .single()

    if (error) {
      console.error('Error fetching modification:', error)
      return NextResponse.json(
        { error: 'Modificación no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener modificación' },
      { status: 500 }
    )
  }
}

// PATCH: Aprobar o rechazar modificación (solo nutricionista)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const modificationId = params.id
    const body = await request.json()
    const { approved_by, status, rejection_reason, nutritionist_recommendation } = body

    if (!approved_by || !status) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: approved_by, status' },
        { status: 400 }
      )
    }

    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json(
        { error: 'El estado debe ser "approved" o "rejected"' },
        { status: 400 }
      )
    }

    // Verificar que el usuario que aprueba es nutricionista
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', approved_by)
      .single()

    if (!user || user.role !== 'nutricionista') {
      return NextResponse.json(
        { error: 'Solo los nutricionistas pueden aprobar o rechazar modificaciones' },
        { status: 403 }
      )
    }

    // Obtener la modificación actual
    const { data: modification, error: modError } = await supabase
      .from('menu_modifications')
      .select('*')
      .eq('id', modificationId)
      .single()

    if (modError || !modification) {
      return NextResponse.json(
        { error: 'Modificación no encontrada' },
        { status: 404 }
      )
    }

    if (modification.status !== 'pending') {
      return NextResponse.json(
        { error: 'Esta modificación ya ha sido procesada' },
        { status: 400 }
      )
    }

    // Actualizar modificación
    const updateData: any = {
      status,
      approved_by,
      approved_at: new Date().toISOString(),
    }

    if (status === 'rejected' && rejection_reason) {
      updateData.rejection_reason = rejection_reason
    }

    if (nutritionist_recommendation) {
      updateData.nutritionist_recommendation = nutritionist_recommendation
    }

    const { data: updated, error: updateError } = await supabase
      .from('menu_modifications')
      .update(updateData)
      .eq('id', modificationId)
      .select(`
        *,
        original_meal:original_meal_id (
          id,
          name,
          description,
          type,
          calories,
          image_url
        ),
        requested_meal:requested_meal_id (
          id,
          name,
          description,
          type,
          calories,
          image_url
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating modification:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar modificación' },
        { status: 500 }
      )
    }

    // Si fue aprobada, actualizar el menú semanal
    if (status === 'approved') {
      // Obtener el día del menú
      const { data: menuDay } = await supabase
        .from('weekly_menu_days')
        .select('id')
        .eq('weekly_menu_id', modification.weekly_menu_id)
        .eq('day_number', modification.day_number)
        .single()

      if (menuDay) {
        // Buscar la comida original en el día
        const { data: originalMealInDay } = await supabase
          .from('weekly_menu_day_meals')
          .select('id')
          .eq('weekly_menu_day_id', menuDay.id)
          .eq('meal_id', modification.original_meal_id)
          .eq('meal_type', modification.meal_type)
          .single()

        if (originalMealInDay) {
          // Actualizar la comida en el menú
          await supabase
            .from('weekly_menu_day_meals')
            .update({
              meal_id: modification.requested_meal_id,
              is_original: false,
              original_meal_id: modification.original_meal_id,
            })
            .eq('id', originalMealInDay.id)

          // Actualizar estado del menú semanal
          await supabase
            .from('weekly_menus')
            .update({ status: 'modified' })
            .eq('id', modification.weekly_menu_id)

          // Registrar en historial
          await supabase
            .from('menu_history')
            .insert({
              weekly_menu_id: modification.weekly_menu_id,
              user_id: modification.user_id,
              action_type: 'modified',
              original_meal_id: modification.original_meal_id,
              new_meal_id: modification.requested_meal_id,
              action_by: modification.user_id,
              notes: `Modificación aprobada por nutricionista`,
            })
        }
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al procesar modificación' },
      { status: 500 }
    )
  }
}


