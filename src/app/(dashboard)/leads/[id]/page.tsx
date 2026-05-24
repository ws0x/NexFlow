import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { stripLeadByRole, canSendToSales, canEditSalesFields, canViewSalesFields, canViewMarketingFields } from '@/lib/permissions'
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

  const departments = await db.department.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
    select: { id: true, name: true },
  })

  const statusOptions = await db.dropdownOption.findMany({
    where: { category: 'REQUEST_STATUS', isActive: true },
    orderBy: { order: 'asc' },
    select: { value: true },
  })

  const user = { name: session.user.name ?? 'User', role }

  return (
    <div className="flex flex-col h-full">
      <Header title={lead.reqCode} user={user} />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <LeadDetail
          lead={stripped as any}
          role={role}
          canSendToSales={canSendToSales(role) && !lead.sentToSales}
          canEditSales={canEditSalesFields(role) && lead.sentToSales}
          showSalesFields={canViewSalesFields(role)}
          showMarketingFields={canViewMarketingFields(role)}
          statusOptions={statusOptions.map((s: any) => s.value)}
          departments={departments}
        />
      </div>
    </div>
  )
}
