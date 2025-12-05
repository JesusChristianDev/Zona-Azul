/**
 * Script para generar hash de contraseña con bcrypt
 * Uso: node scripts/generate-password-hash.js [password]
 * Por defecto genera hash para "password123"
 */

const bcrypt = require('bcryptjs')

const password = process.argv[2] || 'password123'

async function generateHash() {
  try {
    const hash = await bcrypt.hash(password, 10)
    console.log('\n✅ Hash generado:')
    console.log(hash)
    console.log(`\n📝 Contraseña: ${password}`)
    console.log('\n💡 Puedes usar este hash en el seed SQL o en la base de datos.\n')
  } catch (error) {
    console.error('❌ Error generando hash:', error)
    process.exit(1)
  }
}

generateHash()

