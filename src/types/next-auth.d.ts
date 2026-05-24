import { Role } from '@/generated/prisma/client'
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
      businessUnitIds: string[]
      departmentIds: string[]
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: Role
    businessUnitIds: string[]
    departmentIds: string[]
  }
}
