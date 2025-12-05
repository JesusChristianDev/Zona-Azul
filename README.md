# Zona Azul — PWA de Bienestar Integral

Plataforma web progresiva (PWA) para gestión nutricional completa con Next.js 14, Tailwind CSS y Supabase. Sistema integral que conecta nutricionistas, clientes, administradores y repartidores en una sola plataforma.

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Revisar que no haya conflictos de merge
npm run check:conflicts
```

Visita [http://localhost:3000](http://localhost:3000)

## 📱 Características PWA

- ✅ Service Worker optimizado con estrategias de caché inteligentes
- ✅ Funciona offline con caché de recursos estáticos
- ✅ Notificaciones push
- ✅ Instalable en dispositivos móviles y desktop
- ✅ Atajos rápidos (shortcuts) en el menú de la app
- ✅ Optimizado para Core Web Vitals (LCP, CLS, FCP, TTI)

## 👥 Roles y Funcionalidades

### 👤 Administrador
- Gestión completa de usuarios (equipo y clientes)
- Administración de citas con filtros y búsqueda avanzada
- Gestión de menú y comidas
- Visualización de pedidos y estadísticas
- Creación de usuarios desde citas sin usuario asociado

### 🥗 Nutricionista
- Gestión de citas con integración de Google Calendar
- Administración de clientes con búsqueda y filtros
- Creación y gestión de planes nutricionales
- Opciones de comidas sugeridas
- Creación de usuarios desde citas completadas

### 🛒 Suscriptor/Cliente
- Visualización de plan nutricional asignado
- Seguimiento de progreso
- Gestión de pedidos
- Sistema de mensajería integrado
- Reserva de citas con calendario mensual

### 🚚 Repartidor
- Gestión de pedidos asignados
- Historial de entregas
- Actualización de estado de pedidos

### 👋 Invitado
- Reserva de citas sin registro previo
- Visualización de menú público
- Información de contacto

## 🏗️ Arquitectura

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API Routes
- **Base de datos**: Supabase (PostgreSQL)
- **Autenticación**: Cookies basadas en sesión con control de roles
- **PWA**: Service Worker con caché optimizado
- **Calendario**: Integración con Google Calendar API
- **Notificaciones**: Web Push API

## 📂 Estructura del Proyecto

```
src/
├── app/                    # Rutas y páginas (App Router)
│   ├── admin/             # Dashboard y páginas de administrador
│   ├── nutricionista/     # Dashboard y páginas de nutricionista
│   ├── suscriptor/        # Dashboard y páginas de cliente
│   ├── repartidor/        # Dashboard y páginas de repartidor
│   ├── booking/           # Sistema de reserva de citas
│   ├── menu/              # Menú público
│   └── api/               # API Routes
├── components/            # Componentes reutilizables
│   ├── ui/                # Componentes de UI (Modal, Header, etc.)
│   ├── dashboard/         # Componentes de dashboards
│   ├── public/            # Componentes públicos (Booking, Menu)
│   └── messaging/         # Sistema de mensajería
├── lib/                   # Utilidades y funciones
│   ├── api.ts             # Cliente API
│   ├── db.ts              # Funciones de base de datos
│   ├── dateFormatters.ts  # Utilidades de formateo de fechas
│   └── supabase.ts        # Cliente Supabase
└── hooks/                 # Custom hooks
    ├── useAuth.ts         # Hook de autenticación
    ├── useApi.ts          # Hooks para API
    └── useNotifications.ts # Hook de notificaciones

supabase/                  # Scripts SQL y esquema
scripts/                   # Scripts de utilidad
public/                    # Assets estáticos y manifest PWA
```

## 🔧 Configuración

### Variables de Entorno

Crea un archivo `.env.local` con las siguientes variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Google Calendar (Opcional)
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/callback
```

### Base de Datos

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta el script SQL en `supabase/schema.sql` en tu proyecto
3. Configura las políticas RLS según tus necesidades

### Google Calendar (Opcional)

Para habilitar la integración con Google Calendar:

1. Crea un proyecto en [Google Cloud Console](https://console.cloud.google.com)
2. Habilita la API de Google Calendar
3. Crea credenciales OAuth 2.0
4. Configura las variables de entorno correspondientes

## 📜 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Inicia servidor de desarrollo

# Producción
npm run build            # Construye la aplicación
npm run start            # Inicia servidor de producción

# Utilidades
npm run lint             # Ejecuta el linter
npm run verify-supabase  # Verifica conexión con Supabase
npm run verify-deps      # Verifica dependencias instaladas
npm run migrate-mock     # Migra datos mock a Supabase
```

## 📈 Escalabilidad

- Reutiliza el cliente de Supabase para minimizar conexiones WebSocket y habilitar canales en tiempo real (`src/lib/supabase.ts`, `src/lib/realtime.ts`).
- Activa PgBouncer en Supabase (modo `transaction`) y añade índices en columnas usadas para filtros/ordenamiento.
- Añade `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` en API públicas y protege login/pedidos con rate limiting distribuido (p.ej. Upstash Redis).
- Usa caché de datos en cliente (SWR/React Query) y prefetch selectivo con `next/link` para reducir solicitudes repetidas.
- Versiona el service worker/manifest para invalidar caché en despliegues y servir `_next/static` desde CDN/edge con autoescalado.

## 🎨 Características Técnicas

### Rendimiento
- Optimización de Core Web Vitals
- Lazy loading de componentes
- Code splitting automático
- Caché inteligente de recursos
- Formateo consistente de fechas en toda la aplicación

### Seguridad
- Autenticación basada en cookies
- Control de acceso basado en roles (RBAC)
- Validación de datos en servidor
- Protección CSRF
- Políticas de seguridad de contenido (CSP)

### UX/UI
- Diseño responsive 100%
- Interfaz moderna y profesional
- Sistema de búsqueda y filtrado avanzado
- Modales informativos sin acciones (solo visualización)
- Formateo profesional de fechas y citas
- Integración fluida con calendarios web

## 📝 Notas Importantes

- La aplicación está completamente migrada a Supabase (sin localStorage)
- El service worker usa estrategias de caché optimizadas para mejor rendimiento
- Las API routes están protegidas con control de acceso basado en roles
- El sistema de citas está sincronizado con Google Calendar (opcional)
- Los datos están normalizados y sincronizados entre todos los roles
- El formateo de fechas es consistente en toda la aplicación

## 🛠️ Tecnologías

- **Next.js 14** - Framework React con App Router
- **React 18** - Biblioteca UI
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Framework CSS utility-first
- **Supabase** - Backend as a Service (PostgreSQL)
- **Google Calendar API** - Integración de calendario
- **Web Push API** - Notificaciones push

## 📄 Licencia

Este proyecto es privado y de uso interno.
