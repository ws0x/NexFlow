import type { NextAuthConfig } from 'next-auth'

/**
 * Edge-safe auth config — NO Node.js-only imports (no Prisma, no bcrypt).
 * Used by middleware for JWT verification only.
 * The full auth.ts adds the Credentials provider with DB access.
 */
export const authConfig: NextAuthConfig = {
  session:   { strategy: 'jwt' },
  pages:     { signIn: '/login' },
  trustHost: true,               // required for Vercel / reverse-proxy deployments
  providers: [],  // populated in auth.ts; empty here is fine for JWT verification
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id             = user.id ?? ''
        token.role           = (user as any).role
        token.businessUnitIds = (user as any).businessUnitIds
        token.departmentIds  = (user as any).departmentIds
      }
      return token
    },
    session({ session, token }) {
      if (token) {
        session.user.id             = token.id as string
        session.user.role           = token.role as any
        session.user.businessUnitIds = token.businessUnitIds as string[]
        session.user.departmentIds  = token.departmentIds as string[]
      }
      return session
    },
  },
}
