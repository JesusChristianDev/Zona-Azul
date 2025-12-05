/**
 * Utilidades para trabajar con la base de datos Supabase
 * Funciones helper para operaciones comunes
 */

import { supabase } from './supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from './types'

// Tipos de base de datos (basados en el esquema SQL)
export interface DatabaseUser {
  id: string
  email: string
  password_hash: string
  role: 'admin' | 'suscriptor' | 'nutricionista' | 'repartidor'
  name: string
  phone?: string
  avatar_url?: string
  must_change_password?: boolean
  created_at: string
  updated_at: string
}

export interface DatabaseProfile {
  id: string
  user_id: string
  subscription_status: 'active' | 'inactive' | 'expired'
  subscription_end_date?: string
  goals_weight?: number
  goals_calories?: number
  goals_water?: number
  address?: string
  delivery_instructions?: string
  created_at: string
  updated_at: string
}

export interface DatabaseAppointment {
  id: string
  user_id: string | null
  nutricionista_id?: string | null
  date_time: string
  status: 'pendiente' | 'confirmada' | 'completada' | 'cancelada'
  notes?: string | null
  google_calendar_event_id?: string | null
  created_at: string
  updated_at: string
}

export interface DatabaseOrder {
  id: string
  user_id: string
  status: 'pendiente' | 'preparando' | 'en_camino' | 'entregado' | 'cancelado'
  total_amount: number
  delivery_address?: string
  delivery_instructions?: string
  delivery_mode?: 'delivery' | 'pickup'
  delivery_address_id?: string
  pickup_location?: string
  repartidor_id?: string
  estimated_delivery_time?: string
  actual_delivery_time?: string
  created_at: string
  updated_at: string
}

export interface DatabaseProgress {
  id: string
  user_id: string
  date: string
  weight?: number
  calories?: number
  water?: number
  protein?: number
  carbs?: number
  fats?: number
  mood?: string
  sleep_hours?: number
  steps?: number
  notes?: string
  created_at: string
  updated_at: string
}

export type ObjetivoNutricional =
  | 'perder_grasa'
  | 'mantener'
  | 'ganar_masa'
  | 'antiinflamatorio'
  | 'deportivo'
  | 'recomp_corporal'

export type ActivityLevel = 'sedentario' | 'ligero' | 'moderado' | 'intenso' | 'atleta'

export type TrabajoIntensity = 'baja' | 'moderada' | 'alta'

export interface MealMacroBreakdown {
  calorias: number
  proteinas: number
  grasas: number
  carbohidratos: number
}

export interface DatabaseFichaTecnica {
  id: string
  user_id: string
  sexo: 'hombre' | 'mujer'
  edad: number | null
  peso_kg: number | null
  altura_cm: number | null
  imc: number | null
  densidad_osea: number | null
  masa_magra: number | null
  masa_grasa: number | null
  trabajo: 'sedentario' | 'moderado' | 'intenso' | null
  nivel_actividad: ActivityLevel | null
  puesto_trabajo?: string | null
  intensidad_trabajo?: TrabajoIntensity | null
  entrenamientos_semanales: number | null
  nivel_entrenamiento: 'principiante' | 'intermedio' | 'avanzado' | null
  patologias?: string | null
  preferencias?: string | null
  objetivo: 'perder_grasa' | 'mantener' | 'ganar_masa' | 'recomp_corporal'
  comidas_por_dia?: number | null
  fecha_revision?: string | null
  calorias_objetivo?: number | null
  get_total?: number | null
  tmb?: number | null
  factor_actividad?: number | null
  proteinas_objetivo?: number | null
  grasas_objetivo?: number | null
  carbohidratos_objetivo?: number | null
  fibra_objetivo?: number | null
  distribucion_calorias?: Record<'lunch' | 'dinner', number> | null
  distribucion_macros?: Record<'lunch' | 'dinner', MealMacroBreakdown> | null
  observaciones?: string | null
  created_at: string
  updated_at: string
}

export interface DatabasePlanBase {
  id: string
  nombre: string
  descripcion?: string | null
  objetivo: ObjetivoNutricional | null
  dias_plan: number
  calorias_base: number
  proteinas_base?: number | null
  carbohidratos_base?: number | null
  grasas_base?: number | null
  created_by?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DatabaseIngrediente {
  id: string
  nombre: string
  unidad_base: string
  calorias_por_unidad?: number | null
  proteinas_por_unidad?: number | null
  carbohidratos_por_unidad?: number | null
  grasas_por_unidad?: number | null
  stock_minimo?: number | null
  created_at: string
  updated_at: string
}

export interface DatabaseReceta {
  id: string
  plan_base_id?: string | null
  nombre: string
  descripcion?: string | null
  meal_type: 'lunch' | 'dinner'
  calorias_totales?: number | null
  proteinas_totales?: number | null
  carbohidratos_totales?: number | null
  grasas_totales?: number | null
  porciones: number
  formula_escalado?: string | null
  tiempo_preparacion_min?: number | null
  es_biblioteca: boolean
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface DatabaseRecetaWithIngredientes extends DatabaseReceta {
  recetas_ingredientes?: DatabaseRecetaIngrediente[]
}

type CreateRecetaInput = {
  plan_base_id?: string | null
  nombre: string
  descripcion?: string | null
  meal_type: 'lunch' | 'dinner'
  calorias_totales?: number | null
  proteinas_totales?: number | null
  carbohidratos_totales?: number | null
  grasas_totales?: number | null
  porciones?: number
  formula_escalado?: string | null
  tiempo_preparacion_min?: number | null
  es_biblioteca?: boolean
  created_by?: string | null
}

export interface DatabaseRecetaIngrediente {
  id: string
  receta_id: string
  ingrediente_id: string
  cantidad_base: number
  unidad: string
  porcentaje_merma?: number | null
  created_at: string
}

export interface DatabasePlanSemanal {
  id: string
  user_id: string
  ficha_tecnica_id?: string | null
  plan_base_id?: string | null
  week_start_date: string
  week_end_date: string
  status: 'pendiente' | 'generado' | 'aprobado' | 'archivado'
  total_calorias?: number | null
  comentarios?: string | null
  created_at: string
  updated_at: string
}

export interface DatabasePlanSemanalComida {
  id: string
  plan_semanal_id: string
  day_number: number
  meal_type: 'lunch' | 'dinner'
  receta_id?: string | null
  calorias_adaptadas?: number | null
  proteinas_adaptadas?: number | null
  carbohidratos_adaptados?: number | null
  grasas_adaptadas?: number | null
  cantidad_total?: number | null
  unidad?: string | null
  notas?: string | null
  created_at: string
}

export type PlanSemanalComidaInput = {
  plan_semanal_id: string
  day_number: number
  meal_type: DatabasePlanSemanalComida['meal_type']
  receta_id?: string | null
  calorias_adaptadas?: number | null
  proteinas_adaptadas?: number | null
  carbohidratos_adaptados?: number | null
  grasas_adaptadas?: number | null
  cantidad_total?: number | null
  unidad?: string | null
  notas?: string | null
}

export interface DatabasePlanSemanalIngrediente {
  id: string
  plan_semanal_id: string
  plan_semanal_comida_id: string
  user_id: string
  plan_base_id: string
  receta_id: string
  ingrediente_id: string
  cantidad_base: number
  unidad: string
  porcentaje_merma?: number | null
  cantidad_adaptada: number
  consumo_fecha: string
  created_at: string
}

export type PlanSemanalIngredienteInput = Omit<DatabasePlanSemanalIngrediente, 'id' | 'created_at'>

export type PlanSemanalComidaWithReceta = DatabasePlanSemanalComida & {
  receta?: (DatabaseReceta & {
    recetas_ingredientes?: Array<
      DatabaseRecetaIngrediente & {
        ingredientes?: DatabaseIngrediente | null
      }
    >
  }) | null
}

export type PlanSemanalWithDetalles = DatabasePlanSemanal & {
  plan_base?: DatabasePlanBase | null
  comidas?: PlanSemanalComidaWithReceta[]
}

export interface DatabaseStock {
  id: string
  ingrediente_id: string
  cantidad_disponible: number
  unidad: string
  actualizado_en: string
}

export interface DatabasePedidoProveedor {
  id: string
  proveedor: string
  fecha_solicitud: string
  fecha_entrega_estimada?: string | null
  estado: 'pendiente' | 'en_proceso' | 'recibido' | 'cancelado'
  margen_error?: number | null
  notas?: string | null
}

export interface DatabasePedidoProveedorDetalle {
  id: string
  pedido_id: string
  ingrediente_id: string
  cantidad: number
  unidad: string
  costo_unitario?: number | null
  creado_en: string
}

export interface DatabaseProduccionDiaria {
  id: string
  fecha: string
  plan_semanal_id?: string | null
  estado: 'pendiente' | 'en_proceso' | 'completado'
  comentarios?: string | null
  creado_en: string
  actualizado_en: string
}

export interface DatabaseProduccionDiariaDetalle {
  id: string
  produccion_id: string
  receta_id?: string | null
  cantidad_programada?: number | null
  cantidad_producida?: number | null
  unidad?: string | null
  estado: 'pendiente' | 'en_proceso' | 'listo'
  notas?: string | null
}

export interface DatabaseRutaLogistica {
  id: string
  fecha: string
  repartidor_id?: string | null
  nombre?: string | null
  estado: 'pendiente' | 'en_ruta' | 'completada' | 'cancelada'
  ventana_inicio?: string | null
  ventana_fin?: string | null
  created_at: string
  updated_at: string
}

export interface DatabaseRutaLogisticaParada {
  id: string
  ruta_id: string
  order_id?: string | null
  cliente_id?: string | null
  posicion?: number | null
  hora_estimada?: string | null
  estado: 'pendiente' | 'en_camino' | 'entregado' | 'incidencia'
  notas?: string | null
}

// Funciones para usuarios
export async function getUserByEmail(
  email: string,
  client?: SupabaseClient
): Promise<DatabaseUser | null> {
  const db = client ?? supabase
  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single()

  if (error || !data) return null
  return data as DatabaseUser
}

export async function getUserById(id: string): Promise<DatabaseUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as DatabaseUser
}

export async function activateUserAccount(
  userId: string,
  passwordHash: string,
  client?: SupabaseClient
): Promise<{ user: DatabaseUser | null; profile: DatabaseProfile | null }> {
  const now = new Date().toISOString()
  const db = client ?? supabase

  const { data: updatedUser, error: userError } = await db
    .from('users')
    .update({
      password_hash: passwordHash,
      must_change_password: false,
      updated_at: now,
    })
    .eq('id', userId)
    .select()
    .single()

  if (userError || !updatedUser) {
    console.error('Error activating user account:', userError)
    return { user: null, profile: null }
  }

  const { data: existingProfile } = await db
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (existingProfile) {
    const { data: updatedProfile, error: profileError } = await db
      .from('profiles')
      .update({
        subscription_status: 'active',
        updated_at: now,
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (profileError) {
      console.error('Error updating profile during activation:', profileError)
    }

    return { user: updatedUser as DatabaseUser, profile: (updatedProfile || existingProfile) as DatabaseProfile }
  }

  const { data: createdProfile, error: createProfileError } = await db
    .from('profiles')
    .insert({
      user_id: userId,
      subscription_status: 'active',
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()

  if (createProfileError) {
    console.error('Error creating profile during activation:', createProfileError)
  }

  return {
    user: updatedUser as DatabaseUser,
    profile: createdProfile as DatabaseProfile | null,
  }
}

export async function createUser(userData: {
  email: string
  password_hash: string
  role: 'admin' | 'suscriptor' | 'nutricionista' | 'repartidor'
  name: string
  phone?: string
}): Promise<DatabaseUser | null> {
  const { data, error } = await supabase
    .from('users')
    .insert({
      email: userData.email.toLowerCase(),
      password_hash: userData.password_hash,
      role: userData.role,
      name: userData.name,
      phone: userData.phone,
      // Solo obligar cambio de contraseña para suscriptores (clientes) por seguridad
      must_change_password: userData.role === 'suscriptor' ? true : false,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating user:', error)
    return null
  }
  return data as DatabaseUser
}

export async function getAllUsers(): Promise<DatabaseUser[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching users:', error)
    return []
  }
  return data as DatabaseUser[]
}

export async function getUsersByRole(
  role: 'admin' | 'suscriptor' | 'nutricionista' | 'repartidor'
): Promise<DatabaseUser[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', role)
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching users by role:', error)
    return []
  }
  return data as DatabaseUser[]
}

// Funciones para perfiles
export async function getProfileByUserId(userId: string): Promise<DatabaseProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null
  return data as DatabaseProfile
}

export async function createOrUpdateProfile(
  userId: string,
  profileData: Partial<DatabaseProfile>
): Promise<DatabaseProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: userId,
        ...profileData,
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating/updating profile:', error)
    return null
  }
  return data as DatabaseProfile
}

// Funciones para citas
export async function createAppointment(
  appointmentData: Omit<DatabaseAppointment, 'id' | 'created_at' | 'updated_at'>
): Promise<DatabaseAppointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .insert(appointmentData)
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating appointment:', error)
    return null
  }
  return data as DatabaseAppointment
}

export async function getAppointmentById(appointmentId: string): Promise<DatabaseAppointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single()

  if (error || !data) {
    if (error?.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching appointment:', error)
    return null
  }
  return data as DatabaseAppointment
}

export async function getAppointmentsByUserId(userId: string): Promise<DatabaseAppointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', userId)
    .order('date_time', { ascending: false })

  if (error || !data) {
    console.error('Error fetching appointments:', error)
    return []
  }
  return data as DatabaseAppointment[]
}

// Funciones para pedidos
export async function createOrder(
  orderData: Omit<DatabaseOrder, 'id' | 'created_at' | 'updated_at'>
): Promise<DatabaseOrder | null> {
  const { data, error } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating order:', error)
    return null
  }
  return data as DatabaseOrder
}

export async function getOrdersByUserId(userId: string): Promise<DatabaseOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching orders:', error)
    return []
  }
  return data as DatabaseOrder[]
}

// Funciones para progreso
export async function createOrUpdateProgress(
  userId: string,
  date: string,
  progressData: Partial<DatabaseProgress>
): Promise<DatabaseProgress | null> {
  const { data, error } = await supabase
    .from('progress')
    .upsert(
      {
        user_id: userId,
        date,
        ...progressData,
      },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating/updating progress:', error)
    return null
  }
  return data as DatabaseProgress
}

export async function getProgressByUserId(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<DatabaseProgress[]> {
  let query = supabase
    .from('progress')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (startDate) {
    query = query.gte('date', startDate)
  }
  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error('Error fetching progress:', error)
    return []
  }
  return data as DatabaseProgress[]
}

// ===============================
// Fichas técnicas y planes base
// ===============================

export type RecetaIngredienteInput = {
  ingrediente_id: string
  cantidad_base: number
  unidad: string
  porcentaje_merma?: number
}

export async function getFichaTecnicaByUserId(userId: string): Promise<DatabaseFichaTecnica | null> {
  const { data, error } = await supabase
    .from('fichas_tecnicas')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching ficha tecnica:', error)
    }
    return null
  }
  return data as DatabaseFichaTecnica
}

export async function upsertFichaTecnica(
  userId: string,
  payload: Partial<Omit<DatabaseFichaTecnica, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<DatabaseFichaTecnica | null> {
  const { data, error } = await supabase
    .from('fichas_tecnicas')
    .upsert({ user_id: userId, ...payload }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error || !data) {
    console.error('Error upserting ficha tecnica:', error)
    return null
  }
  return data as DatabaseFichaTecnica
}

export async function getPlanesBase(): Promise<DatabasePlanBase[]> {
  const { data, error } = await supabase
    .from('planes_base')
    .select('*')
    .eq('is_active', true)
    .order('nombre', { ascending: true })

  if (error || !data) {
    console.error('Error fetching planes base:', error)
    return []
  }
  return data as DatabasePlanBase[]
}

export async function getPlanBaseById(planBaseId: string): Promise<DatabasePlanBase | null> {
  const { data, error } = await supabase.from('planes_base').select('*').eq('id', planBaseId).single()

  if (error || !data) {
    if (error?.code !== 'PGRST116') {
      console.error('Error fetching plan base:', error)
    }
    return null
  }

  return data as DatabasePlanBase
}

export async function createPlanBase(
  planData: Omit<DatabasePlanBase, 'id' | 'created_at' | 'updated_at'>
): Promise<DatabasePlanBase | null> {
  const { data, error } = await supabase.from('planes_base').insert(planData).select().single()

  if (error || !data) {
    console.error('Error creating plan base:', error)
    return null
  }
  return data as DatabasePlanBase
}

export async function updatePlanBase(
  planBaseId: string,
  payload: Partial<Omit<DatabasePlanBase, 'id' | 'created_at' | 'updated_at'>>
): Promise<DatabasePlanBase | null> {
  const { data, error } = await supabase
    .from('planes_base')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', planBaseId)
    .select()
    .single()

  if (error || !data) {
    console.error('Error updating plan base:', error)
    return null
  }
  return data as DatabasePlanBase
}

export async function deletePlanBase(planBaseId: string): Promise<boolean> {
  const { error } = await supabase.from('planes_base').delete().eq('id', planBaseId)
  if (error) {
    console.error('Error deleting plan base:', error)
    return false
  }
  return true
}

// ===============================
// Recetas e ingredientes
// ===============================

export async function getIngredientes(): Promise<DatabaseIngrediente[]> {
  const { data, error } = await supabase.from('ingredientes').select('*').order('nombre', { ascending: true })

  if (error || !data) {
    console.error('Error fetching ingredientes:', error)
    return []
  }
  return data as DatabaseIngrediente[]
}

export async function upsertIngrediente(
  ingredienteData: Partial<Omit<DatabaseIngrediente, 'id' | 'created_at' | 'updated_at'>> & { nombre: string }
): Promise<DatabaseIngrediente | null> {
  const { data, error } = await supabase
    .from('ingredientes')
    .upsert(ingredienteData, { onConflict: 'id' })
    .select()
    .single()

  if (error || !data) {
    console.error('Error upserting ingrediente:', error)
    return null
  }
  return data as DatabaseIngrediente
}

export async function deleteIngrediente(id: string): Promise<boolean> {
  const { error } = await supabase.from('ingredientes').delete().eq('id', id)
  if (error) {
    console.error('Error deleting ingrediente:', error)
    return false
  }
  return true
}

export async function getRecetasByPlanBase(planBaseId: string): Promise<DatabaseRecetaWithIngredientes[]> {
  const { data, error } = await supabase
    .from('recetas')
    .select('*, recetas_ingredientes(*, ingredientes:ingrediente_id(nombre, unidad_base))')
    .eq('plan_base_id', planBaseId)
    .order('meal_type', { ascending: true })
    .order('nombre', { ascending: true })

  if (error || !data) {
    console.error('Error fetching recetas:', error)
    return []
  }
  return data as DatabaseRecetaWithIngredientes[]
}

export async function getLibraryRecetas(mealType?: 'lunch' | 'dinner'): Promise<DatabaseRecetaWithIngredientes[]> {
  let query = supabase
    .from('recetas')
    .select('*, recetas_ingredientes(*, ingredientes:ingrediente_id(nombre, unidad_base))')
    .eq('es_biblioteca', true)

  if (mealType) {
    query = query.eq('meal_type', mealType)
  }

  const { data, error } = await query.order('nombre', { ascending: true })

  if (error || !data) {
    console.error('Error fetching library recipes:', error)
    return []
  }

  return data as DatabaseRecetaWithIngredientes[]
}

export async function getRecetaById(recetaId: string): Promise<DatabaseReceta | null> {
  const { data, error } = await supabase.from('recetas').select('*').eq('id', recetaId).single()

  if (error || !data) {
    if (error?.code !== 'PGRST116') {
      console.error('Error fetching receta by id:', error)
    }
    return null
  }

  return data as DatabaseReceta
}

export async function createReceta(recetaData: CreateRecetaInput): Promise<DatabaseReceta | null> {
  const payload = {
    plan_base_id: recetaData.plan_base_id ?? null,
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
    es_biblioteca: recetaData.es_biblioteca ?? false,
    created_by: recetaData.created_by ?? null,
  }

  const { data, error } = await supabase.from('recetas').insert(payload).select().single()

  if (error || !data) {
    console.error('Error creating receta:', error)
    return null
  }
  return data as DatabaseReceta
}

export async function updateReceta(
  recetaId: string,
  payload: Partial<CreateRecetaInput>
): Promise<DatabaseReceta | null> {
  const { data, error } = await supabase
    .from('recetas')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', recetaId)
    .select()
    .single()

  if (error || !data) {
    console.error('Error updating receta:', error)
    return null
  }
  return data as DatabaseReceta
}

export async function deleteReceta(recetaId: string): Promise<boolean> {
  const { error } = await supabase.from('recetas').delete().eq('id', recetaId)
  if (error) {
    console.error('Error deleting receta:', error)
    return false
  }
  return true
}

export async function upsertRecetaIngredientes(
  recetaId: string,
  ingredientes: RecetaIngredienteInput[]
): Promise<DatabaseRecetaIngrediente[]> {
  await supabase.from('recetas_ingredientes').delete().eq('receta_id', recetaId)

  if (ingredientes.length === 0) {
    return []
  }

  const payload = ingredientes.map((item) => ({
    receta_id: recetaId,
    ingrediente_id: item.ingrediente_id,
    cantidad_base: item.cantidad_base,
    unidad: item.unidad,
    porcentaje_merma: item.porcentaje_merma ?? 0,
  }))

  const { data, error } = await supabase.from('recetas_ingredientes').insert(payload).select()

  if (error || !data) {
    console.error('Error inserting receta ingredientes:', error)
    return []
  }

  return data as DatabaseRecetaIngrediente[]
}

export async function getRecetaIngredientesByRecetaId(
  recetaId: string
): Promise<DatabaseRecetaIngrediente[]> {
  const { data, error } = await supabase
    .from('recetas_ingredientes')
    .select('*')
    .eq('receta_id', recetaId)

  if (error || !data) {
    console.error('Error fetching receta ingredientes:', error)
    return []
  }

  return data as DatabaseRecetaIngrediente[]
}

// ===============================
// Planes semanales adaptados
// ===============================

export async function createPlanSemanal(
  plan: Omit<DatabasePlanSemanal, 'id' | 'created_at' | 'updated_at'>
): Promise<DatabasePlanSemanal | null> {
  const { data, error } = await supabase.from('planes_semanales').insert(plan).select().single()

  if (error || !data) {
    console.error('Error creating plan semanal:', error)
    return null
  }
  return data as DatabasePlanSemanal
}

export async function getPlanSemanalByUserAndWeek(
  userId: string,
  weekStart: string
): Promise<DatabasePlanSemanal | null> {
  const { data, error } = await supabase
    .from('planes_semanales')
    .select('*, planes_semanales_comidas(*)')
    .eq('user_id', userId)
    .eq('week_start_date', weekStart)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching plan semanal:', error)
    }
    return null
  }
  return data as DatabasePlanSemanal
}

function getPlanSemanalSelectClause(includeMeals: boolean) {
  const basePlanSelect =
    '*, plan_base:plan_base_id(id,nombre,descripcion,objetivo,dias_plan,calorias_base,proteinas_base,carbohidratos_base,grasas_base)'
  if (!includeMeals) return basePlanSelect
  return `${basePlanSelect}, planes_semanales_comidas(
    *,
    recetas:receta_id(
      *,
      recetas_ingredientes(
        *,
        ingredientes:ingrediente_id(id,nombre,unidad_base)
      )
    )
  )`
}

function mapPlanSemanalDetalle(row: any, includeMeals: boolean): PlanSemanalWithDetalles {
  const { planes_semanales_comidas, plan_base, ...rest } = row

  const plan: PlanSemanalWithDetalles = {
    ...(rest as DatabasePlanSemanal),
    plan_base: plan_base || null,
  }

  if (includeMeals) {
    plan.comidas = (planes_semanales_comidas || []).map((meal: any) => {
      const { recetas, ...restMeal } = meal
      return {
        ...(restMeal as DatabasePlanSemanalComida),
        receta: recetas
          ? {
              ...(recetas as DatabaseReceta),
              recetas_ingredientes: (recetas.recetas_ingredientes || []).map((ingrediente: any) => ({
                ...(ingrediente as DatabaseRecetaIngrediente),
                ingredientes: ingrediente.ingredientes || null,
              })),
            }
          : null,
      }
    })
  }

  return plan
}

export async function getPlanSemanalDetailedByWeek(
  userId: string,
  weekStart: string,
  includeMeals = true
): Promise<PlanSemanalWithDetalles | null> {
  const selectClause = getPlanSemanalSelectClause(includeMeals)
  const { data, error } = await supabase
    .from('planes_semanales')
    .select(selectClause)
    .eq('user_id', userId)
    .eq('week_start_date', weekStart)
    .maybeSingle()

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching plan semanal detallado:', error)
    }
    return null
  }
  if (!data) return null
  return mapPlanSemanalDetalle(data, includeMeals)
}

export async function getLatestPlanSemanalDetailed(
  userId: string,
  includeMeals = true
): Promise<PlanSemanalWithDetalles | null> {
  const selectClause = getPlanSemanalSelectClause(includeMeals)
  const { data, error } = await supabase
    .from('planes_semanales')
    .select(selectClause)
    .eq('user_id', userId)
    .order('week_start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching latest plan semanal:', error)
    }
    return null
  }
  if (!data) return null
  return mapPlanSemanalDetalle(data, includeMeals)
}

export async function getPlanSemanalComidas(planId: string): Promise<DatabasePlanSemanalComida[]> {
  const { data, error } = await supabase
    .from('planes_semanales_comidas')
    .select('*')
    .eq('plan_semanal_id', planId)
    .order('day_number', { ascending: true })

  if (error || !data) {
    console.error('Error fetching plan semanal comidas:', error)
    return []
  }

  return data as DatabasePlanSemanalComida[]
}

export async function insertPlanSemanalComidas(
  comidas: PlanSemanalComidaInput[]
): Promise<DatabasePlanSemanalComida[]> {
  if (!comidas.length) return []

  const { data, error } = await supabase.from('planes_semanales_comidas').insert(comidas).select('*')

  if (error || !data) {
    console.error('Error inserting plan semanal comidas:', error)
    throw new Error('No se pudieron guardar las comidas del plan semanal')
  }

  return data as DatabasePlanSemanalComida[]
}

export async function insertPlanSemanalIngredientes(
  ingredientes: PlanSemanalIngredienteInput[]
): Promise<DatabasePlanSemanalIngrediente[]> {
  if (!ingredientes.length) return []

  const { data, error } = await supabase
    .from('planes_semanales_ingredientes')
    .insert(ingredientes)
    .select('*')

  if (error || !data) {
    console.error('Error inserting plan semanal ingredientes:', error)
    throw new Error('No se pudieron guardar los ingredientes adaptados del plan semanal')
  }

  return data as DatabasePlanSemanalIngrediente[]
}

export async function deletePlanSemanal(planId: string): Promise<boolean> {
  const { error } = await supabase.from('planes_semanales').delete().eq('id', planId)

  if (error) {
    console.error('Error deleting plan semanal:', error)
    return false
  }

  return true
}

// ===============================
// Inventario y pedidos
// ===============================

export interface StockSnapshot extends DatabaseStock {
  ingrediente?: DatabaseIngrediente
}

export async function getStockSnapshot(): Promise<StockSnapshot[]> {
  const { data, error } = await supabase
    .from('stock')
    .select('*, ingredientes:ingrediente_id(*)')
    .order('actualizado_en', { ascending: false })

  if (error || !data) {
    console.error('Error fetching stock snapshot:', error)
    return []
  }

  return data.map((row: any) => ({
    id: row.id,
    ingrediente_id: row.ingrediente_id,
    cantidad_disponible: row.cantidad_disponible,
    unidad: row.unidad,
    actualizado_en: row.actualizado_en,
    ingrediente: row.ingredientes,
  }))
}

export async function updateStockEntry(ingredienteId: string, cantidad: number, unidad: string): Promise<boolean> {
  const { error } = await supabase
    .from('stock')
    .upsert(
      {
        ingrediente_id: ingredienteId,
        cantidad_disponible: cantidad,
        unidad,
      },
      { onConflict: 'ingrediente_id' }
    )

  if (error) {
    console.error('Error updating stock:', error)
    return false
  }

  return true
}

export type PedidoProveedorDetalleInput = {
  ingrediente_id: string
  cantidad: number
  unidad: string
  costo_unitario?: number
}

export async function createPedidoProveedor(
  pedido: Omit<DatabasePedidoProveedor, 'id'>,
  detalles: PedidoProveedorDetalleInput[]
): Promise<DatabasePedidoProveedor | null> {
  const { data, error } = await supabase.from('pedidos_proveedores').insert(pedido).select().single()

  if (error || !data) {
    console.error('Error creating supplier order:', error)
    return null
  }

  if (detalles.length > 0) {
    const payload = detalles.map((detalle) => ({
      pedido_id: data.id,
      ingrediente_id: detalle.ingrediente_id,
      cantidad: detalle.cantidad,
      unidad: detalle.unidad,
      costo_unitario: detalle.costo_unitario ?? null,
    }))

    const { error: detailError } = await supabase.from('pedidos_proveedores_detalles').insert(payload)

    if (detailError) {
      console.error('Error inserting supplier order details:', detailError)
    }
  }

  return data as DatabasePedidoProveedor
}

export async function getPedidosProveedor(limit = 20): Promise<
  Array<DatabasePedidoProveedor & { detalles: DatabasePedidoProveedorDetalle[] }>
> {
  const { data, error } = await supabase
    .from('pedidos_proveedores')
    .select('*, detalles:pedidos_proveedores_detalles(*)')
    .order('fecha_solicitud', { ascending: false })
    .limit(limit)

  if (error || !data) {
    console.error('Error fetching supplier orders:', error)
    return []
  }

  return data as Array<DatabasePedidoProveedor & { detalles: DatabasePedidoProveedorDetalle[] }>
}

// ===============================
// Producción y logística
// ===============================

export async function programarProduccionDiaria(
  produccion: Omit<DatabaseProduccionDiaria, 'id' | 'creado_en' | 'actualizado_en'>
): Promise<DatabaseProduccionDiaria | null> {
  const { data, error } = await supabase.from('produccion_diaria').insert(produccion).select().single()

  if (error || !data) {
    console.error('Error scheduling production:', error)
    return null
  }
  return data as DatabaseProduccionDiaria
}

export async function actualizarEstadoProduccion(
  produccionId: string,
  estado: DatabaseProduccionDiaria['estado']
): Promise<boolean> {
  const { error } = await supabase
    .from('produccion_diaria')
    .update({ estado, actualizado_en: new Date().toISOString() })
    .eq('id', produccionId)

  if (error) {
    console.error('Error updating production status:', error)
    return false
  }
  return true
}

export type RutaParadaInput = {
  order_id?: string
  cliente_id?: string
  posicion?: number
  hora_estimada?: string
  notas?: string
}

export async function crearRutaLogistica(
  ruta: Omit<DatabaseRutaLogistica, 'id' | 'created_at' | 'updated_at'>,
  paradas: RutaParadaInput[] = []
): Promise<DatabaseRutaLogistica | null> {
  const { data, error } = await supabase.from('logistica_rutas').insert(ruta).select().single()

  if (error || !data) {
    console.error('Error creating logistics route:', error)
    return null
  }

  if (paradas.length > 0) {
    const payload = paradas.map((parada, index) => ({
      ruta_id: data.id,
      order_id: parada.order_id ?? null,
      cliente_id: parada.cliente_id ?? null,
      posicion: parada.posicion ?? index + 1,
      hora_estimada: parada.hora_estimada ?? null,
      notas: parada.notas ?? null,
    }))

    const { error: stopsError } = await supabase.from('logistica_rutas_paradas').insert(payload)
    if (stopsError) {
      console.error('Error inserting route stops:', stopsError)
    }
  }

  return data as DatabaseRutaLogistica
}

export async function actualizarEstadoRutaLogistica(
  rutaId: string,
  estado: DatabaseRutaLogistica['estado']
): Promise<boolean> {
  const { error } = await supabase
    .from('logistica_rutas')
    .update({ estado, updated_at: new Date().toISOString() })
    .eq('id', rutaId)

  if (error) {
    console.error('Error updating logistics route status:', error)
    return false
  }

  return true
}

// Funciones adicionales para usuarios
export async function updateUser(
  userId: string,
  userData: Partial<DatabaseUser>
): Promise<DatabaseUser | null> {
  const { data, error } = await supabase
    .from('users')
    .update(userData)
    .eq('id', userId)
    .select()
    .single()

  if (error || !data) {
    console.error('Error updating user:', error)
    return null
  }
  return data as DatabaseUser
}

export async function deleteUser(userId: string): Promise<boolean> {
  const { error } = await supabase.from('users').delete().eq('id', userId)
  if (error) {
    console.error('Error deleting user:', error)
    return false
  }
  return true
}

// Funciones para meals (catálogo general)
// Nota: Las comidas se separan en:
// - Menú del local: is_menu_item = true (aparecen en /menu)
// - Planes nutricionales: is_menu_item = false (solo para planes)
export interface DatabaseMeal {
  id: string
  name: string
  description?: string
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  calories: number
  protein?: number
  carbs?: number
  fats?: number
  ingredients?: string[]
  instructions?: string
  image_url?: string
  price?: number
  available: boolean
  is_menu_item: boolean // true = menú del local, false = planes nutricionales
  created_at: string
  updated_at: string
}

export async function getAllMeals(): Promise<DatabaseMeal[]> {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching meals:', error)
    return []
  }
  return data as DatabaseMeal[]
}

export async function getMealById(id: string): Promise<DatabaseMeal | null> {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as DatabaseMeal
}

export async function createMeal(
  mealData: Omit<DatabaseMeal, 'id' | 'created_at' | 'updated_at'>
): Promise<DatabaseMeal | null> {
  const { data, error } = await supabase
    .from('meals')
    .insert(mealData)
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating meal:', error)
    return null
  }
  return data as DatabaseMeal
}

export async function updateMeal(
  mealId: string,
  mealData: Partial<DatabaseMeal>
): Promise<DatabaseMeal | null> {
  const { data, error } = await supabase
    .from('meals')
    .update(mealData)
    .eq('id', mealId)
    .select()
    .single()

  if (error || !data) {
    console.error('Error updating meal:', error)
    return null
  }
  return data as DatabaseMeal
}

export async function deleteMeal(mealId: string): Promise<boolean> {
  const { error } = await supabase.from('meals').delete().eq('id', mealId)
  if (error) {
    console.error('Error deleting meal:', error)
    return false
  }
  return true
}

// Funciones adicionales para pedidos
export async function getAllOrders(): Promise<DatabaseOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching orders:', error)
    return []
  }
  return data as DatabaseOrder[]
}

export async function getOrderById(id: string): Promise<DatabaseOrder | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as DatabaseOrder
}

export interface DatabaseOrderItem {
  id: string
  order_id: string
  meal_id?: string | null
  quantity: number
  price: number
  created_at: string
}

export interface DatabaseOrderMealSetting {
  id: string
  order_item_id: string
  meal_type: 'lunch' | 'dinner'
  delivery_mode: 'delivery' | 'pickup'
  delivery_address_id?: string | null
  pickup_location?: string | null
  delivery_time: string
  estimated_delivery_time?: string | null
  created_at: string
  updated_at: string
}

export interface OrderMealSettingWithMeal extends DatabaseOrderMealSetting {
  order_id: string
  meal_id?: string | null
}

export interface OrderMealSettingInput {
  meal_id: string
  meal_type: 'lunch' | 'dinner'
  delivery_mode: 'delivery' | 'pickup'
  delivery_address_id?: string | null
  pickup_location?: string | null
  delivery_time: string
  scheduled_date?: string
}

export async function getOrderItemsByOrderId(orderId: string): Promise<DatabaseOrderItem[]> {
  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)

  if (error || !data) {
    console.error('Error fetching order items:', error)
    return []
  }
  return data as DatabaseOrderItem[]
}

export async function getOrderItemsByOrderIds(orderIds: string[]): Promise<DatabaseOrderItem[]> {
  if (orderIds.length === 0) return []
  
  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .in('order_id', orderIds)

  if (error || !data) {
    console.error('Error fetching order items:', error)
    return []
  }
  return data as DatabaseOrderItem[]
}

function mapMealSettingRow(row: any): OrderMealSettingWithMeal {
  const relatedItem = row.order_items || row.order_items_id || {}
  return {
    id: row.id,
    order_item_id: row.order_item_id,
    meal_type: row.meal_type,
    delivery_mode: row.delivery_mode,
    delivery_address_id: row.delivery_address_id ?? null,
    pickup_location: row.pickup_location ?? null,
    delivery_time: row.delivery_time,
    estimated_delivery_time: row.estimated_delivery_time ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    order_id: relatedItem.order_id ?? row.order_id ?? '',
    meal_id: relatedItem.meal_id ?? row.meal_id ?? null,
  }
}

export async function getOrderMealSettingsByOrderId(orderId: string): Promise<OrderMealSettingWithMeal[]> {
  const { data, error } = await supabase
    .from('order_meal_settings')
    .select('*, order_items!inner(order_id, meal_id)')
    .eq('order_items.order_id', orderId)

  if (error || !data) {
    if (error?.code !== 'PGRST116') {
      console.error('Error fetching meal settings by order:', error)
    }
    return []
  }

  return (data as any[]).map(mapMealSettingRow)
}

export async function getOrderMealSettingsByOrderIds(orderIds: string[]): Promise<OrderMealSettingWithMeal[]> {
  if (!orderIds.length) return []

  const { data, error } = await supabase
    .from('order_meal_settings')
    .select('*, order_items!inner(order_id, meal_id)')
    .in('order_items.order_id', orderIds)

  if (error || !data) {
    console.error('Error fetching meal settings by orders:', error)
    return []
  }

  return (data as any[]).map(mapMealSettingRow)
}

export async function upsertOrderMealSettings(
  orderId: string,
  meals: OrderMealSettingInput[]
): Promise<OrderMealSettingWithMeal[]> {
  if (!meals.length) return []

  const existingItems = await getOrderItemsByOrderId(orderId)
  const availableItemsByMealId = new Map<string, DatabaseOrderItem[]>()
  existingItems.forEach((item) => {
    if (!item.meal_id) return
    const list = availableItemsByMealId.get(item.meal_id) ?? []
    list.push(item)
    availableItemsByMealId.set(item.meal_id, list)
  })

  const { data: existingSettingsRows, error: existingSettingsError } = await supabase
    .from('order_meal_settings')
    .select('*, order_items(order_id, meal_id)')
    .eq('order_items.order_id', orderId)

  if (existingSettingsError) {
    console.error('Error fetching existing meal settings:', existingSettingsError)
    throw new Error('No se pudieron leer las configuraciones actuales')
  }

  const existingSettings = (existingSettingsRows as any[] | null)?.map(mapMealSettingRow) ?? []
  const settingsByKey = new Map<string, OrderMealSettingWithMeal>()
  const usedOrderItemIds = new Set<string>()

  existingSettings.forEach((setting) => {
    const key = `${setting.meal_id ?? ''}_${setting.meal_type}`
    settingsByKey.set(key, setting)
    usedOrderItemIds.add(setting.order_item_id)
  })

  const mealsWithOrderItems: Array<{ input: OrderMealSettingInput; orderItemId: string }> = []
  const pendingInsertions: Array<{ mealId: string; mapIndex: number }> = []

  meals.forEach((meal, index) => {
    const key = `${meal.meal_id}_${meal.meal_type}`
    const existingSetting = settingsByKey.get(key)
    if (existingSetting) {
      mealsWithOrderItems.push({ input: meal, orderItemId: existingSetting.order_item_id })
      usedOrderItemIds.add(existingSetting.order_item_id)
      return
    }

    const availableItems = availableItemsByMealId.get(meal.meal_id) ?? []
    const unusedItem = availableItems.find((item) => !usedOrderItemIds.has(item.id))
    if (unusedItem) {
      usedOrderItemIds.add(unusedItem.id)
      mealsWithOrderItems.push({ input: meal, orderItemId: unusedItem.id })
      return
    }

    pendingInsertions.push({ mealId: meal.meal_id, mapIndex: mealsWithOrderItems.length })
    mealsWithOrderItems.push({ input: meal, orderItemId: '' })
  })

  if (pendingInsertions.length > 0) {
    const insertPayload = pendingInsertions.map((pending) => ({
      order_id: orderId,
      meal_id: pending.mealId,
      quantity: 1,
      price: 0,
    }))

    const { data: insertedItems, error: insertError } = await supabase
      .from('order_items')
      .insert(insertPayload)
      .select('*')

    if (insertError || !insertedItems) {
      console.error('Error inserting order items for meal settings:', insertError)
      throw new Error('No se pudieron preparar las comidas del pedido')
    }

    pendingInsertions.forEach((pending, idx) => {
      const createdItem = (insertedItems as DatabaseOrderItem[])[idx]
      mealsWithOrderItems[pending.mapIndex].orderItemId = createdItem.id
    })
  }

  const settingsPayload = mealsWithOrderItems.map(({ input, orderItemId }) => {
    if (!orderItemId) {
      throw new Error('No se pudo asociar la comida con el pedido')
    }
    const shouldUseDelivery = input.delivery_mode === 'delivery'
    return {
      order_item_id: orderItemId,
      meal_type: input.meal_type,
      delivery_mode: input.delivery_mode,
      delivery_address_id: shouldUseDelivery ? input.delivery_address_id ?? null : null,
      pickup_location: shouldUseDelivery ? null : input.pickup_location ?? null,
      delivery_time: input.delivery_time,
    }
  })

  const { data, error } = await supabase
    .from('order_meal_settings')
    .upsert(settingsPayload, { onConflict: 'order_item_id' })
    .select('*, order_items(order_id, meal_id)')

  if (error || !data) {
    console.error('Error upserting meal settings:', error)
    throw new Error('No se pudieron guardar las configuraciones de entrega')
  }

  return (data as any[]).map(mapMealSettingRow)
}

export async function updateOrder(
  orderId: string,
  orderData: Partial<DatabaseOrder>
): Promise<DatabaseOrder | null> {
  const { data, error } = await supabase
    .from('orders')
    .update(orderData)
    .eq('id', orderId)
    .select()
    .single()

  if (error || !data) {
    console.error('Error updating order:', error)
    return null
  }
  return data as DatabaseOrder
}

export async function getOrdersByRepartidorId(repartidorId: string): Promise<DatabaseOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('repartidor_id', repartidorId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching orders by repartidor:', error)
    return []
  }
  return data as DatabaseOrder[]
}

// Funciones adicionales para citas
export async function getAllAppointments(): Promise<DatabaseAppointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('date_time', { ascending: false })

  if (error || !data) {
    console.error('Error fetching appointments:', error)
    return []
  }
  return data as DatabaseAppointment[]
}

// Verificar si hay conflictos de horario para una cita
export async function checkAppointmentConflict(
  dateTime: string,
  excludeAppointmentId?: string,
  nutricionistaId?: string | null,
  userId?: string | null
): Promise<{ hasConflict: boolean; conflictReason?: string }> {
  try {
    const appointmentDate = new Date(dateTime)
    
    // Normalizar la fecha para comparación: redondear a minutos (ignorar segundos y milisegundos)
    const normalizedDate = new Date(appointmentDate)
    normalizedDate.setSeconds(0, 0)
    normalizedDate.setMilliseconds(0)
    
    // Calcular rango de tiempo: desde el inicio del minuto hasta el final del minuto
    // Esto asegura que detectemos citas en el mismo minuto, incluso con diferencias de segundos/milisegundos
    const startRange = new Date(normalizedDate)
    const endRange = new Date(normalizedDate)
    endRange.setSeconds(59, 999) // Hasta el final del minuto
    
    // Buscar citas en el mismo rango de tiempo (misma fecha y hora, ignorando segundos y milisegundos)
    // Usamos gte (greater than or equal) y lte (less than or equal) para el rango
    const { data: conflictingAppointments, error } = await supabase
      .from('appointments')
      .select('*')
      .gte('date_time', startRange.toISOString())
      .lte('date_time', endRange.toISOString())
      .neq('status', 'cancelada') // Ignorar citas canceladas

    if (error) {
      console.error('Error checking appointment conflict:', error)
      return { hasConflict: false } // En caso de error, permitir la cita
    }

    if (!conflictingAppointments || conflictingAppointments.length === 0) {
      return { hasConflict: false }
    }

    // Filtrar la cita actual si se está actualizando
    const otherAppointments = excludeAppointmentId
      ? conflictingAppointments.filter(apt => apt.id !== excludeAppointmentId)
      : conflictingAppointments

    if (otherAppointments.length === 0) {
      return { hasConflict: false }
    }

    // IMPORTANTE: No permitir duplicados en la misma fecha y hora, independientemente de los datos
    // Esto previene que se creen múltiples citas en el mismo horario, incluso con los mismos datos
    // Verificar conflictos con el nutricionista
    if (nutricionistaId) {
      const nutricionistaConflict = otherAppointments.find(
        apt => apt.nutricionista_id === nutricionistaId
      )
      if (nutricionistaConflict) {
        return {
          hasConflict: true,
          conflictReason: 'El nutricionista ya tiene una cita en este horario'
        }
      }
    }

    // Verificar conflictos con el usuario
    if (userId) {
      const userConflict = otherAppointments.find(
        apt => apt.user_id === userId
      )
      if (userConflict) {
        return {
          hasConflict: true,
          conflictReason: 'Ya tienes una cita en este horario'
        }
      }
    }

    // REGLA PRINCIPAL: Si hay citas en el mismo horario (misma fecha y hora), es un conflicto
    // Esto previene duplicados incluso si son con los mismos datos o diferentes usuarios/nutricionistas
    // No puede haber múltiples citas en la misma fecha y hora
    return {
      hasConflict: true,
      conflictReason: 'Ya existe una cita en este horario. No se pueden crear citas duplicadas en la misma fecha y hora.'
    }
  } catch (error) {
    console.error('Error checking appointment conflict:', error)
    return { hasConflict: false } // En caso de error, permitir la cita
  }
}

export async function getAppointmentsByNutricionistaId(
  nutricionistaId: string
): Promise<DatabaseAppointment[]> {
  // Incluir citas asignadas a este nutricionista O citas sin nutricionista asignado (pendientes)
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .or(`nutricionista_id.eq.${nutricionistaId},nutricionista_id.is.null`)
    .order('date_time', { ascending: false })

  if (error || !data) {
    console.error('Error fetching appointments by nutricionista:', error)
    return []
  }
  return data as DatabaseAppointment[]
}

export async function updateAppointment(
  appointmentId: string,
  appointmentData: Partial<DatabaseAppointment>
): Promise<DatabaseAppointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .update(appointmentData)
    .eq('id', appointmentId)
    .select()
    .single()

  if (error || !data) {
    console.error('Error updating appointment:', error)
    return null
  }
  return data as DatabaseAppointment
}

export async function deleteAppointment(appointmentId: string): Promise<boolean> {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', appointmentId)

  if (error) {
    console.error('Error deleting appointment:', error)
    return false
  }
  return true
}

// Funciones para mensajes
export interface DatabaseMessage {
  id: string
  from_user_id: string
  to_user_id: string
  subject?: string
  message: string
  reply?: string
  read: boolean
  created_at: string
  updated_at: string
}

export async function createMessage(
  messageData: Omit<DatabaseMessage, 'id' | 'created_at' | 'updated_at'>
): Promise<any | null> {
  try {

    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()

    if (error) {
      console.error('Error creating message:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      return null
    }

    if (!data) {
      console.error('No data returned from message creation')
      return null
    }


    // Enriquecer el mensaje con datos de usuarios
    const userIds = [data.from_user_id, data.to_user_id].filter(Boolean)
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name, email, role')
        .in('id', userIds)

      if (users) {
        const usersMap = new Map(users.map((u: any) => [u.id, u]))
        const fromUser = usersMap.get(data.from_user_id)
        const toUser = usersMap.get(data.to_user_id)

        return {
          ...data,
          from_id: data.from_user_id,
          to_id: data.to_user_id,
          from_name: fromUser?.name || '',
          from_email: fromUser?.email || '',
          from_role: fromUser?.role || '',
          to_name: toUser?.name || '',
          to_email: toUser?.email || '',
          to_role: toUser?.role || '',
        }
      }
    }

    return {
      ...data,
      from_id: data.from_user_id,
      to_id: data.to_user_id,
      from_name: '',
      from_email: '',
      from_role: '',
      to_name: '',
      to_email: '',
      to_role: '',
    }
  } catch (error) {
    console.error('Exception in createMessage:', error)
    return null
  }
}

export async function getMessagesByUserId(userId: string): Promise<any[]> {
  try {
    // Obtener mensajes donde el usuario es remitente o destinatario
    // Usar dos consultas separadas para mayor compatibilidad y claridad
    const { data: messagesSent, error: sentError } = await supabase
      .from('messages')
      .select('*')
      .eq('from_user_id', userId)
      .order('created_at', { ascending: false })

    const { data: messagesReceived, error: receivedError } = await supabase
      .from('messages')
      .select('*')
      .eq('to_user_id', userId)
      .order('created_at', { ascending: false })

    if (sentError) {
      console.error('Error fetching sent messages:', sentError)
    }
    if (receivedError) {
      console.error('Error fetching received messages:', receivedError)
    }


    // Combinar y deduplicar mensajes (un mensaje puede aparecer en ambas listas si from = to, aunque no debería)
    const messagesMap = new Map()
    if (messagesSent) {
      messagesSent.forEach((msg: any) => messagesMap.set(msg.id, msg))
    }
    if (messagesReceived) {
      messagesReceived.forEach((msg: any) => messagesMap.set(msg.id, msg))
    }

    const messages = Array.from(messagesMap.values())
      .sort((a: any, b: any) => {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return dateB - dateA // Orden descendente (más recientes primero)
      })

    if (!messages || messages.length === 0) {
      return []
    }

    // Obtener todos los IDs de usuarios únicos
    const userIds = new Set<string>()
    messages.forEach((msg: any) => {
      if (msg.from_user_id) userIds.add(msg.from_user_id)
      if (msg.to_user_id) userIds.add(msg.to_user_id)
    })

    // Obtener datos de usuarios solo si hay IDs
    let usersMap = new Map<string, any>()
    if (userIds.size > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, role')
        .in('id', Array.from(userIds))

      if (usersError) {
        console.error('Error fetching users for messages:', usersError)
      } else if (users) {
        users.forEach((user: any) => {
          usersMap.set(user.id, user)
        })
      }
    }

    // Combinar mensajes con datos de usuarios
    return messages.map((msg: any) => {
      const fromUser = usersMap.get(msg.from_user_id)
      const toUser = usersMap.get(msg.to_user_id)
      
      return {
        ...msg,
        from_id: msg.from_user_id,
        to_id: msg.to_user_id,
        from_name: fromUser?.name || '',
        from_email: fromUser?.email || '',
        from_role: fromUser?.role || '',
        to_name: toUser?.name || '',
        to_email: toUser?.email || '',
        to_role: toUser?.role || '',
      }
    })
  } catch (error) {
    console.error('Exception in getMessagesByUserId:', error)
    return []
  }
}

export async function updateMessage(
  messageId: string,
  messageData: Partial<DatabaseMessage>
): Promise<any | null> {
  const { data, error } = await supabase
    .from('messages')
    .update(messageData)
    .eq('id', messageId)
    .select()
    .single()

  if (error || !data) {
    console.error('Error updating message:', error)
    return null
  }

  // Enriquecer el mensaje con datos de usuarios
  const userIds = [data.from_user_id, data.to_user_id].filter(Boolean)
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email, role')
      .in('id', userIds)

    if (users) {
      const usersMap = new Map(users.map((u: any) => [u.id, u]))
      const fromUser = usersMap.get(data.from_user_id)
      const toUser = usersMap.get(data.to_user_id)

      return {
        ...data,
        from_id: data.from_user_id,
        to_id: data.to_user_id,
        from_name: fromUser?.name || '',
        from_email: fromUser?.email || '',
        from_role: fromUser?.role || '',
        to_name: toUser?.name || '',
        to_email: toUser?.email || '',
        to_role: toUser?.role || '',
      }
    }
  }

  return {
    ...data,
    from_id: data.from_user_id,
    to_id: data.to_user_id,
    from_name: '',
    from_email: '',
    from_role: '',
    to_name: '',
    to_email: '',
    to_role: '',
  }
}

// Eliminar todos los mensajes de una conversación entre dos usuarios
export async function deleteMessagesByConversation(
  userId1: string,
  userId2: string
): Promise<boolean> {
  // Eliminar mensajes donde userId1 es remitente y userId2 es destinatario
  const { error: error1 } = await supabase
    .from('messages')
    .delete()
    .eq('from_user_id', userId1)
    .eq('to_user_id', userId2)

  // Eliminar mensajes donde userId2 es remitente y userId1 es destinatario
  const { error: error2 } = await supabase
    .from('messages')
    .delete()
    .eq('from_user_id', userId2)
    .eq('to_user_id', userId1)

  if (error1 || error2) {
    console.error('Error deleting messages by conversation:', error1 || error2)
    return false
  }
  return true
}

// Funciones para planes nutricionales
export interface DatabaseMealPlan {
  id: string
  name: string
  description?: string
  nutricionista_id?: string
  user_id?: string
  start_date: string
  end_date: string
  total_calories?: number
  status: 'active' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

export async function createMealPlan(
  planData: Omit<DatabaseMealPlan, 'id' | 'created_at' | 'updated_at'>
): Promise<DatabaseMealPlan | null> {
  const { data, error } = await supabase
    .from('meal_plans')
    .insert(planData)
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating meal plan:', error)
    return null
  }
  return data as DatabaseMealPlan
}

export async function getMealPlanByUserId(userId: string): Promise<DatabaseMealPlan | null> {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)

  // .single() lanza error si no hay resultados, así que usamos el primer elemento del array
  if (error || !data || data.length === 0) return null
  return data[0] as DatabaseMealPlan
}

export async function updateMealPlan(
  planId: string,
  planData: Partial<DatabaseMealPlan>
): Promise<DatabaseMealPlan | null> {
  const { data, error } = await supabase
    .from('meal_plans')
    .update(planData)
    .eq('id', planId)
    .select()
    .single()

  if (error || !data) {
    console.error('Error updating meal plan:', error)
    return null
  }
  return data as DatabaseMealPlan
}

// Eliminar plan asignado a un usuario
export async function deleteMealPlanByUserId(userId: string): Promise<boolean> {
  try {
    // Obtener el plan activo del usuario
    const plan = await getMealPlanByUserId(userId)
    
    if (!plan || !plan.id) {
      console.log('No active plan found for user:', userId)
      // Si no hay plan, consideramos esto como éxito (ya no tiene plan)
      return true
    }

    console.log('Deleting plan:', plan.id, 'for user:', userId)

    // Eliminar el plan (CASCADE eliminará días y comidas automáticamente)
    const { data, error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', plan.id)
      .eq('user_id', userId)
      .select()

    if (error) {
      console.error('Error deleting meal plan:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      return false
    }

    // Verificar que se eliminó correctamente
    if (data && data.length > 0) {
      console.log('Plan deleted successfully. Deleted rows:', data.length)
      
      // Esperar un momento para que la eliminación se propague
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Verificar que ya no existe
      const verifyPlan = await getMealPlanByUserId(userId)
      if (verifyPlan && verifyPlan.id === plan.id) {
        console.warn('Plan still exists after deletion! Plan ID:', verifyPlan.id)
        return false
      }
      
      console.log('Plan deletion verified successfully')
      return true
    } else {
      // No se eliminaron filas, pero puede ser que ya no exista
      console.log('No rows deleted. Verifying if plan still exists...')
      const verifyPlan = await getMealPlanByUserId(userId)
      if (!verifyPlan) {
        console.log('Plan does not exist, deletion successful (already deleted)')
        return true
      }
      console.warn('Plan still exists after delete attempt. Plan ID:', verifyPlan.id)
      return false
    }
  } catch (error: any) {
    console.error('Exception in deleteMealPlanByUserId:', error)
    console.error('Exception details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    return false
  }
}

// Funciones para días del plan
export interface DatabaseMealPlanDay {
  id: string
  meal_plan_id: string
  day_name: string
  day_number: number
  total_calories?: number
  created_at: string
}

export async function createMealPlanDay(
  dayData: Omit<DatabaseMealPlanDay, 'id' | 'created_at'>
): Promise<DatabaseMealPlanDay | null> {
  const { data, error } = await supabase
    .from('meal_plan_days')
    .insert(dayData)
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating meal plan day:', error)
    return null
  }
  return data as DatabaseMealPlanDay
}

// Funciones para comidas en días del plan
export interface DatabaseMealPlanDayMeal {
  id: string
  meal_plan_day_id: string
  meal_id: string
  meal_name: string
  meal_description?: string
  calories?: number
  order_index: number
  created_at: string
}

export async function createMealPlanDayMeal(
  mealData: Omit<DatabaseMealPlanDayMeal, 'id' | 'created_at'>
): Promise<DatabaseMealPlanDayMeal | null> {
  const { data, error } = await supabase
    .from('meal_plan_day_meals')
    .insert(mealData)
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating meal plan day meal:', error)
    return null
  }
  return data as DatabaseMealPlanDayMeal
}

export async function deleteMealPlanDayMeal(mealId: string): Promise<boolean> {
  const { error } = await supabase
    .from('meal_plan_day_meals')
    .delete()
    .eq('id', mealId)

  if (error) {
    console.error('Error deleting meal plan day meal:', error)
    return false
  }
  return true
}

// Función para obtener un plan completo con días y comidas
export async function getMealPlanWithDays(planId: string) {
  const { data: plan, error: planError } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('id', planId)
    .single()

  if (planError || !plan) {
    console.error('Error fetching meal plan:', planError)
    return null
  }

  const { data: days, error: daysError } = await supabase
    .from('meal_plan_days')
    .select(`
      *,
      meal_plan_day_meals (*)
    `)
    .eq('meal_plan_id', planId)
    .order('day_number', { ascending: true })

  if (daysError) {
    console.error('Error fetching meal plan days:', daysError)
    return { plan, days: [] }
  }

  // Normalizar meal_plan_day_meals para asegurar que sea un array
  const normalizedDays = (days || []).map((day: any) => {
    if (day.meal_plan_day_meals) {
      // Si es un array, dejarlo como está
      if (Array.isArray(day.meal_plan_day_meals)) {
        return day
      }
      // Si es un objeto, convertirlo a array
      if (typeof day.meal_plan_day_meals === 'object') {
        return {
          ...day,
          meal_plan_day_meals: Object.values(day.meal_plan_day_meals),
        }
      }
    }
    return { ...day, meal_plan_day_meals: [] }
  })

  return { plan, days: normalizedDays }
}

// Función para obtener planes creados por un nutricionista (sin asignar a cliente)
export async function getMealPlansByNutricionistaId(
  nutricionistaId: string
): Promise<DatabaseMealPlan[]> {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('nutricionista_id', nutricionistaId)
    .is('user_id', null) // Solo planes sin asignar
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching meal plans by nutricionista:', error)
    return []
  }
  return data as DatabaseMealPlan[]
}

// Función helper para verificar conexión a Supabase
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1)
    return !error
  } catch (error) {
    console.error('Supabase connection error:', error)
    return false
  }
}

// ==================== CREDENCIALES DE GOOGLE CALENDAR ====================

export interface DatabaseCalendarCredentials {
  id: string
  user_id: string
  access_token: string
  refresh_token?: string
  token_expiry?: string
  calendar_id: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export async function getCalendarCredentials(userId: string): Promise<DatabaseCalendarCredentials | null> {
  const { data, error } = await supabase
    .from('calendar_credentials')
    .select('*')
    .eq('user_id', userId)
    .eq('enabled', true)
    .single()

  if (error || !data) {
    if (error?.code === 'PGRST116') {
      // No se encontró registro
      return null
    }
    console.error('Error fetching calendar credentials:', error)
    return null
  }
  return data as DatabaseCalendarCredentials
}

export async function saveCalendarCredentials(
  userId: string,
  credentials: {
    access_token: string
    refresh_token?: string
    token_expiry?: string
    calendar_id?: string
  }
): Promise<DatabaseCalendarCredentials | null> {
  const { data, error } = await supabase
    .from('calendar_credentials')
    .upsert({
      user_id: userId,
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token || null,
      token_expiry: credentials.token_expiry || null,
      calendar_id: credentials.calendar_id || 'primary',
      enabled: true,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('Error saving calendar credentials:', error)
    return null
  }
  return data as DatabaseCalendarCredentials
}

export async function updateCalendarCredentials(
  userId: string,
  updates: Partial<DatabaseCalendarCredentials>
): Promise<DatabaseCalendarCredentials | null> {
  const { data, error } = await supabase
    .from('calendar_credentials')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()

  if (error || !data) {
    console.error('Error updating calendar credentials:', error)
    return null
  }
  return data as DatabaseCalendarCredentials
}

export async function disableCalendarCredentials(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('calendar_credentials')
    .update({ enabled: false })
    .eq('user_id', userId)

  if (error) {
    console.error('Error disabling calendar credentials:', error)
    return false
  }
  return true
}

// ==================== ASIGNACIÓN DE CLIENTES A NUTRICIONISTAS ====================

export interface DatabaseNutricionistaClient {
  id: string
  nutricionista_id: string
  client_id: string
  notes?: string
  created_at: string
  updated_at: string
}

export async function getClientsByNutricionistaId(
  nutricionistaId: string
): Promise<DatabaseNutricionistaClient[]> {
  const { data, error } = await supabase
    .from('nutricionista_clients')
    .select('*')
    .eq('nutricionista_id', nutricionistaId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching clients by nutricionista:', error)
    return []
  }
  return data as DatabaseNutricionistaClient[]
}

export async function assignClientToNutricionista(
  nutricionistaId: string,
  clientId: string,
  notes?: string
): Promise<DatabaseNutricionistaClient | null> {
  const { data, error } = await supabase
    .from('nutricionista_clients')
    .upsert(
      {
        nutricionista_id: nutricionistaId,
        client_id: clientId,
        notes: notes || null,
      },
      { onConflict: 'nutricionista_id,client_id' }
    )
    .select()
    .single()

  if (error || !data) {
    console.error('Error assigning client to nutricionista:', error)
    return null
  }
  return data as DatabaseNutricionistaClient
}

export async function removeClientFromNutricionista(
  nutricionistaId: string,
  clientId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('nutricionista_clients')
    .delete()
    .eq('nutricionista_id', nutricionistaId)
    .eq('client_id', clientId)

  if (error) {
    console.error('Error removing client from nutricionista:', error)
    return false
  }
  return true
}

export async function getNutricionistaByClientId(
  clientId: string
): Promise<DatabaseNutricionistaClient | null> {
  const { data, error } = await supabase
    .from('nutricionista_clients')
    .select('*')
    .eq('client_id', clientId)
    .single()

  if (error || !data) return null
  return data as DatabaseNutricionistaClient
}

// ==================== PREFERENCIAS DE CHAT ====================

export interface DatabaseChatPreference {
  id: string
  user_id: string
  contact_id: string
  is_archived: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export async function getChatPreferencesByUserId(
  userId: string
): Promise<DatabaseChatPreference[]> {
  const { data, error } = await supabase
    .from('user_chat_preferences')
    .select('*')
    .eq('user_id', userId)

  if (error) {
    // Si la tabla no existe, propagar el error para que la API lo maneje
    if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
      throw error
    }
    console.error('Error fetching chat preferences:', error)
    return []
  }
  
  return (data || []) as DatabaseChatPreference[]
}

export async function updateChatPreference(
  userId: string,
  contactId: string,
  preference: { is_archived?: boolean; is_deleted?: boolean }
): Promise<DatabaseChatPreference | null> {
  const { data, error } = await supabase
    .from('user_chat_preferences')
    .upsert(
      {
        user_id: userId,
        contact_id: contactId,
        is_archived: preference.is_archived ?? false,
        is_deleted: preference.is_deleted ?? false,
      },
      { onConflict: 'user_id,contact_id' }
    )
    .select()
    .single()

  if (error) {
    // Si la tabla no existe, propagar el error para que la API lo maneje
    if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
      throw error
    }
    console.error('Error updating chat preference:', error)
    return null
  }
  
  if (!data) return null
  return data as DatabaseChatPreference
}

// ==================== INCIDENCIAS DE PEDIDOS ====================

export interface DatabaseOrderIncident {
  id: string
  order_id: string
  repartidor_id: string
  description: string
  status: 'reported' | 'resolved' | 'cancelled'
  created_at: string
  updated_at: string
}

export async function createOrderIncident(
  incidentData: Omit<DatabaseOrderIncident, 'id' | 'created_at' | 'updated_at'>
): Promise<DatabaseOrderIncident | null> {
  const { data, error } = await supabase
    .from('order_incidents')
    .insert(incidentData)
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating order incident:', error)
    return null
  }
  return data as DatabaseOrderIncident
}

export async function getOrderIncidentsByRepartidorId(
  repartidorId: string
): Promise<DatabaseOrderIncident[]> {
  const { data, error } = await supabase
    .from('order_incidents')
    .select('*')
    .eq('repartidor_id', repartidorId)
    .eq('status', 'reported')
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching order incidents:', error)
    return []
  }
  return data as DatabaseOrderIncident[]
}

export async function getOrderIncidentByOrderId(
  orderId: string
): Promise<DatabaseOrderIncident | null> {
  const { data, error } = await supabase
    .from('order_incidents')
    .select('*')
    .eq('order_id', orderId)
    .eq('status', 'reported')
    .single()

  if (error || !data) return null
  return data as DatabaseOrderIncident
}

export async function getActiveIncidentsByOrderIds(
  orderIds: string[]
): Promise<DatabaseOrderIncident[]> {
  if (!orderIds.length) return []

  const { data, error } = await supabase
    .from('order_incidents')
    .select('*')
    .in('order_id', orderIds)
    .eq('status', 'reported')
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching incidents by order ids:', error)
    return []
  }

  return data as DatabaseOrderIncident[]
}

// ==================== CONFIGURACIONES DE USUARIO ====================

export interface DatabaseUserSettings {
  id: string
  user_id: string
  notifications_enabled: boolean
  notifications_new_messages: boolean
  notifications_order_updates: boolean
  notifications_plan_assignments: boolean
  notifications_appointments: boolean
  notifications_new_orders: boolean
  notifications_weekly_menu?: boolean
  notifications_menu_changes_approved?: boolean
  notifications_order_status?: boolean
  notifications_renewal_reminder?: boolean
  notifications_plan_approval?: boolean
  notifications_consultation_required?: boolean
  preferences_language: string
  preferences_theme: 'light' | 'dark' | 'auto'
  preferences_email_notifications: boolean
  created_at: string
  updated_at: string
}

export async function getUserSettings(userId: string): Promise<DatabaseUserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    // Si no existe, retornar null (se creará automáticamente al actualizar)
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching user settings:', error)
    return null
  }
  
  return data as DatabaseUserSettings
}

export async function updateUserSettings(
  userId: string,
  settings: Partial<Omit<DatabaseUserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<DatabaseUserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .upsert(
      {
        user_id: userId,
        ...settings,
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error || !data) {
    console.error('Error updating user settings:', error)
    return null
  }
  
  return data as DatabaseUserSettings
}

// ==================== HORARIOS DE NUTRICIONISTA ====================

export interface DatabaseNutritionistSchedule {
  id: string
  user_id: string
  schedule_mode: 'continuous' | 'split'
  monday_start_hour: number | null
  monday_end_hour: number | null
  monday_second_start_hour: number | null
  monday_second_end_hour: number | null
  monday_enabled: boolean
  tuesday_start_hour: number | null
  tuesday_end_hour: number | null
  tuesday_second_start_hour: number | null
  tuesday_second_end_hour: number | null
  tuesday_enabled: boolean
  wednesday_start_hour: number | null
  wednesday_end_hour: number | null
  wednesday_second_start_hour: number | null
  wednesday_second_end_hour: number | null
  wednesday_enabled: boolean
  thursday_start_hour: number | null
  thursday_end_hour: number | null
  thursday_second_start_hour: number | null
  thursday_second_end_hour: number | null
  thursday_enabled: boolean
  friday_start_hour: number | null
  friday_end_hour: number | null
  friday_second_start_hour: number | null
  friday_second_end_hour: number | null
  friday_enabled: boolean
  saturday_start_hour: number | null
  saturday_end_hour: number | null
  saturday_second_start_hour: number | null
  saturday_second_end_hour: number | null
  saturday_enabled: boolean
  sunday_start_hour: number | null
  sunday_end_hour: number | null
  sunday_second_start_hour: number | null
  sunday_second_end_hour: number | null
  sunday_enabled: boolean
  slot_duration_minutes: number
  created_at: string
  updated_at: string
}

export async function getNutritionistSchedule(
  userId: string
): Promise<DatabaseNutritionistSchedule | null> {
  const { data, error } = await supabase
    .from('nutritionist_schedule')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching nutritionist schedule:', error)
    return null
  }

  return data as DatabaseNutritionistSchedule | null
}

export async function createNutritionistSchedule(
  userId: string,
  schedule: Partial<Omit<DatabaseNutritionistSchedule, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<DatabaseNutritionistSchedule | null> {
  const { data, error } = await supabase
    .from('nutritionist_schedule')
    .insert({
      user_id: userId,
      ...schedule,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating nutritionist schedule:', error)
    return null
  }

  return data as DatabaseNutritionistSchedule
}

export async function updateNutritionistSchedule(
  userId: string,
  schedule: Partial<Omit<DatabaseNutritionistSchedule, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<DatabaseNutritionistSchedule | null> {
  const { data, error } = await supabase
    .from('nutritionist_schedule')
    .update(schedule)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating nutritionist schedule:', error)
    return null
  }

  return data as DatabaseNutritionistSchedule
}

export async function createOrUpdateNutritionistSchedule(
  userId: string,
  schedule: Partial<Omit<DatabaseNutritionistSchedule, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<DatabaseNutritionistSchedule | null> {
  // Primero intentar obtener el schedule existente
  const existing = await getNutritionistSchedule(userId)

  if (existing) {
    // Actualizar
    return await updateNutritionistSchedule(userId, schedule)
  } else {
    // Crear nuevo
    return await createNutritionistSchedule(userId, schedule)
  }
}

