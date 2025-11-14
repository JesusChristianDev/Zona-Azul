/**
 * Script para probar los cron jobs localmente
 * Uso: node scripts/test-cron-jobs.js [nombre-funcion]
 * 
 * Funciones disponibles:
 * - weekly-menus
 * - renewal-reminder
 * - nutritionist-reports
 * - delivery-reports
 * 
 * Requiere: dotenv (npm install dotenv)
 */

// Cargar variables de entorno desde .env.local
const fs = require('fs')
const path = require('path')

// Intentar cargar con dotenv primero
try {
  require('dotenv').config({ path: '.env.local' })
} catch (e) {
  // Si dotenv no está disponible, cargar manualmente
  const envPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    // Procesar línea por línea, manejando valores multilínea
    let currentKey = null
    let currentValue = []
    
    envContent.split(/\r?\n/).forEach(line => {
      // Ignorar comentarios y líneas vacías
      if (line.trim().startsWith('#') || !line.trim()) {
        return
      }
      
      // Si la línea contiene un =, es una nueva variable
      if (line.includes('=')) {
        // Guardar la variable anterior si existe
        if (currentKey) {
          process.env[currentKey] = currentValue.join('').trim()
        }
        
        const match = line.match(/^([^=]+)=(.*)$/)
        if (match) {
          currentKey = match[1].trim()
          currentValue = [match[2].trim()]
        }
      } else if (currentKey) {
        // Continuación de la variable anterior (multilínea)
        currentValue.push(line.trim())
      }
    })
    
    // Guardar la última variable
    if (currentKey) {
      process.env[currentKey] = currentValue.join('').trim().replace(/^["']|["']$/g, '')
    }
  }
}

const functions = {
  'weekly-menus': {
    endpoint: '/api/weekly-menus/generate',
    method: 'POST',
    body: null
  },
  'renewal-reminder': {
    endpoint: '/api/subscriptions/renewal-reminder',
    method: 'POST',
    body: { days_before: 7 }
  },
  'nutritionist-reports': {
    endpoint: '/api/reports/nutritionist/generate-automatic',
    method: 'POST',
    body: { report_type: 'nutritionist_weekly' }
  },
  'delivery-reports': {
    endpoint: '/api/reports/delivery-satisfaction/generate',
    method: 'POST',
    body: { report_type: 'delivery_satisfaction_weekly' }
  }
}

async function testCronJob(functionName) {
  const func = functions[functionName]
  
  if (!func) {
    console.error(`❌ Función "${functionName}" no encontrada.`)
    console.log('\nFunciones disponibles:')
    Object.keys(functions).forEach(name => {
      console.log(`  - ${name}`)
    })
    process.exit(1)
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const cronToken = process.env.CRON_SECRET_TOKEN || 'default-secret-token'
  
  console.log(`\n🧪 Probando función: ${functionName}`)
  console.log(`📍 Endpoint: ${baseUrl}${func.endpoint}`)
  console.log(`🔐 Token: ${cronToken.substring(0, 10)}...`)
  
  if (cronToken === 'default-secret-token') {
    console.log('⚠️  ADVERTENCIA: Usando token por defecto. Crea un archivo .env.local con:')
    console.log('   CRON_SECRET_TOKEN=tu-token-generado')
    console.log('')
  }
  
  console.log('─'.repeat(50))
  
  try {
    const response = await fetch(`${baseUrl}${func.endpoint}`, {
      method: func.method,
      headers: {
        'Authorization': `Bearer ${cronToken}`,
        'Content-Type': 'application/json',
      },
      body: func.body ? JSON.stringify(func.body) : null,
    })
    
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Éxito!')
      console.log('📊 Respuesta:', JSON.stringify(data, null, 2))
    } else {
      console.log('❌ Error:', response.status)
      console.log('📊 Respuesta:', JSON.stringify(data, null, 2))
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error.message)
    console.log('\n💡 Asegúrate de que:')
    console.log('   1. El servidor de desarrollo esté corriendo (npm run dev)')
    console.log('   2. La variable CRON_SECRET_TOKEN esté configurada en .env.local')
    console.log('   3. La URL NEXT_PUBLIC_APP_URL sea correcta')
    console.log('\n🔧 Para configurar el token:')
    console.log('   1. Genera un token: node -e "const crypto = require(\'crypto\'); console.log(crypto.randomBytes(32).toString(\'hex\'))"')
    console.log('   2. Agrega en .env.local: CRON_SECRET_TOKEN=tu-token-generado')
    console.log('   3. Asegúrate de que el mismo token esté en el servidor Next.js')
  }
}

// Ejecutar
const functionName = process.argv[2]

if (!functionName) {
  console.log('📋 Script de prueba de Cron Jobs\n')
  console.log('Uso: node scripts/test-cron-jobs.js [nombre-funcion]\n')
  console.log('Funciones disponibles:')
  Object.keys(functions).forEach(name => {
    console.log(`  - ${name}`)
  })
  console.log('\nEjemplo:')
  console.log('  node scripts/test-cron-jobs.js weekly-menus')
  process.exit(0)
}

testCronJob(functionName)

