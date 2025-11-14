import { Handler } from '@netlify/functions'

/**
 * Función programada para generar menús semanales
 * Se ejecuta cada sábado a las 00:00 UTC
 */
export const handler: Handler = async (event, context) => {
  const cronSecret = process.env.CRON_SECRET_TOKEN || 'default-secret-token'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.URL || 'http://localhost:3000'
  
  console.log(`[${new Date().toISOString()}] Iniciando generación de menús semanales...`)
  
  try {
    const response = await fetch(`${appUrl}/api/weekly-menus/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      console.error('Error en la respuesta:', data)
      return {
        statusCode: response.status,
        body: JSON.stringify({ 
          error: 'Error generando menús',
          details: data 
        }),
      }
    }
    
    console.log('Menús generados exitosamente:', data)
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Menús semanales generados correctamente',
        data 
      }),
    }
  } catch (error: any) {
    console.error('Error generando menús:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Error generando menús',
        message: error.message 
      }),
    }
  }
}

