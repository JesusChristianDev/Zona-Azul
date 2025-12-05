import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// DELETE - Eliminar cuenta del usuario
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Eliminar usuario (CASCADE eliminará automáticamente todos los datos relacionados)
    // Incluye perfiles, suscripciones, pedidos, progreso, mensajes, citas, etc.
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (error) {
      console.error('Error deleting user:', error)
      return NextResponse.json(
        { error: 'Error al eliminar la cuenta' },
        { status: 500 }
      )
    }

    // Limpiar cookies
    const response = NextResponse.json({ success: true, message: 'Cuenta eliminada correctamente' })
    response.cookies.delete('user_id')
    response.cookies.delete('user_role')
    response.cookies.delete('user_name')
    response.cookies.delete('user_email')

    return response
  } catch (error: any) {
    console.error('Unexpected error deleting account:', error)
    return NextResponse.json(
      {
        error: 'Error inesperado al eliminar la cuenta',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    )
  }
}


