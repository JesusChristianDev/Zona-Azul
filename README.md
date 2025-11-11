# Zona Azul — PWA de Bienestar Integral

Plataforma web progresiva (PWA) para gestión nutricional con Next.js 14, Tailwind CSS y Supabase.

## 🚀 Inicio Rápido

```bash
npm install
npm run dev
```

Visita [http://localhost:3000](http://localhost:3000)

## 📱 Características PWA

- ✅ Service Worker optimizado con estrategias de caché inteligentes
- ✅ Funciona offline con caché de recursos estáticos
- ✅ Notificaciones push
- ✅ Instalable en dispositivos móviles y desktop
- ✅ Atajos rápidos (shortcuts) en el menú de la app

## 🏗️ Arquitectura

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Base de datos**: Supabase (PostgreSQL)
- **Autenticación**: Cookies basadas en sesión
- **PWA**: Service Worker con caché optimizado

## 📂 Estructura Principal

- `/src/app`: Rutas y páginas de la aplicación
- `/src/components`: Componentes reutilizables
- `/src/lib`: Utilidades y funciones de base de datos
- `/public`: Assets estáticos y manifest PWA
- `/supabase`: Scripts SQL y esquema de base de datos

## 🔧 Configuración

1. Configura las variables de entorno en `.env.local`
2. Ejecuta el script SQL en `supabase/schema.sql` en tu proyecto Supabase
3. Configura Google Calendar OAuth (opcional) para citas

## 📝 Notas

- La aplicación está completamente migrada a Supabase (sin localStorage)
- El service worker usa estrategias de caché optimizadas para mejor rendimiento
- Las API routes están protegidas con control de acceso basado en roles