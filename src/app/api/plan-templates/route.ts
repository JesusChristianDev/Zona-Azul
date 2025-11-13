import { NextRequest, NextResponse } from 'next/server'
import { getAllPlanTemplates, createPlanTemplate } from '@/lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener templates de planes
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

    const { searchParams } = new URL(request.url)
    const nutricionistaId = searchParams.get('nutricionista_id') || userId

    const templates = await getAllPlanTemplates(nutricionistaId)
    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching plan templates:', error)
    return NextResponse.json(
      { error: 'Error al obtener templates' },
      { status: 500 }
    )
  }
}

// POST - Crear template de plan
export async function POST(request: NextRequest) {
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

    if (role !== 'admin' && role !== 'nutricionista') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, focus, duration, audience, total_calories, is_public } = body

    if (!name || !focus || !duration || !audience) {
      return NextResponse.json(
        { error: 'Nombre, enfoque, duración y audiencia son requeridos' },
        { status: 400 }
      )
    }

    // Preparar datos, asegurándose de que no haya undefined
    const templateData: any = {
      name,
      focus,
      duration,
      audience,
      is_public: is_public || false,
    }
    
    // Solo agregar campos opcionales si tienen valor
    if (description) templateData.description = description
    if (role === 'nutricionista' && userId) templateData.nutricionista_id = userId
    if (total_calories) templateData.total_calories = parseInt(total_calories)

    console.log('Creating template with data:', templateData)

    const template = await createPlanTemplate(templateData)

    if (!template) {
      return NextResponse.json(
        { error: 'Error al crear template - no se retornó ningún template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ template }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating plan template:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack,
      name: error?.name,
    })
    return NextResponse.json(
      { 
        error: 'Error al crear template',
        details: error?.message || 'Error desconocido',
        code: error?.code,
        hint: error?.hint
      },
      { status: 500 }
    )
  }
}

