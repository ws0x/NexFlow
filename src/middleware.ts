import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { getDefaultPath } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

const PUBLIC_PATHS = ['/login']

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isPublic = PUBLIC_PATHS.some((p) => nextUrl.pathname.startsWith(p))

  // Not authenticated → redirect to login
  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  // Authenticated hitting login → redirect to role home
  if (session && isPublic) {
    const defaultPath = getDefaultPath(session.user.role as Role)
    return NextResponse.redirect(new URL(defaultPath, nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.json).*)'],
}
