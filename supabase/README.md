# Configuración de Supabase para Zona Azul

Este directorio contiene el esquema de base de datos y documentación para Supabase.

## Pasos para configurar Supabase

### 1. Crear proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto
4. Espera a que se complete la configuración (puede tardar unos minutos)

### 2. Obtener las credenciales

1. En tu proyecto de Supabase, ve a **Settings** > **API**
2. Copia los siguientes valores:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (opcional, solo para operaciones administrativas)

### 3. Configurar variables de entorno

1. Copia `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edita `.env` y agrega tus credenciales de Supabase:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
   ```

### 4. Ejecutar el esquema SQL

1. En tu proyecto de Supabase, ve a **SQL Editor**
2. Abre el archivo `supabase/schema.sql`
3. Copia todo el contenido
4. Pégalo en el SQL Editor de Supabase
5. Ejecuta el script (botón "Run" o Ctrl+Enter)

Esto creará todas las tablas, índices, triggers y políticas de seguridad necesarias.

### 5. Verificar la conexión

Una vez configurado, puedes verificar que la conexión funciona ejecutando:

```typescript
import { checkSupabaseConnection } from '@/lib/db'

const isConnected = await checkSupabaseConnection()
console.log('Supabase conectado:', isConnected)
```

## Estructura de la base de datos

### Tablas principales

- **users**: Usuarios del sistema (admin, suscriptor, nutricionista, repartidor)
- **profiles**: Perfiles extendidos de usuarios
- **appointments**: Citas con nutricionistas
- **orders**: Pedidos de comida
- **order_items**: Items de cada pedido
- **meals**: Comidas disponibles en el menú
- **meal_plans**: Planes nutricionales
- **meal_plan_days**: Días de cada plan
- **meal_plan_day_meals**: Comidas asignadas a cada día
- **progress**: Registro de progreso diario de usuarios
- **messages**: Mensajes entre usuarios
- **plan_templates**: Plantillas de planes para nutricionistas

## Row Level Security (RLS)

El esquema incluye políticas básicas de Row Level Security. Ajusta estas políticas según tus necesidades de seguridad en el SQL Editor de Supabase.

## Migración de datos mock

Para migrar los datos mock existentes a Supabase, puedes usar las funciones en `src/lib/db.ts` o crear scripts de migración personalizados.

## Notas importantes

- **Nunca** expongas `SUPABASE_SERVICE_ROLE_KEY` en el código del cliente
- Las políticas RLS están habilitadas por defecto - ajusta según necesites
- El esquema usa UUIDs para los IDs de las tablas
- Los timestamps se actualizan automáticamente mediante triggers

