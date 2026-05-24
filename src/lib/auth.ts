import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { authConfig } from '@/lib/auth.config'
import * as z from 'zod'

const loginSchema = z.object({
  email:    z.email(),
  password: z.string().min(6),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
          include: {
            businessUnits: { include: { businessUnit: true } },
            departments:   { include: { department: true  } },
          },
        })

        if (!user || !user.isActive) return null

        const valid = await bcrypt.compare(parsed.data.password, user.password)
        if (!valid) return null

        return {
          id:              user.id,
          name:            user.name,
          email:           user.email,
          role:            user.role,
          businessUnitIds: user.businessUnits.map((ub: any) => ub.businessUnitId),
          departmentIds:   user.departments.map((ud: any) => ud.departmentId),
        }
      },
    }),
  ],
})
