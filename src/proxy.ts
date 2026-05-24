/**
 * Next.js 16 Proxy (replaces middleware).
 * Uses next-auth/jwt getToken — fully Edge-safe, zero Node.js imports.
 */
import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login']

function getDefaultPath(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN': return '/admin'
    case 'MANAGER':     return '/analytics'
    case 'MARKETING':   return '/leads/new'
    default:            return '/leads'
  }
}

export default async function proxy(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  })

  const isPublic = PUBLIC_PATHS.some((p) => req.nextUrl.pathname.startsWith(p))

  // Not authenticated → redirect to login
  if (!token && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Authenticated → redirect away from login to role home
  if (token && isPublic) {
    const path = getDefaultPath(token.role as string)
    return NextResponse.redirect(new URL(path, req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.json).*)'],
}
