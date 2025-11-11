/**
 * Script para verificar la configuración de Supabase
 * Ejecuta: node scripts/verificar-supabase.js
 */

const fs = require('fs')
const path = require('path')

// Intentar cargar .env.local (prioridad) o .env
const envFiles = ['.env.local', '.env']
let envLoaded = false

for (const envFile of envFiles) {
  const envPath = path.join(process.cwd(), envFile)
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath })
    envLoaded = true
    console.log(`📄 Cargando variables de ${envFile}...\n`)
    break
  }
}

if (!envLoaded) {
  console.warn('⚠️  No se encontró archivo .env.local')
  console.log('   Asegúrate de tener un archivo .env.local con tus credenciales\n')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 Verificando configuración de Supabase...\n')

// Verificar variables de entorno
if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL no está definida')
  console.log('   Crea un archivo .env.local con NEXT_PUBLIC_SUPABASE_URL')
  process.exit(1)
}

if (!supabaseAnonKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY no está definida')
  console.log('   Agrega NEXT_PUBLIC_SUPABASE_ANON_KEY a tu archivo .env.local')
  process.exit(1)
}

// Verificar formato de URL
if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  console.warn('⚠️  NEXT_PUBLIC_SUPABASE_URL no parece ser una URL válida de Supabase')
  console.log('   Debería ser algo como: https://xxxxx.supabase.co')
}

// Verificar formato de key
if (supabaseAnonKey.length < 100) {
  console.warn('⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY parece ser muy corta')
  console.log('   Las keys de Supabase suelen ser muy largas (más de 100 caracteres)')
}

console.log('✅ Variables de entorno encontradas:')
console.log(`   URL: ${supabaseUrl.substring(0, 30)}...`)
console.log(`   Key: ${supabaseAnonKey.substring(0, 20)}...\n`)

// Intentar conectar (requiere @supabase/supabase-js)
try {
  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  console.log('🔄 Intentando conectar a Supabase...')
  
  supabase
    .from('users')
    .select('count')
    .limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ Error al conectar:', error.message)
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
          console.log('\n💡 Solución: Ejecuta el esquema SQL en Supabase:')
          console.log('   1. Ve a Supabase Dashboard > SQL Editor')
          console.log('   2. Copia el contenido de supabase/schema.sql')
          console.log('   3. Ejecuta el script')
        } else if (error.message.includes('Invalid API key')) {
          console.log('\n💡 Solución: Verifica que la API key sea correcta:')
          console.log('   1. Ve a Supabase Dashboard > Settings > API')
          console.log('   2. Copia la clave "anon public"')
          console.log('   3. Actualiza .env.local')
        }
        process.exit(1)
      } else {
        console.log('✅ Conexión exitosa a Supabase!')
        console.log('✅ El esquema está configurado correctamente\n')
        console.log('🎉 ¡Todo está listo para usar!')
        process.exit(0)
      }
    })
    .catch((err) => {
      console.error('❌ Error inesperado:', err.message)
      process.exit(1)
    })
} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND') {
    console.log('⚠️  @supabase/supabase-js no está instalado')
    console.log('   Ejecuta: npm install @supabase/supabase-js')
  } else {
    console.error('❌ Error:', err.message)
  }
  process.exit(1)
}

