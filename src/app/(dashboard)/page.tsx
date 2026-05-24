import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDefaultPath } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

export default async function RootDashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  redirect(getDefaultPath(session.user.role as Role))
}
