# Netlify Functions - Cron Jobs

Este directorio contiene las funciones programadas (cron jobs) para automatizar tareas en la aplicación.

## Funciones Disponibles

### 1. `generate-weekly-menus.ts`
- **Propósito**: Genera menús semanales para todos los usuarios con suscripciones activas
- **Frecuencia recomendada**: Cada sábado a las 00:00 UTC
- **Endpoint**: `/api/weekly-menus/generate`

### 2. `subscription-renewal-reminder.ts`
- **Propósito**: Envía recordatorios de renovación a usuarios con suscripciones próximas a vencer
- **Frecuencia recomendada**: Diariamente a las 08:00 UTC
- **Endpoint**: `/api/subscriptions/renewal-reminder`

### 3. `generate-nutritionist-reports.ts`
- **Propósito**: Genera reportes automáticos de nutricionistas (semanal y mensual)
- **Frecuencia recomendada**: Cada lunes a las 00:00 UTC
- **Endpoint**: `/api/reports/nutritionist/generate-automatic`
- **Nota**: Detecta automáticamente si es día 1 del mes para generar reporte mensual

### 4. `generate-delivery-reports.ts`
- **Propósito**: Genera reportes de satisfacción de entrega (semanal y mensual)
- **Frecuencia recomendada**: Cada lunes a las 01:00 UTC
- **Endpoint**: `/api/reports/delivery-satisfaction/generate`
- **Nota**: Detecta automáticamente si es día 1 del mes para generar reporte mensual

## Configuración en Netlify

### Opción A: Netlify Dashboard (Recomendado)

1. Ve a tu sitio en [Netlify Dashboard](https://app.netlify.com)
2. Navega a **Functions** → **Scheduled Functions**
3. Para cada función:
   - Haz clic en **Add scheduled function**
   - Selecciona la función del dropdown
   - Configura el schedule (formato cron)
   - Guarda los cambios

### Opción B: Servicio Externo

Si prefieres usar un servicio externo como [cron-job.org](https://cron-job.org) o [EasyCron](https://www.easycron.com):

1. Crea una tarea programada que llame directamente a los endpoints de Next.js
2. URL: `https://tu-dominio.com/api/[endpoint]`
3. Método: POST
4. Headers: `Authorization: Bearer {CRON_SECRET_TOKEN}`

## Variables de Entorno Requeridas

Todas las funciones requieren estas variables de entorno en Netlify:

- `CRON_SECRET_TOKEN` - Token secreto para autenticación
- `NEXT_PUBLIC_APP_URL` - URL de tu aplicación (o usa `process.env.URL` en producción)
- `NEXT_PUBLIC_SUPABASE_URL` - URL de Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Clave anónima de Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Clave de servicio de Supabase

## Testing Local

Usa el script de testing incluido:

```bash
node scripts/test-cron-jobs.js [nombre-funcion]
```

Ejemplo:
```bash
node scripts/test-cron-jobs.js weekly-menus
```

## Formato de Schedule (Cron)

Ejemplos de schedules comunes:

- `0 0 * * 6` - Cada sábado a las 00:00
- `0 8 * * *` - Diariamente a las 08:00
- `0 0 * * 1` - Cada lunes a las 00:00
- `0 0 1 * *` - Primer día de cada mes a las 00:00

Formato: `minuto hora día mes día-semana`

## Monitoreo

Revisa los logs en Netlify Dashboard → Functions → Function logs para monitorear las ejecuciones.

