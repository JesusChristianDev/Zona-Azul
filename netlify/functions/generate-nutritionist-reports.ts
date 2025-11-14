import { Handler } from '@netlify/functions'

/**
 * Función programada para generar reportes automáticos de nutricionistas
 * Se ejecuta los lunes a las 00:00 UTC (reporte semanal)
 * y el primer día de cada mes a las 00:00 UTC (reporte mensual)
 */
export const handler: Handler = async (event, context) => {
  const cronSecret = process.env.CRON_SECRET_TOKEN || 'default-secret-token'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.URL || 'http://localhost:3000'
  
  // Determinar el tipo de reporte basado en la fecha
  const today = new Date()
  const isFirstDayOfMonth = today.getDate() === 1
  const reportType = isFirstDayOfMonth ? 'nutritionist_monthly' : 'nutritionist_weekly'
  
  console.log(`[${new Date().toISOString()}] Generando reporte ${reportType}...`)
  
  try {
    const response = await fetch(`${appUrl}/api/reports/nutritionist/generate-automatic`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        report_type: reportType
      }),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      console.error('Error en la respuesta:', data)
      return {
        statusCode: response.status,
        body: JSON.stringify({ 
          error: 'Error generando reporte',
          details: data 
        }),
      }
    }
    
    console.log(`Reporte ${reportType} generado exitosamente:`, data)
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: `Reporte ${reportType} generado correctamente`,
        data 
      }),
    }
  } catch (error: any) {
    console.error('Error generando reporte:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Error generando reporte',
        message: error.message 
      }),
    }
  }
}

