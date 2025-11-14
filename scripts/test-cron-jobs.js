/**
 * Script para probar los cron jobs localmente
 * Uso: node scripts/test-cron-jobs.js [nombre-funcion]
 * 
 * Funciones disponibles:
 * - weekly-menus
 * - renewal-reminder
 * - nutritionist-reports
 * - delivery-reports
 */

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
    console.log('   2. La variable CRON_SECRET_TOKEN esté configurada')
    console.log('   3. La URL NEXT_PUBLIC_APP_URL sea correcta')
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

