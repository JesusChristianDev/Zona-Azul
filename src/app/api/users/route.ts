import { NextRequest, NextResponse } from 'next/server'
import { getAllUsers, createUser, getUserById, getUserByEmail, updateUser, deleteUser, getAllAppointments, updateAppointment, createOrUpdateProfile } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener todos los usuarios (solo admin)
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const role = cookieStore.get('user_role')?.value

    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    const users = await getAllUsers()
    // No devolver password_hash en la respuesta
    const safeUsers = users.map(({ password_hash, ...user }) => user)
    return NextResponse.json({ users: safeUsers })
  } catch (error: any) {
    console.error('Error fetching users:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    return NextResponse.json(
      { error: 'Error al obtener usuarios', details: error?.message },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo usuario (solo admin)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const role = cookieStore.get('user_role')?.value

    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, password, role: userRole, name, phone, subscription_status } = body

    if (!email || !password || !userRole || !name) {
      return NextResponse.json(
        { error: 'Email, contraseña, rol y nombre son requeridos' },
        { status: 400 }
      )
    }

    // Verificar si el usuario ya existe
    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con este email' },
        { status: 400 }
      )
    }

    // Hash de la contraseña
    const password_hash = await bcrypt.hash(password, 10)

    const user = await createUser({
      email,
      password_hash,
      role: userRole,
      name,
      phone,
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Error al crear usuario. Verifica que el email no esté duplicado y que todos los campos sean válidos.' },
        { status: 500 }
      )
    }

    // Crear perfil automáticamente con el estado de suscripción especificado (o 'inactive' por defecto)
    // Si se especifica subscription_status, crear el perfil con ese estado
    // Esto es especialmente útil cuando se crea un usuario desde una cita completada
    if (subscription_status) {
      try {
        await createOrUpdateProfile(user.id, {
          subscription_status: subscription_status as 'active' | 'inactive' | 'expired',
        })
        console.log(`Perfil creado para usuario ${user.id} con suscripción ${subscription_status}`)
      } catch (profileError) {
        console.error('Error creando perfil (no crítico):', profileError)
        // No fallar la creación del usuario si hay error al crear el perfil
      }
    }

    // Asociar automáticamente citas pendientes con el mismo email
    try {
      const allAppointments = await getAllAppointments()
      const emailLower = email.toLowerCase()
      
      // Función helper para extraer email de las notes
      const extractEmailFromNotes = (notes: string | null | undefined): string | null => {
        if (!notes) return null
        try {
          const guestDataMatch = notes.match(/--- DATOS DEL INVITADO ---\s*(\{[\s\S]*?\})/)
          if (guestDataMatch) {
            const guestData = JSON.parse(guestDataMatch[1])
            return guestData.email?.toLowerCase() || null
          }
        } catch (error) {
          console.error('Error parsing guest data from notes:', error)
        }
        return null
      }

      // Buscar citas sin user_id que tengan el mismo email
      const pendingAppointments = allAppointments.filter(apt => {
        if (apt.user_id) return false // Ya tiene usuario asignado
        
        // Verificar si el email coincide
        const guestEmail = extractEmailFromNotes(apt.notes)
        return guestEmail === emailLower
      })

      // Asociar las citas encontradas al nuevo usuario
      for (const appointment of pendingAppointments) {
        await updateAppointment(appointment.id, { user_id: user.id })
      }

      if (pendingAppointments.length > 0) {
        console.log(`Asociadas ${pendingAppointments.length} citas al nuevo usuario ${user.id}`)
      }
    } catch (error) {
      console.error('Error asociando citas al usuario (no crítico):', error)
      // No fallar la creación del usuario si hay error al asociar citas
    }

    const { password_hash: _, ...safeUser } = user
    return NextResponse.json({ user: safeUser }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating user:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    return NextResponse.json(
      { 
        error: 'Error al crear usuario',
        details: error?.message || 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

