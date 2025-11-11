import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Endpoint de diagnóstico para verificar configuración
export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const nodeEnv = process.env.NODE_ENV

  // Verificar si las credenciales están configuradas
  const hasClientId = !!clientId && clientId !== 'tu_client_id_aqui'
  const hasClientSecret = !!clientSecret && clientSecret !== 'tu_client_secret_aqui'
  const isConfigured = hasClientId && hasClientSecret

  return NextResponse.json({
    configured: isConfigured,
    checks: {
      hasClientId,
      hasClientSecret,
      clientIdLength: clientId?.length || 0,
      clientSecretLength: clientSecret?.length || 0,
      clientIdStartsWith: clientId?.substring(0, 20) || 'not set',
      clientSecretStartsWith: clientSecret?.substring(0, 10) || 'not set',
    },
    environment: {
      nodeEnv,
      appUrl,
      redirectUri: redirectUri || 'auto-detected',
    },
    message: isConfigured
      ? '✅ Credenciales configuradas correctamente'
      : '❌ Credenciales no configuradas o tienen valores placeholder',
    hint: !isConfigured
      ? 'Asegúrate de reemplazar "tu_client_id_aqui" y "tu_client_secret_aqui" con valores reales de Google Cloud Console'
      : 'Las credenciales parecen estar configuradas. Si aún hay errores, verifica que sean válidas en Google Cloud Console.',
  })
}

