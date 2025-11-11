import { NextRequest, NextResponse } from 'next/server'
import { getUsersByRole } from '../../../lib/db'

export const dynamic = 'force-dynamic'

// GET - Obtener nutricionistas (endpoint público para agendar citas)
export async function GET(request: NextRequest) {
  try {
    // Este endpoint es público - no requiere autenticación
    // Cualquiera puede ver la lista de nutricionistas para agendar citas
    const allNutritionists = await getUsersByRole('nutricionista')
    const nutritionists = allNutritionists.map(({ password_hash, ...user }) => user)

    return NextResponse.json({ nutritionists })
  } catch (error: any) {
    console.error('Error fetching nutritionists:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    return NextResponse.json(
      { error: 'Error al obtener nutricionistas', details: error?.message },
      { status: 500 }
    )
  }
}

