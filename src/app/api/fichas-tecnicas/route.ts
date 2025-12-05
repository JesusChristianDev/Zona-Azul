import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getFichaTecnicaByUserId, upsertFichaTecnica, DatabaseFichaTecnica } from '@/lib/db'
import { ActivityLevel } from '@/lib/db'
import { calculateNutritionProfile } from '@/nutrition/calculator'

export const dynamic = 'force-dynamic'

const NUMERIC_FIELDS: Array<keyof DatabaseFichaTecnica> = [
  'edad',
  'peso_kg',
  'altura_cm',
  'densidad_osea',
  'masa_magra',
  'masa_grasa',
  'entrenamientos_semanales',
  'comidas_por_dia',
]

function sanitizeFichaPayload(body: any): Partial<DatabaseFichaTecnica> {
  const result: Partial<Record<keyof DatabaseFichaTecnica, any>> = {}
  const textFields: Array<keyof DatabaseFichaTecnica> = [
    'sexo',
    'trabajo',
    'nivel_actividad',
    'puesto_trabajo',
    'intensidad_trabajo',
    'nivel_entrenamiento',
    'patologias',
    'preferencias',
    'objetivo',
    'fecha_revision',
    'observaciones',
  ]

  textFields.forEach((field) => {
    if (body[field] !== undefined) {
      result[field] = body[field] as any
    }
  })

  NUMERIC_FIELDS.forEach((field) => {
    if (body[field] !== undefined && body[field] !== null && body[field] !== '') {
      const value = field === 'entrenamientos_semanales' || field === 'edad' ? Number.parseInt(body[field], 10) : Number(body[field])
      if (!Number.isNaN(value)) {
        result[field] = value as any
      }
    }
  })

  return result as Partial<DatabaseFichaTecnica>
}

function mapActividadToTrabajo(nivel?: ActivityLevel | null): DatabaseFichaTecnica['trabajo'] | null {
  if (!nivel) return null
  switch (nivel) {
    case 'sedentario':
    case 'ligero':
      return 'sedentario'
    case 'moderado':
      return 'moderado'
    case 'intenso':
    case 'atleta':
      return 'intenso'
    default:
      return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const currentUserId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('user_role')?.value

    if (!currentUserId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const requestedUserId =
      role === 'admin' || role === 'nutricionista'
        ? searchParams.get('user_id') || currentUserId
        : currentUserId

    const ficha = await getFichaTecnicaByUserId(requestedUserId)
    if (!ficha) {
      return NextResponse.json({ ficha: null })
    }

    return NextResponse.json({ ficha })
  } catch (error) {
    console.error('Error fetching ficha tecnica:', error)
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const currentUserId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('user_role')?.value

    if (!currentUserId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const targetUserId =
      role === 'admin' || role === 'nutricionista' ? body.user_id || currentUserId : currentUserId

    const basePayload = sanitizeFichaPayload(body)
    if (!basePayload.nivel_actividad && basePayload.trabajo) {
      basePayload.nivel_actividad = basePayload.trabajo as ActivityLevel
    }
    if (!basePayload.trabajo && basePayload.nivel_actividad) {
      basePayload.trabajo = mapActividadToTrabajo(basePayload.nivel_actividad)
    }

    const calculationInput = {
      sexo: basePayload.sexo ?? null,
      edad: basePayload.edad ?? null,
      peso_kg: basePayload.peso_kg ?? null,
      altura_cm: basePayload.altura_cm ?? null,
      objetivo: basePayload.objetivo ?? null,
      nivel_actividad: basePayload.nivel_actividad ?? basePayload.trabajo ?? null,
      comidas_por_dia: basePayload.comidas_por_dia ?? null,
    }

    const metrics = calculateNutritionProfile(calculationInput)
    const payload: Partial<DatabaseFichaTecnica> = {
      ...basePayload,
      imc: metrics.imc,
      tmb: metrics.tmb,
      factor_actividad: metrics.factor_actividad,
      calorias_objetivo: metrics.calorias_objetivo,
      get_total: metrics.get_total,
      proteinas_objetivo: metrics.proteinas_objetivo,
      grasas_objetivo: metrics.grasas_objetivo,
      carbohidratos_objetivo: metrics.carbohidratos_objetivo,
      fibra_objetivo: metrics.fibra_objetivo,
      distribucion_calorias: metrics.distribucion_calorias,
      distribucion_macros: metrics.distribucion_macros,
    }

    const ficha = await upsertFichaTecnica(targetUserId, payload)
    if (!ficha) {
      return NextResponse.json({ error: 'Error al guardar la ficha técnica' }, { status: 500 })
    }

    return NextResponse.json({ ficha })
  } catch (error) {
    console.error('Error saving ficha tecnica:', error)
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}


