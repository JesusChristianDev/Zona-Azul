import { NextRequest, NextResponse } from 'next/server'
import { getProfileByUserId, createOrUpdateProfile } from '../../../lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener perfil del usuario
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('user_role')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Si es admin, puede obtener perfil de otro usuario mediante query param
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('user_id')
    
    let profileUserId = userId
    if (targetUserId && role === 'admin') {
      // Admin puede obtener perfil de cualquier usuario
      profileUserId = targetUserId
    } else if (targetUserId && targetUserId !== userId) {
      // Usuario normal no puede obtener perfil de otro usuario
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    const profile = await getProfileByUserId(profileUserId)
    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Error al obtener perfil' },
      { status: 500 }
    )
  }
}

// POST/PATCH - Crear o actualizar perfil
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      subscription_status,
      subscription_end_date,
      goals_weight,
      goals_calories,
      goals_water,
      address,
      delivery_instructions,
    } = body

    const profile = await createOrUpdateProfile(userId, {
      subscription_status: subscription_status || 'inactive',
      subscription_end_date: subscription_end_date || null,
      goals_weight: goals_weight ? parseFloat(goals_weight) : null,
      goals_calories: goals_calories ? parseInt(goals_calories) : null,
      goals_water: goals_water ? parseInt(goals_water) : null,
      address: address || null,
      delivery_instructions: delivery_instructions || null,
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Error al guardar perfil' },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error saving profile:', error)
    return NextResponse.json(
      { error: 'Error al guardar perfil' },
      { status: 500 }
    )
  }
}

