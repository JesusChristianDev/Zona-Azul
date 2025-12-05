import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Variables de entorno para Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Función para validar la configuración de Supabase
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== '' && supabaseAnonKey !== '')
}

const globalForSupabase = globalThis as unknown as {
  supabaseClient?: SupabaseClient
}

// Función para crear el cliente de Supabase de forma segura
function createSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    const errorMessage = '⚠️ Supabase no está configurado. Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en tu archivo .env.local'
    console.error(errorMessage)
    // Lanzar error en lugar de crear un cliente inválido
    throw new Error(errorMessage)
  }

  const existingClient = globalForSupabase.supabaseClient
  if (existingClient) return existingClient

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    // Configuración para escenarios en tiempo real sin abrir demasiadas conexiones
    realtime: {
      params: {
        eventsPerSecond: 5,
      },
    },
  })

  // Reutilizar el cliente en desarrollo para evitar múltiples instancias y conexiones
  if (process.env.NODE_ENV === 'development') {
    globalForSupabase.supabaseClient = client
  }

  return client
}

// Cliente de Supabase para uso en el cliente (browser)
// Se crea solo si está configurado, de lo contrario lanzará error al intentar usarlo
export const supabase: SupabaseClient = (() => {
  try {
    return createSupabaseClient()
  } catch (error) {
    // En desarrollo, mostrar error claro
    if (process.env.NODE_ENV === 'development') {
      console.error('Error al inicializar Supabase:', error)
    }
    // Retornar un cliente placeholder que fallará con mensaje claro
    return createClient('https://placeholder.supabase.co', 'placeholder-key')
  }
})()

// Cliente de Supabase para uso en el servidor (con service role key si es necesario)
// Para operaciones administrativas, usa SUPABASE_SERVICE_ROLE_KEY en el servidor
export function createServerClient() {
  if (!supabaseUrl) {
    const errorMessage = '⚠️ Supabase no está configurado. NEXT_PUBLIC_SUPABASE_URL es requerido.'
    console.error(errorMessage)
    throw new Error(errorMessage)
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceRoleKey) {
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  
  // Si no hay service role key, usar anon key
  if (!supabaseAnonKey) {
    const errorMessage = '⚠️ Supabase no está configurado. NEXT_PUBLIC_SUPABASE_ANON_KEY es requerido.'
    console.error(errorMessage)
    throw new Error(errorMessage)
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

