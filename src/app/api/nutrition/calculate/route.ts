import { NextRequest, NextResponse } from 'next/server'
import { calculateNutritionProfile } from '@/nutrition/calculator'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const calculations = calculateNutritionProfile({
      sexo: body.sexo,
      edad: body.edad,
      peso_kg: body.peso_kg,
      altura_cm: body.altura_cm,
      objetivo: body.objetivo,
      nivel_actividad: body.nivel_actividad || body.trabajo || null,
      comidas_por_dia: body.comidas_por_dia,
    })

    return NextResponse.json({ result: calculations })
  } catch (error) {
    console.error('Error calculating nutrition profile:', error)
    return NextResponse.json({ error: 'No se pudo calcular el perfil nutricional' }, { status: 400 })
  }
}





