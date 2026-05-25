import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { canCreateLead } from '@/lib/permissions'
import { Header } from '@/components/layout/header'
import { ImportWizard } from '@/components/leads/import-wizard'
import type { Role } from '@/generated/prisma/client'

export default async function ImportPage() {
  await connection()

  const session = await auth()
  if (!session?.user) redirect('/login')

  const role = session.user.role as Role
  if (!canCreateLead(role)) redirect('/leads')

  const businessUnits = await db.businessUnit.findMany({
    where:
      role === 'SUPER_ADMIN'
        ? undefined
        : { users: { some: { userId: session.user.id } } },
    orderBy: { prefix: 'asc' },
    select: { id: true, name: true, prefix: true },
  })

  const user = { name: session.user.name ?? 'User', role }

  return (
    <div className="flex flex-col h-full">
      <Header title="Import Leads" user={user} />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <ImportWizard businessUnits={businessUnits} />
      </div>
    </div>
  )
}
