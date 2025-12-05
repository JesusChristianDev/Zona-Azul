import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  createReceta,
  deleteReceta,
  getLibraryRecetas,
  getRecetaById,
  getRecetasByPlanBase,
  getRecetaIngredientesByRecetaId,
  updateReceta,
  upsertRecetaIngredientes,
  RecetaIngredienteInput,
} from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const isLibrary = searchParams.get('library') === 'true'

    if (isLibrary) {
      const mealType = searchParams.get('meal_type') as 'lunch' | 'dinner' | null
      const recetas = await getLibraryRecetas(mealType || undefined)
      return NextResponse.json({ recetas })
    }

    const planBaseId = searchParams.get('plan_base_id')
    if (!planBaseId) {
      return NextResponse.json({ error: 'plan_base_id requerido' }, { status: 400 })
    }

    const recetas = await getRecetasByPlanBase(planBaseId)
    return NextResponse.json({ recetas })
  } catch (error) {
    console.error('Error obteniendo recetas:', error)
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const role = cookieStore.get('user_role')?.value
    const currentUserId = cookieStore.get('user_id')?.value
    if (role !== 'admin' && role !== 'nutricionista') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const {
      plan_base_id,
      es_biblioteca,
      ingredientes = [],
      source_receta_id,
      ...recetaData
    } = body

    if (source_receta_id && plan_base_id) {
      const template = await getRecetaById(source_receta_id)
      if (!template) {
        return NextResponse.json({ error: 'Receta de biblioteca no encontrada' }, { status: 404 })
      }

      if (!template.es_biblioteca) {
        return NextResponse.json({ error: 'Solo se pueden duplicar recetas de biblioteca' }, { status: 400 })
      }

      const newReceta = await createReceta({
        plan_base_id,
        nombre: recetaData.nombre || template.nombre,
        descripcion: recetaData.descripcion ?? template.descripcion ?? null,
        meal_type: template.meal_type,
        calorias_totales: template.calorias_totales ?? null,
        proteinas_totales: template.proteinas_totales ?? null,
        carbohidratos_totales: template.carbohidratos_totales ?? null,
        grasas_totales: template.grasas_totales ?? null,
        porciones: template.porciones ?? 1,
        formula_escalado: template.formula_escalado ?? null,
        tiempo_preparacion_min: template.tiempo_preparacion_min ?? null,
        created_by: currentUserId ?? null,
      })

      if (!newReceta) {
        return NextResponse.json({ error: 'No se pudo crear la receta desde la biblioteca' }, { status: 500 })
      }

      const templateIngredientes = await getRecetaIngredientesByRecetaId(source_receta_id)
      if (templateIngredientes.length > 0) {
        await upsertRecetaIngredientes(
          newReceta.id,
          templateIngredientes.map((item) => ({
            ingrediente_id: item.ingrediente_id,
            cantidad_base: item.cantidad_base,
            unidad: item.unidad,
            porcentaje_merma: item.porcentaje_merma ?? undefined,
          }))
        )
      }

      return NextResponse.json({ receta: newReceta }, { status: 201 })
    }

    const isLibraryRecipe = Boolean(es_biblioteca)

    if (!plan_base_id && !isLibraryRecipe) {
      return NextResponse.json(
        { error: 'plan_base_id es obligatorio para recetas vinculadas a planes base' },
        { status: 400 }
      )
    }
    if (!recetaData.nombre || !recetaData.meal_type) {
      return NextResponse.json({ error: 'La receta requiere nombre y meal_type' }, { status: 400 })
    }

    const receta = await createReceta({
      plan_base_id: plan_base_id ?? null,
      nombre: recetaData.nombre,
      descripcion: recetaData.descripcion || null,
      meal_type: recetaData.meal_type,
      calorias_totales: recetaData.calorias_totales ?? null,
      proteinas_totales: recetaData.proteinas_totales ?? null,
      carbohidratos_totales: recetaData.carbohidratos_totales ?? null,
      grasas_totales: recetaData.grasas_totales ?? null,
      porciones: recetaData.porciones ?? 1,
      formula_escalado: recetaData.formula_escalado ?? null,
      tiempo_preparacion_min: recetaData.tiempo_preparacion_min ?? null,
      es_biblioteca: isLibraryRecipe,
      created_by: currentUserId ?? null,
    })

    if (!receta) {
      return NextResponse.json({ error: 'No se pudo crear la receta' }, { status: 500 })
    }

    if (Array.isArray(ingredientes) && ingredientes.length > 0) {
      await upsertRecetaIngredientes(receta.id, ingredientes as RecetaIngredienteInput[])
    }

    return NextResponse.json({ receta }, { status: 201 })
  } catch (error) {
    console.error('Error creando receta:', error)
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const role = cookieStore.get('user_role')?.value
    if (role !== 'admin' && role !== 'nutricionista') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ingredientes = [], ...recetaData } = body
    if (!id) {
      return NextResponse.json({ error: 'id es obligatorio' }, { status: 400 })
    }

    const updated = await updateReceta(id, {
      nombre: recetaData.nombre,
      descripcion: recetaData.descripcion ?? null,
      meal_type: recetaData.meal_type,
      calorias_totales: recetaData.calorias_totales ?? null,
      proteinas_totales: recetaData.proteinas_totales ?? null,
      carbohidratos_totales: recetaData.carbohidratos_totales ?? null,
      grasas_totales: recetaData.grasas_totales ?? null,
      porciones: recetaData.porciones ?? 1,
      formula_escalado: recetaData.formula_escalado ?? null,
      tiempo_preparacion_min: recetaData.tiempo_preparacion_min ?? null,
    })

    if (!updated) {
      return NextResponse.json({ error: 'No se pudo actualizar la receta' }, { status: 500 })
    }

    if (Array.isArray(ingredientes) && ingredientes.length > 0) {
      await upsertRecetaIngredientes(id, ingredientes as RecetaIngredienteInput[])
    }

    return NextResponse.json({ receta: updated })
  } catch (error) {
    console.error('Error actualizando receta:', error)
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const role = cookieStore.get('user_role')?.value
    if (role !== 'admin' && role !== 'nutricionista') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    }

    const success = await deleteReceta(id)
    if (!success) {
      return NextResponse.json({ error: 'No se pudo eliminar la receta' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error eliminando receta:', error)
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}


