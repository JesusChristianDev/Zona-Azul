import { NextRequest, NextResponse } from 'next/server'
import { getAllAppointments, getAppointmentsByUserId, getAppointmentsByNutricionistaId, getUserById } from '@/lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Función helper para extraer datos del invitado de las notes
function extractGuestDataFromNotes(notes: string | null | undefined): { name: string; email: string; phone?: string } | null {
  if (!notes) return null
  
  try {
    // Usar [\s\S] en lugar de . con flag s para compatibilidad
    const guestDataMatch = notes.match(/--- DATOS DEL INVITADO ---\s*(\{[\s\S]*?\})/)
    if (guestDataMatch) {
      const guestData = JSON.parse(guestDataMatch[1])
      return {
        name: guestData.name || '',
        email: guestData.email || '',
        phone: guestData.phone || undefined,
      }
    }
  } catch (error) {
    console.error('Error parsing guest data from notes:', error)
  }
  
  return null
}

// GET - Obtener citas
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

    let appointments

    if (role === 'admin') {
      appointments = await getAllAppointments()
    } else if (role === 'nutricionista') {
      appointments = await getAppointmentsByNutricionistaId(userId)
    } else {
      appointments = await getAppointmentsByUserId(userId)
    }

    // Enriquecer las citas con datos del usuario o del invitado
    const enrichedAppointments = await Promise.all(
      appointments.map(async (apt) => {
        let name = 'Cliente'
        let email = ''
        let phone: string | undefined = undefined

        if (apt.user_id) {
          // Si tiene user_id, obtener datos del usuario
          const user = await getUserById(apt.user_id)
          if (user) {
            name = user.name
            email = user.email
            phone = user.phone || undefined
          }
        } else {
          // Si no tiene user_id, extraer datos del invitado de las notes
          const guestData = extractGuestDataFromNotes(apt.notes)
          if (guestData) {
            name = guestData.name
            email = guestData.email
            phone = guestData.phone
          }
        }

        return {
          ...apt,
          name,
          email,
          phone,
        }
      })
    )

    return NextResponse.json({ appointments: enrichedAppointments })
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json(
      { error: 'Error al obtener citas' },
      { status: 500 }
    )
  }
}

