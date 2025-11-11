/**
 * Script para migrar datos mock a Supabase
 * Ejecuta: npx tsx scripts/migrate-mock-data.ts
 * 
 * Este script migra los usuarios mock a la base de datos Supabase
 */

import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { mockUsers } from '../src/lib/mockUsers'

// Cargar variables de entorno
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY deben estar en .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function migrateUsers() {
  console.log('🔄 Migrando usuarios mock a Supabase...\n')

  for (const mockUser of mockUsers) {
    try {
      // Verificar si el usuario ya existe
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', mockUser.email.toLowerCase())
        .single()

      if (existingUser) {
        console.log(`⏭️  Usuario ${mockUser.email} ya existe, saltando...`)
        continue
      }

      // Hash de la contraseña
      const passwordHash = await bcrypt.hash(mockUser.password, 10)

      // Crear usuario en Supabase
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          email: mockUser.email.toLowerCase(),
          password_hash: passwordHash,
          role: mockUser.role,
          name: mockUser.name,
          created_at: mockUser.createdAt,
        })
        .select()
        .single()

      if (error) {
        console.error(`❌ Error al migrar ${mockUser.email}:`, error.message)
        continue
      }

      console.log(`✅ Usuario migrado: ${mockUser.email} (${mockUser.role})`)

      // Crear perfil si es suscriptor
      if (mockUser.role === 'suscriptor') {
        await supabase.from('profiles').insert({
          user_id: newUser.id,
          subscription_status: 'active',
        })
        console.log(`   📝 Perfil creado para ${mockUser.email}`)
      }
    } catch (error: any) {
      console.error(`❌ Error inesperado con ${mockUser.email}:`, error.message)
    }
  }

  console.log('\n✅ Migración de usuarios completada')
}

async function migrateMenuItems() {
  console.log('\n🔄 Migrando items del menú...\n')

  // Items por defecto del menú
  const defaultMenuItems = [
    {
      name: 'Bowl Vitalidad',
      description: 'Base de quinoa, garbanzos especiados, aguacate y salsa tahini.',
      type: 'lunch',
      calories: 620,
      protein: 25,
      carbs: 55,
      fats: 18,
      ingredients: ['Quinoa', 'Garbanzos', 'Aguacate', 'Salsa tahini'],
      price: 11.9,
      available: true,
    },
    {
      name: 'Smoothie Azul',
      description: 'Blueberries, plátano, leche de almendra y espirulina.',
      type: 'snack',
      calories: 180,
      protein: 5,
      carbs: 35,
      fats: 3,
      ingredients: ['Blueberries', 'Plátano', 'Leche de almendra', 'Espirulina'],
      price: 4.5,
      available: true,
    },
    {
      name: 'Wrap Proteico',
      description: 'Tortilla integral con falafel, hummus y vegetales frescos.',
      type: 'lunch',
      calories: 540,
      protein: 20,
      carbs: 65,
      fats: 15,
      ingredients: ['Tortilla integral', 'Falafel', 'Hummus', 'Vegetales'],
      price: 9.2,
      available: true,
    },
  ]

  for (const item of defaultMenuItems) {
    try {
      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('meals')
        .select('id')
        .eq('name', item.name)
        .single()

      if (existing) {
        console.log(`⏭️  ${item.name} ya existe, saltando...`)
        continue
      }

      const { error } = await supabase.from('meals').insert(item)

      if (error) {
        console.error(`❌ Error al migrar ${item.name}:`, error.message)
        continue
      }

      console.log(`✅ Item migrado: ${item.name}`)
    } catch (error: any) {
      console.error(`❌ Error con ${item.name}:`, error.message)
    }
  }

  console.log('\n✅ Migración de menú completada')
}

async function main() {
  console.log('🚀 Iniciando migración de datos mock a Supabase\n')
  console.log('='.repeat(50))

  try {
    // Verificar conexión
    const { error: connectionError } = await supabase.from('users').select('count').limit(1)
    if (connectionError) {
      console.error('❌ Error de conexión a Supabase:', connectionError.message)
      console.log('\n💡 Asegúrate de:')
      console.log('   1. Tener las variables de entorno configuradas en .env.local')
      console.log('   2. Haber ejecutado el esquema SQL en Supabase')
      process.exit(1)
    }

    console.log('✅ Conexión a Supabase verificada\n')

    // Migrar usuarios
    await migrateUsers()

    // Migrar menú
    await migrateMenuItems()

    console.log('\n' + '='.repeat(50))
    console.log('🎉 Migración completada exitosamente!')
    console.log('\n💡 Próximos pasos:')
    console.log('   1. Verifica los datos en Supabase Dashboard')
    console.log('   2. Actualiza el frontend para usar solo APIs')
    console.log('   3. Elimina los datos mock del código')
  } catch (error: any) {
    console.error('\n❌ Error durante la migración:', error.message)
    process.exit(1)
  }
}

main()

