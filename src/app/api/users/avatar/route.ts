import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

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
    const { avatar_url } = body

    // Validar que avatar_url sea una string (base64) o null
    if (avatar_url !== null && typeof avatar_url !== 'string') {
      return NextResponse.json(
        { error: 'avatar_url debe ser una cadena (base64) o null' },
        { status: 400 }
      )
    }

    // Si es base64, validar formato
    if (avatar_url && !avatar_url.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'El avatar debe ser una imagen en formato base64 válida' },
        { status: 400 }
      )
    }

    // Actualizar avatar en la base de datos
    const { data, error } = await supabase
      .from('users')
      .update({ 
        avatar_url: avatar_url || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('avatar_url')
      .single()

    if (error) {
      console.error('Error updating avatar:', error)
      return NextResponse.json(
        { error: 'Error al actualizar el avatar' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      avatar_url: data.avatar_url 
    })
  } catch (error: any) {
    console.error('Unexpected error updating avatar:', error)
    return NextResponse.json(
      { error: 'Error inesperado al actualizar el avatar', details: process.env.NODE_ENV === 'development' ? error?.message : undefined },
      { status: 500 }
    )
  }
}






