import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  createPlanBase,
  createReceta,
  deletePlanBase as removePlanBase,
  getPlanesBase,
  getRecetasByPlanBase,
  updatePlanBase,
  upsertRecetaIngredientes,
  RecetaIngredienteInput,
} from '@/lib/db'

export const dynamic = 'force-dynamic'

type NuevaRecetaPayload = {
  nombre: string
  descripcion?: string
  meal_type: 'lunch' | 'dinner'
  calorias_totales?: number
  proteinas_totales?: number
  carbohidratos_totales?: number
  grasas_totales?: number
  porciones?: number
  tiempo_preparacion_min?: number
  ingredientes?: RecetaIngredienteInput[]
}

function ensureAdminOrNutri(role?: string) {
  if (role !== 'admin' && role !== 'nutricionista') {
    throw new Error('No autorizado')
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const includeRecipes = searchParams.get('include_recipes') === 'true'

    const planes = await getPlanesBase()

    if (!includeRecipes) {
      return NextResponse.json({ planes })
    }

    const planesConRecetas = await Promise.all(
      planes.map(async (plan) => {
        const recetas = await getRecetasByPlanBase(plan.id)
        return {
          ...plan,
          recetas,
        }
      })
    )

    return NextResponse.json({ planes: planesConRecetas })
  } catch (error: any) {
    console.error('Error fetching planes base:', error)
    return NextResponse.json({ error: error.message || 'Error inesperado' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const role = cookieStore.get('user_role')?.value
    ensureAdminOrNutri(role)

    const body = await request.json()
    const { recetas = [], ...planBaseData } = body

    if (!planBaseData.nombre) {
      return NextResponse.json({ error: 'El plan base requiere un nombre' }, { status: 400 })
    }

    const caloriasBase =
      typeof planBaseData.calorias_base === 'number' && planBaseData.calorias_base > 0
        ? planBaseData.calorias_base
        : 2000

    const rawDiasPlan = typeof planBaseData.dias_plan === 'number' ? planBaseData.dias_plan : 5
    const normalizedDiasPlan = Math.min(20, Math.max(5, Math.round(rawDiasPlan / 5) * 5))

    const nuevoPlan = await createPlanBase({
      ...planBaseData,
      dias_plan: normalizedDiasPlan || 5,
      calorias_base: caloriasBase,
      is_active: planBaseData.is_active ?? true,
    })

    if (!nuevoPlan) {
      return NextResponse.json({ error: 'No se pudo crear el plan base' }, { status: 500 })
    }

    if (Array.isArray(recetas) && recetas.length > 0) {
      for (const recetaPayload of recetas as NuevaRecetaPayload[]) {
        const nuevaReceta = await createReceta({
          plan_base_id: nuevoPlan.id,
          nombre: recetaPayload.nombre,
          descripcion: recetaPayload.descripcion || null,
          meal_type: recetaPayload.meal_type,
          calorias_totales: recetaPayload.calorias_totales ?? null,
          proteinas_totales: recetaPayload.proteinas_totales ?? null,
          carbohidratos_totales: recetaPayload.carbohidratos_totales ?? null,
          grasas_totales: recetaPayload.grasas_totales ?? null,
          porciones: recetaPayload.porciones ?? 1,
          formula_escalado: null,
          tiempo_preparacion_min: recetaPayload.tiempo_preparacion_min ?? null,
        })

        if (nuevaReceta && Array.isArray(recetaPayload.ingredientes)) {
          await upsertRecetaIngredientes(nuevaReceta.id, recetaPayload.ingredientes)
        }
      }
    }

    const recetasDelPlan = await getRecetasByPlanBase(nuevoPlan.id)

    return NextResponse.json(
      {
        plan: {
          ...nuevoPlan,
          recetas: recetasDelPlan,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creando plan base:', error)
    if (error.message === 'No autorizado') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const role = cookieStore.get('user_role')?.value
    ensureAdminOrNutri(role)

    const body = await request.json()
    const { id, ...payload } = body
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const updated = await updatePlanBase(id, payload)
    if (!updated) {
      return NextResponse.json({ error: 'No se pudo actualizar el plan base' }, { status: 500 })
    }

    return NextResponse.json({ plan: updated })
  } catch (error: any) {
    console.error('Error actualizando plan base:', error)
    if (error.message === 'No autorizado') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const role = cookieStore.get('user_role')?.value
    ensureAdminOrNutri(role)

    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const success = await removePlanBase(id)
    if (!success) {
      return NextResponse.json({ error: 'No se pudo eliminar el plan base' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error eliminando plan base:', error)
    if (error.message === 'No autorizado') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}


