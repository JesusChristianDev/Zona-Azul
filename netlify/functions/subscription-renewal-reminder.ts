import { Handler } from '@netlify/functions'

/**
 * Función programada para enviar recordatorios de renovación
 * Se ejecuta diariamente a las 08:00 UTC
 */
export const handler: Handler = async (event, context) => {
  const cronSecret = process.env.CRON_SECRET_TOKEN || 'default-secret-token'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.URL || 'http://localhost:3000'
  
  console.log(`[${new Date().toISOString()}] Iniciando envío de recordatorios de renovación...`)
  
  try {
    const response = await fetch(`${appUrl}/api/subscriptions/renewal-reminder`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        days_before: 7 // Recordar 7 días antes del vencimiento
      }),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      console.error('Error en la respuesta:', data)
      return {
        statusCode: response.status,
        body: JSON.stringify({ 
          error: 'Error enviando recordatorios',
          details: data 
        }),
      }
    }
    
    console.log('Recordatorios enviados exitosamente:', data)
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Recordatorios de renovación enviados correctamente',
        data 
      }),
    }
  } catch (error: any) {
    console.error('Error enviando recordatorios:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Error enviando recordatorios',
        message: error.message 
      }),
    }
  }
}

