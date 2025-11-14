import { NextRequest, NextResponse } from 'next/server'
import { getAllMeals, createMeal } from '@/lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener todas las comidas del catálogo general
// Nota: 
// - is_menu_item=true: Comidas del menú del local (/menu) - compra individual
// - is_menu_item=false: Comidas para planes nutricionales - solo para suscriptores
// - available: Controla disponibilidad general
// - Para /menu: Se filtran por is_menu_item=true AND available=true
// - Para planes: Se filtran por is_menu_item=false AND available=true
export async function GET(request: NextRequest) {
  try {
    const meals = await getAllMeals()
    return NextResponse.json({ meals })
  } catch (error) {
    console.error('Error fetching meals:', error)
    return NextResponse.json(
      { error: 'Error al obtener comidas' },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo meal (admin y nutricionista)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const role = cookieStore.get('user_role')?.value

    if (role !== 'admin' && role !== 'nutricionista') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, type, calories, protein, carbs, fats, ingredients, instructions, image_url, price, available, is_menu_item } = body

    if (!name || !type || !calories) {
      return NextResponse.json(
        { error: 'Nombre, tipo y calorías son requeridos' },
        { status: 400 }
      )
    }

    const meal = await createMeal({
      name,
      description: description || null,
      type,
      calories: parseInt(calories),
      protein: protein ? parseFloat(protein) : null,
      carbs: carbs ? parseFloat(carbs) : null,
      fats: fats ? parseFloat(fats) : null,
      ingredients: ingredients || [],
      instructions: instructions || null,
      image_url: image_url || null,
      price: price ? parseFloat(price) : null,
      available: available !== undefined ? available : true,
      is_menu_item: is_menu_item !== undefined ? is_menu_item : false, // Por defecto, no es del menú del local
    })

    if (!meal) {
      return NextResponse.json(
        { error: 'Error al crear comida' },
        { status: 500 }
      )
    }

    return NextResponse.json({ meal }, { status: 201 })
  } catch (error) {
    console.error('Error creating meal:', error)
    return NextResponse.json(
      { error: 'Error al crear comida' },
      { status: 500 }
    )
  }
}

