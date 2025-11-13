import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rutas públicas (accesibles sin autenticación)
const PUBLIC_ROUTES = ['/', '/login', '/booking', '/menu', '/activate', '/api/appointments', '/api/auth']

/**
 * Mapeo de roles a rutas permitidas
 * 
 * NOTA: Las rutas base incluyen automáticamente todas sus subrutas mediante `startsWith()`.
 * Por ejemplo, '/admin' permite acceso a:
 *   - /admin
 *   - /admin/menu
 *   - /admin/usuarios
 *   - /admin/pedidos
 * 
 * Subrutas existentes por rol:
 * - admin: /admin, /admin/menu, /admin/usuarios, /admin/pedidos, /admin/ajustes
 * - suscriptor: /suscriptor, /suscriptor/plan, /suscriptor/progreso, /suscriptor/pedidos, /suscriptor/ajustes
 * - nutricionista: /nutricionista, /nutricionista/clientes, /nutricionista/planes, /nutricionista/citas, /nutricionista/ajustes
 * - repartidor: /repartidor, /repartidor/pedidos, /repartidor/historial, /repartidor/ajustes
 */
const ROLE_ROUTES: Record<string, string[]> = {
  admin: ['/admin'],
  suscriptor: ['/suscriptor'],
  nutricionista: ['/nutricionista'],
  repartidor: ['/repartidor'],
  invitado: ['/invitado', '/booking', '/menu'],
}

// Rutas que requieren autenticación (cualquier rol autenticado)
// Incluye todas las subrutas mediante startsWith()
const AUTHENTICATED_ROUTES = ['/admin', '/suscriptor', '/nutricionista', '/repartidor', '/notificaciones']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir rutas públicas y API de autenticación
  if (
    PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/')) ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next()
  }

  // Permitir assets estáticos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/icon') ||
    pathname.startsWith('/manifest.json') ||
    pathname.startsWith('/sw.js')
  ) {
    return NextResponse.next()
  }

  // Obtener rol del cookie (más seguro que localStorage)
  const role = request.cookies.get('user_role')?.value
  const userId = request.cookies.get('user_id')?.value
  const sessionToken = request.cookies.get('session_token')?.value

  // Validar que existe sesión válida
  if (!sessionToken || !role || !userId) {
    // Si intenta acceder a ruta protegida, redirigir a login
    if (AUTHENTICATED_ROUTES.some((route) => pathname.startsWith(route))) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // Validar que el rol es válido
  const validRoles = ['admin', 'suscriptor', 'nutricionista', 'repartidor', 'invitado']
  if (!validRoles.includes(role)) {
    // Rol inválido, limpiar cookies y redirigir
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('user_role')
    response.cookies.delete('user_id')
    response.cookies.delete('user_name')
    response.cookies.delete('user_email')
    response.cookies.delete('session_token')
    return response
  }

  // Validar acceso por rol
  const allowedRoutes = ROLE_ROUTES[role] || []
  const hasAccess = allowedRoutes.some((route) => pathname.startsWith(route))

  if (!hasAccess && AUTHENTICATED_ROUTES.some((route) => pathname.startsWith(route))) {
    // No tiene acceso a esta ruta, redirigir según rol
    const defaultRoute = allowedRoutes[0] || '/login'
    const redirectUrl = new URL(defaultRoute, request.url)
    redirectUrl.searchParams.set('error', 'access_denied')
    return NextResponse.redirect(redirectUrl)
  }

  // Agregar headers de seguridad
  const response = NextResponse.next()
  response.headers.set('X-User-Role', role)
  response.headers.set('X-User-Id', userId || '')

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

