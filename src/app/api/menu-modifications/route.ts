import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { MenuModification } from '@/lib/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET: Obtener modificaciones de menú
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const weeklyMenuId = searchParams.get('weekly_menu_id')
    const userId = searchParams.get('user_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('menu_modifications')
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
        ),
        weekly_menus:weekly_menu_id (
          id,
          week_start_date,
          week_end_date
        )
      `)
      .order('created_at', { ascending: false })

    if (weeklyMenuId) {
      query = query.eq('weekly_menu_id', weeklyMenuId)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching menu modifications:', error)
      return NextResponse.json(
        { error: 'Error al obtener modificaciones de menú' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener modificaciones' },
      { status: 500 }
    )
  }
}

// POST: Crear solicitud de modificación de menú
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      weekly_menu_id,
      user_id,
      day_number,
      meal_type,
      original_meal_id,
      requested_meal_id,
      nutritionist_recommendation,
    } = body

    // Validar campos requeridos
    if (!weekly_menu_id || !user_id || !day_number || !meal_type || !original_meal_id || !requested_meal_id) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Verificar que el menú semanal existe y pertenece al usuario
    const { data: weeklyMenu, error: menuError } = await supabase
      .from('weekly_menus')
      .select('*')
      .eq('id', weekly_menu_id)
      .eq('user_id', user_id)
      .single()

    if (menuError || !weeklyMenu) {
      return NextResponse.json(
        { error: 'Menú semanal no encontrado o no pertenece al usuario' },
        { status: 404 }
      )
    }

    // Verificar que no existe una modificación pendiente para el mismo día y tipo de comida
    const { data: existingModification } = await supabase
      .from('menu_modifications')
      .select('id')
      .eq('weekly_menu_id', weekly_menu_id)
      .eq('user_id', user_id)
      .eq('day_number', day_number)
      .eq('meal_type', meal_type)
      .eq('status', 'pending')
      .single()

    if (existingModification) {
      return NextResponse.json(
        { error: 'Ya existe una modificación pendiente para este día y tipo de comida' },
        { status: 400 }
      )
    }

    // Crear solicitud de modificación
    const { data, error } = await supabase
      .from('menu_modifications')
      .insert({
        weekly_menu_id,
        user_id,
        day_number: parseInt(day_number),
        meal_type,
        original_meal_id,
        requested_meal_id,
        nutritionist_recommendation: nutritionist_recommendation || null,
        status: 'pending',
      })
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

    if (error) {
      console.error('Error creating menu modification:', error)
      return NextResponse.json(
        { error: 'Error al crear solicitud de modificación' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado al crear modificación' },
      { status: 500 }
    )
  }
}


