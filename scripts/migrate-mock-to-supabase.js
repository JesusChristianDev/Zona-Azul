/**
 * Script para migrar datos mock a Supabase
 * Ejecuta: node scripts/migrate-mock-to-supabase.js
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Usuarios mock para migrar
const mockUsers = [
  {
    email: 'admin@zonaazul.com',
    password: 'admin123',
    role: 'admin',
    name: 'Administrador Zona Azul',
  },
  {
    email: 'cliente@zonaazul.com',
    password: 'cliente123',
    role: 'suscriptor',
    name: 'Gregorio',
  },
  {
    email: 'nutricionista@zonaazul.com',
    password: 'nutri123',
    role: 'nutricionista',
    name: 'Dra. María García',
  },
  {
    email: 'repartidor@zonaazul.com',
    password: 'repartidor123',
    role: 'repartidor',
    name: 'Carlos Repartidor',
  },
  {
    email: 'test@zonaazul.com',
    password: 'test123',
    role: 'suscriptor',
    name: 'Paco',
  },
]

async function migrateUsers() {
  console.log('👥 Migrando usuarios...\n')

  for (const user of mockUsers) {
    try {
      // Verificar si el usuario ya existe
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email.toLowerCase())
        .single()

      if (existing) {
        console.log(`   ⏭️  Usuario ${user.email} ya existe, omitiendo`)
        continue
      }

      // Hash de la contraseña
      const password_hash = await bcrypt.hash(user.password, 10)

      // Crear usuario
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: user.email.toLowerCase(),
          password_hash,
          role: user.role,
          name: user.name,
        })
        .select()
        .single()

      if (error) {
        console.error(`   ❌ Error creando ${user.email}:`, error.message)
      } else {
        console.log(`   ✅ Usuario creado: ${user.email} (${user.role})`)
      }
    } catch (error) {
      console.error(`   ❌ Error con ${user.email}:`, error.message)
    }
  }

  console.log('\n✅ Migración de usuarios completada\n')
}

async function migrateMenuItems() {
  console.log('🍽️  Migrando items del menú...\n')

  // Items del menú por defecto
  const menuItems = [
    {
      name: 'Bowl Vitalidad',
      description: 'Base de quinoa, garbanzos especiados, aguacate y salsa tahini.',
      type: 'lunch',
      calories: 620,
      protein: 20,
      carbs: 75,
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
      protein: 18,
      carbs: 65,
      fats: 15,
      ingredients: ['Tortilla integral', 'Falafel', 'Hummus', 'Vegetales'],
      price: 9.2,
      available: true,
    },
  ]

  for (const item of menuItems) {
    try {
      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('meals')
        .select('id')
        .eq('name', item.name)
        .single()

      if (existing) {
        console.log(`   ⏭️  ${item.name} ya existe, omitiendo`)
        continue
      }

      const { data, error } = await supabase
        .from('meals')
        .insert(item)
        .select()
        .single()

      if (error) {
        console.error(`   ❌ Error creando ${item.name}:`, error.message)
      } else {
        console.log(`   ✅ Item creado: ${item.name}`)
      }
    } catch (error) {
      console.error(`   ❌ Error con ${item.name}:`, error.message)
    }
  }

  console.log('\n✅ Migración de menú completada\n')
}

async function main() {
  console.log('🚀 Iniciando migración de datos mock a Supabase\n')
  console.log('='.repeat(50) + '\n')

  try {
    await migrateUsers()
    await migrateMenuItems()

    console.log('='.repeat(50))
    console.log('✅ Migración completada exitosamente!')
    console.log('\n💡 Puedes iniciar sesión con:')
    console.log('   - admin@zonaazul.com / admin123')
    console.log('   - cliente@zonaazul.com / cliente123')
    console.log('   - nutricionista@zonaazul.com / nutri123')
    console.log('   - repartidor@zonaazul.com / repartidor123')
  } catch (error) {
    console.error('\n❌ Error durante la migración:', error)
    process.exit(1)
  }
}

main()

