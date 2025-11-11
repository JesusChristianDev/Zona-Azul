import { NextRequest, NextResponse } from 'next/server'
import { deleteMealPlanByUserId } from '../../../../../lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// DELETE - Eliminar plan asignado a un usuario
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
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

    // Solo admin puede eliminar planes de otros usuarios
    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    const targetUserId = params.userId

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'user_id es requerido' },
        { status: 400 }
      )
    }

    console.log('Attempting to delete plan for user:', targetUserId)
    
    const success = await deleteMealPlanByUserId(targetUserId)

    if (!success) {
      // Verificar si el usuario realmente tiene un plan antes de retornar error
      const { getMealPlanByUserId } = await import('../../../../../lib/db')
      const existingPlan = await getMealPlanByUserId(targetUserId)
      
      if (!existingPlan) {
        // No hay plan, esto es exitoso (ya no tiene plan)
        console.log('User has no plan, deletion successful (no plan to delete)')
        return NextResponse.json({ success: true, message: 'No plan found, user already has no plan' })
      }
      
      // Hay un plan pero no se pudo eliminar
      console.error('Failed to delete plan for user:', targetUserId, 'Plan exists:', existingPlan.id)
      return NextResponse.json(
        { error: 'Error al eliminar plan. El plan existe pero no se pudo eliminar.' },
        { status: 500 }
      )
    }

    console.log('Plan deleted successfully for user:', targetUserId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting user plan:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
    })
    return NextResponse.json(
      { 
        error: 'Error al eliminar plan', 
        details: error?.message,
        code: error?.code,
      },
      { status: 500 }
    )
  }
}

