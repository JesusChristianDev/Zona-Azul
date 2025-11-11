/**
 * Script para configurar credenciales de Google OAuth desde archivo JSON
 * 
 * Uso:
 * 1. Descarga el archivo JSON de credenciales de Google Cloud Console
 * 2. Colócalo en la raíz del proyecto con el nombre: credentials.json
 * 3. Ejecuta: node scripts/setup-google-credentials.js
 */

const fs = require('fs')
const path = require('path')

// Buscar archivo JSON de credenciales
const possibleNames = [
  'credentials.json',
  'client_secret.json',
  'oauth-credentials.json',
  'google-credentials.json'
]

let credentialsFile = null
for (const name of possibleNames) {
  const filePath = path.join(process.cwd(), name)
  if (fs.existsSync(filePath)) {
    credentialsFile = filePath
    break
  }
}

if (!credentialsFile) {
  console.error('❌ No se encontró archivo JSON de credenciales')
  console.log('\n📋 Archivos buscados:')
  possibleNames.forEach(name => console.log(`   - ${name}`))
  console.log('\n💡 Pasos:')
  console.log('   1. Descarga el archivo JSON de Google Cloud Console')
  console.log('   2. Colócalo en la raíz del proyecto con uno de los nombres arriba')
  console.log('   3. Ejecuta este script de nuevo')
  process.exit(1)
}

console.log(`✅ Archivo encontrado: ${path.basename(credentialsFile)}\n`)

// Leer y parsear JSON
let credentials
try {
  const fileContent = fs.readFileSync(credentialsFile, 'utf8')
  credentials = JSON.parse(fileContent)
} catch (error) {
  console.error('❌ Error al leer el archivo JSON:', error.message)
  process.exit(1)
}

// Extraer credenciales
let clientId, clientSecret

// Formato 1: { "web": { "client_id": "...", "client_secret": "..." } }
if (credentials.web) {
  clientId = credentials.web.client_id
  clientSecret = credentials.web.client_secret
}
// Formato 2: { "installed": { "client_id": "...", "client_secret": "..." } }
else if (credentials.installed) {
  clientId = credentials.installed.client_id
  clientSecret = credentials.installed.client_secret
}
// Formato 3: { "client_id": "...", "client_secret": "..." }
else if (credentials.client_id && credentials.client_secret) {
  clientId = credentials.client_id
  clientSecret = credentials.client_secret
}
else {
  console.error('❌ Formato de JSON no reconocido')
  console.log('\n📋 El archivo debe contener:')
  console.log('   - client_id o web.client_id o installed.client_id')
  console.log('   - client_secret o web.client_secret o installed.client_secret')
  process.exit(1)
}

if (!clientId || !clientSecret) {
  console.error('❌ No se encontraron client_id o client_secret en el JSON')
  process.exit(1)
}

console.log('✅ Credenciales extraídas:')
console.log(`   Client ID: ${clientId.substring(0, 30)}...`)
console.log(`   Client Secret: ${clientSecret.substring(0, 10)}...\n`)

// Leer .env.local existente
const envPath = path.join(process.cwd(), '.env.local')
let envContent = ''

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8')
  console.log('✅ Archivo .env.local encontrado\n')
} else {
  console.log('⚠️  Archivo .env.local no existe, se creará uno nuevo\n')
}

// Actualizar o agregar variables
const lines = envContent.split('\n')
let updated = false
let clientIdLine = -1
let clientSecretLine = -1

// Buscar líneas existentes
lines.forEach((line, index) => {
  if (line.startsWith('GOOGLE_CLIENT_ID=')) {
    clientIdLine = index
  }
  if (line.startsWith('GOOGLE_CLIENT_SECRET=')) {
    clientSecretLine = index
  }
})

// Actualizar o agregar
if (clientIdLine >= 0) {
  lines[clientIdLine] = `GOOGLE_CLIENT_ID=${clientId}`
  updated = true
} else {
  // Buscar sección de Google Calendar o agregar al final
  let insertIndex = lines.length
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('Google Calendar') || lines[i].includes('GOOGLE')) {
      insertIndex = i + 1
      break
    }
  }
  lines.splice(insertIndex, 0, `GOOGLE_CLIENT_ID=${clientId}`)
  updated = true
}

if (clientSecretLine >= 0) {
  lines[clientSecretLine] = `GOOGLE_CLIENT_SECRET=${clientSecret}`
  updated = true
} else {
  // Buscar línea de GOOGLE_CLIENT_ID para insertar después
  let insertIndex = lines.findIndex(line => line.startsWith('GOOGLE_CLIENT_ID='))
  if (insertIndex >= 0) {
    lines.splice(insertIndex + 1, 0, `GOOGLE_CLIENT_SECRET=${clientSecret}`)
  } else {
    lines.push(`GOOGLE_CLIENT_SECRET=${clientSecret}`)
  }
  updated = true
}

// Escribir archivo actualizado
const newContent = lines.join('\n')
fs.writeFileSync(envPath, newContent, 'utf8')

console.log('✅ Archivo .env.local actualizado con las credenciales de Google\n')
console.log('📋 Próximos pasos:')
console.log('   1. Reinicia el servidor de desarrollo (Ctrl+C y luego npm run dev)')
console.log('   2. Visita http://localhost:3000/api/calendar/debug para verificar')
console.log('   3. Intenta conectar el calendario desde /nutricionista/citas\n')

