/**
 * Script para verificar que todas las dependencias necesarias estén instaladas
 */

const fs = require('fs')
const path = require('path')

console.log('🔍 Verificando dependencias...\n')

const requiredDependencies = {
  '@supabase/supabase-js': 'Cliente de Supabase',
  'bcryptjs': 'Hash de contraseñas',
  'dotenv': 'Variables de entorno',
  'next': 'Framework Next.js',
  'react': 'React',
  'react-dom': 'React DOM',
}

const requiredDevDependencies = {
  '@types/bcryptjs': 'Tipos TypeScript para bcryptjs',
  '@types/node': 'Tipos TypeScript para Node.js',
  'typescript': 'TypeScript',
}

let allOk = true

// Verificar package.json
const packageJsonPath = path.join(process.cwd(), 'package.json')
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json no encontrado')
  process.exit(1)
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }

// Verificar dependencias principales
console.log('📦 Dependencias principales:')
for (const [dep, description] of Object.entries(requiredDependencies)) {
  if (deps[dep]) {
    console.log(`   ✅ ${dep} - ${description}`)
  } else {
    console.log(`   ❌ ${dep} - FALTA: ${description}`)
    allOk = false
  }
}

// Verificar devDependencies
console.log('\n🔧 DevDependencies:')
for (const [dep, description] of Object.entries(requiredDevDependencies)) {
  if (deps[dep]) {
    console.log(`   ✅ ${dep} - ${description}`)
  } else {
    console.log(`   ⚠️  ${dep} - Opcional: ${description}`)
  }
}

// Verificar archivos importantes
console.log('\n📁 Archivos de configuración:')
const importantFiles = {
  '.env.local': 'Variables de entorno',
  'supabase/schema.sql': 'Esquema de base de datos',
  'src/lib/supabase.ts': 'Cliente de Supabase',
  'src/lib/db.ts': 'Funciones de base de datos',
}

for (const [file, description] of Object.entries(importantFiles)) {
  const filePath = path.join(process.cwd(), file)
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file} - ${description}`)
  } else {
    console.log(`   ❌ ${file} - FALTA: ${description}`)
    allOk = false
  }
}

// Verificar rutas API
console.log('\n🔌 Rutas API:')
const apiRoutes = [
  'src/app/api/auth/validate/route.ts',
  'src/app/api/users/route.ts',
  'src/app/api/meals/route.ts',
  'src/app/api/orders/route.ts',
  'src/app/api/progress/route.ts',
]

let apiRoutesOk = true
for (const route of apiRoutes) {
  const routePath = path.join(process.cwd(), route)
  if (fs.existsSync(routePath)) {
    console.log(`   ✅ ${route}`)
  } else {
    console.log(`   ❌ ${route} - FALTA`)
    apiRoutesOk = false
  }
}

console.log('\n' + '='.repeat(50))

if (allOk && apiRoutesOk) {
  console.log('✅ Todas las dependencias y archivos están presentes')
  console.log('\n💡 Próximo paso: Reinicia el servidor de desarrollo')
  console.log('   npm run dev')
  process.exit(0)
} else {
  console.log('❌ Faltan algunas dependencias o archivos')
  console.log('\n💡 Solución:')
  if (!allOk) {
    console.log('   1. Instala las dependencias faltantes:')
    console.log('      npm install')
  }
  if (!apiRoutesOk) {
    console.log('   2. Verifica que todas las rutas API existan')
  }
  process.exit(1)
}

