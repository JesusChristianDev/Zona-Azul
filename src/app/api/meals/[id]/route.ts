import { NextRequest, NextResponse } from 'next/server'
import { getMealById, updateMeal, deleteMeal } from '../../../../lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener meal por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const meal = await getMealById(params.id)
    if (!meal) {
      return NextResponse.json(
        { error: 'Comida no encontrada' },
        { status: 404 }
      )
    }
    return NextResponse.json({ meal })
  } catch (error) {
    console.error('Error fetching meal:', error)
    return NextResponse.json(
      { error: 'Error al obtener comida' },
      { status: 500 }
    )
  }
}

// PATCH - Actualizar meal (admin y nutricionista)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const updateData: any = {}

    if (body.name) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.type) updateData.type = body.type
    if (body.calories) updateData.calories = parseInt(body.calories)
    if (body.protein !== undefined) updateData.protein = parseFloat(body.protein)
    if (body.carbs !== undefined) updateData.carbs = parseFloat(body.carbs)
    if (body.fats !== undefined) updateData.fats = parseFloat(body.fats)
    if (body.ingredients) updateData.ingredients = body.ingredients
    if (body.instructions !== undefined) updateData.instructions = body.instructions
    if (body.image_url !== undefined) updateData.image_url = body.image_url
    if (body.price !== undefined) updateData.price = parseFloat(body.price)
    if (body.available !== undefined) updateData.available = body.available

    const meal = await updateMeal(params.id, updateData)
    if (!meal) {
      return NextResponse.json(
        { error: 'Error al actualizar comida' },
        { status: 500 }
      )
    }

    return NextResponse.json({ meal })
  } catch (error) {
    console.error('Error updating meal:', error)
    return NextResponse.json(
      { error: 'Error al actualizar comida' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar meal (admin y nutricionista)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const role = cookieStore.get('user_role')?.value

    if (role !== 'admin' && role !== 'nutricionista') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    const success = await deleteMeal(params.id)
    if (!success) {
      return NextResponse.json(
        { error: 'Error al eliminar comida' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting meal:', error)
    return NextResponse.json(
      { error: 'Error al eliminar comida' },
      { status: 500 }
    )
  }
}

