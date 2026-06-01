import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { stripLeadByRole, canSendToSales, canEditSalesFields, canViewSalesFields, canViewMarketingFields, canEditMutualFields } from '@/lib/permissions'
import { Header } from '@/components/layout/header'
import { LeadDetail } from '@/components/leads/lead-detail'
import type { Role } from '@/generated/prisma/client'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const lead = await db.lead.findUnique({ where: { id }, select: { reqCode: true } })
  return { title: lead?.reqCode ?? 'Lead' }
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([auth(), params])
  if (!session?.user) redirect('/login')

  const role = session.user.role as Role

  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      businessUnit:   true,
      directedToDept: true,
      createdBy:      { select: { name: true, email: true } },
      history: {
        include: { changedBy: { select: { name: true, role: true } } },
        orderBy: { changedAt: 'desc' },
      },
    },
  })

  if (!lead) notFound()

  // Scope checks
  if (!session.user.businessUnitIds.includes(lead.businessUnitId) && role !== 'SUPER_ADMIN') notFound()
  if (role === 'SALES') {
    if (!lead.sentToSales) notFound()
    if (lead.directedToDeptId && !session.user.departmentIds.includes(lead.directedToDeptId)) notFound()
  }

  const stripped = stripLeadByRole(lead, role)

  const [departments, dropdownRows] = await Promise.all([
    db.department.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: { id: true, name: true },
    }),
    // Fetch entity-scoped + global options for the lead's entity
    db.dropdownOption.findMany({
      where: {
        isActive: true,
        category: { in: ['REQUEST_STATUS', 'LEAD_SOURCE', 'COMMUNICATION_CHANNEL'] },
        OR: [
          { entityScope: 'GLOBAL' },
          { entityScope: lead.businessUnitId },
        ],
      },
      orderBy: { order: 'asc' },
      select: { category: true, value: true, entityScope: true },
    }),
  ])

  // Prefer entity-specific values; fall back to global when no entity override exists
  const entitySpecific: Record<string, boolean> = {}
  for (const d of dropdownRows as any[]) {
    if (d.entityScope !== 'GLOBAL') entitySpecific[d.category] = true
  }

  const dropdownsByCategory = (dropdownRows as any[]).reduce<Record<string, string[]>>((acc, d) => {
    // Skip global if entity-specific exists for this category
    if (d.entityScope === 'GLOBAL' && entitySpecific[d.category]) return acc
    if (!acc[d.category]) acc[d.category] = []
    acc[d.category].push(d.value)
    return acc
  }, {})

  const user = { name: session.user.name ?? 'User', role }

  return (
    <div className="flex flex-col h-full">
      <Header title={lead.reqCode} user={user} />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <LeadDetail
          lead={stripped as any}
          role={role}
          canSendToSales={canSendToSales(role)}
          canEditSales={canEditSalesFields(role) && lead.sentToSales}
          canEditLead={canEditMutualFields(role)}
          showSalesFields={canViewSalesFields(role)}
          showMarketingFields={canViewMarketingFields(role)}
          statusOptions={dropdownsByCategory['REQUEST_STATUS'] ?? []}
          sourceOptions={dropdownsByCategory['LEAD_SOURCE'] ?? []}
          channelOptions={dropdownsByCategory['COMMUNICATION_CHANNEL'] ?? []}
          departments={departments}
        />
      </div>
    </div>
  )
}
