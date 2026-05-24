import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { canCreateLead } from '@/lib/permissions'
import { NewLeadForm } from '@/components/leads/new-lead-form'
import { Header } from '@/components/layout/header'
import type { Role } from '@/generated/prisma/client'

export const metadata = { title: 'New Lead' }

export default async function NewLeadPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canCreateLead(session.user.role as Role)) redirect('/leads')

  const [businessUnits, dropdowns, departments] = await Promise.all([
    db.businessUnit.findMany({
      where: { id: { in: session.user.businessUnitIds }, isActive: true },
      select: { id: true, name: true, prefix: true },
    }),
    db.dropdownOption.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    }),
    db.department.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  const grouped = dropdowns.reduce<Record<string, string[]>>((acc: Record<string, string[]>, d: any) => {
    if (!acc[d.category]) acc[d.category] = []
    acc[d.category].push(d.value)
    return acc
  }, {})

  const user = { name: session.user.name ?? 'User', role: session.user.role as Role }

  return (
    <div className="flex flex-col h-full">
      <Header title="New Lead" user={user} />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <NewLeadForm
          businessUnits={businessUnits}
          dropdowns={grouped}
          departments={departments}
        />
      </div>
    </div>
  )
}
