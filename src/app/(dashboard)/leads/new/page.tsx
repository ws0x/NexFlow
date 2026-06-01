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

  const userBUIds = session.user.businessUnitIds

  const [businessUnits, allDropdowns, departments] = await Promise.all([
    db.businessUnit.findMany({
      where: { id: { in: userBUIds }, isActive: true },
      select: { id: true, name: true, prefix: true },
    }),
    // Fetch all active options for user's entities AND global options
    db.dropdownOption.findMany({
      where: {
        isActive: true,
        OR: [
          { entityScope: 'GLOBAL' },
          { entityScope: { in: userBUIds } },
        ],
      },
      orderBy: { order: 'asc' },
      select: { category: true, value: true, entityScope: true, businessUnitId: true },
    }),
    db.department.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: { id: true, name: true, businessUnitId: true },
    }),
  ])

  // Build per-entity dropdown map:
  // For each entity, if it has entity-specific options for a category → use those.
  // Otherwise fall back to GLOBAL options.
  type DropdownMap = Record<string, string[]>
  const globalDropdowns: DropdownMap = {}
  const entityDropdowns: Record<string, DropdownMap> = {}

  for (const opt of allDropdowns) {
    if (opt.entityScope === 'GLOBAL') {
      if (!globalDropdowns[opt.category]) globalDropdowns[opt.category] = []
      globalDropdowns[opt.category].push(opt.value)
    } else {
      const scope = opt.entityScope
      if (!entityDropdowns[scope]) entityDropdowns[scope] = {}
      if (!entityDropdowns[scope][opt.category]) entityDropdowns[scope][opt.category] = []
      entityDropdowns[scope][opt.category].push(opt.value)
    }
  }

  // Build resolved dropdowns per entity
  const dropdownsPerEntity: Record<string, DropdownMap> = {}
  for (const bu of businessUnits) {
    const entitySpecific = entityDropdowns[bu.id] ?? {}
    const categories = new Set([
      ...Object.keys(globalDropdowns),
      ...Object.keys(entitySpecific),
    ])
    dropdownsPerEntity[bu.id] = {}
    for (const cat of categories) {
      // If entity has specific values → use those, else global
      dropdownsPerEntity[bu.id][cat] = entitySpecific[cat]?.length
        ? entitySpecific[cat]
        : (globalDropdowns[cat] ?? [])
    }
  }

  const user = { name: session.user.name ?? 'User', role: session.user.role as Role }

  return (
    <div className="flex flex-col h-full">
      <Header title="New Lead" user={user} />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <NewLeadForm
          businessUnits={businessUnits}
          dropdownsPerEntity={dropdownsPerEntity}
          globalDropdowns={globalDropdowns}
          departments={departments}
        />
      </div>
    </div>
  )
}
