/**
 * Next.js 16 Proxy (middleware).
 *
 * Uses NextAuth(authConfig).auth — the v5-native way to read the session
 * in Edge.  The old `getToken` approach failed because NextAuth v5 JWTs
 * are *encrypted* (JWE) and require both `secret` AND `salt` (derived
 * from the cookie name) to decrypt.  `auth()` handles that automatically.
 *
 * `authConfig` has zero Node.js-only imports, so this stays Edge-safe.
 */
import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'

const { auth } = NextAuth(authConfig)

function getDefaultPath(role?: string): string {
  switch (role) {
    case 'SUPER_ADMIN': return '/admin'
    case 'MANAGER':     return '/analytics'
    case 'MARKETING':   return '/leads/new'
    default:            return '/leads'
  }
}

export default auth(function proxy(req) {
  const isPublic = req.nextUrl.pathname.startsWith('/login')

  // Not authenticated → go to login
  if (!req.auth && !isPublic) {
    return Response.redirect(new URL('/login', req.url))
  }

  // Authenticated + on login page → go to role home
  if (req.auth && isPublic) {
    const role = (req.auth.user as any)?.role as string | undefined
    return Response.redirect(new URL(getDefaultPath(role), req.url))
  }
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.json).*)'],
}
