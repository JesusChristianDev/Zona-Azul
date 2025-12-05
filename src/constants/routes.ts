const PUBLIC_ROUTE_EXACT = ['/', '/login', '/activate'] as const
const PUBLIC_ROUTE_PREFIXES = ['/menu', '/booking'] as const

export type PublicRoute = typeof PUBLIC_ROUTE_EXACT[number]

export function isPublicRoute(pathname?: string | null): boolean {
  if (!pathname) return false

  if (PUBLIC_ROUTE_EXACT.includes(pathname as PublicRoute)) {
    return true
  }

  return PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

