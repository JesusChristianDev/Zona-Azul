import { NextRequest, NextResponse } from 'next/server'
import { getChatPreferencesByUserId, updateChatPreference } from '@/lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener preferencias de chat del usuario
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

    const preferences = await getChatPreferencesByUserId(userId)
    return NextResponse.json({ preferences })
  } catch (error: any) {
    console.error('Error fetching chat preferences:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
    })
    // Si la tabla no existe, devolver array vacío en lugar de error
    if (error?.code === 'PGRST205' || error?.message?.includes('schema cache')) {
      console.warn('Tabla user_chat_preferences no existe. Ejecuta el script SQL en Supabase.')
      return NextResponse.json({ preferences: [] })
    }
    return NextResponse.json(
      { error: 'Error al obtener preferencias', details: error?.message },
      { status: 500 }
    )
  }
}

// POST/PATCH - Actualizar preferencia de chat
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
    const { contact_id, is_archived, is_deleted } = body

    if (!contact_id) {
      return NextResponse.json(
        { error: 'ID de contacto es requerido' },
        { status: 400 }
      )
    }

    const preference = await updateChatPreference(userId, contact_id, {
      is_archived: is_archived ?? false,
      is_deleted: is_deleted ?? false,
    })

    if (!preference) {
      return NextResponse.json(
        { error: 'Error al actualizar preferencia' },
        { status: 500 }
      )
    }

    return NextResponse.json({ preference })
  } catch (error: any) {
    console.error('Error updating chat preference:', error)
    // Si la tabla no existe, devolver error informativo
    if (error?.code === 'PGRST205' || error?.message?.includes('schema cache')) {
      console.warn('Tabla user_chat_preferences no existe. Ejecuta el script SQL en Supabase.')
      return NextResponse.json(
        { error: 'Tabla no encontrada. Ejecuta el script SQL en Supabase.' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'Error al actualizar preferencia' },
      { status: 500 }
    )
  }
}

