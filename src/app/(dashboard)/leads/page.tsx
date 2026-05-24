import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { LeadsTable } from '@/components/leads/leads-table'
import { Header } from '@/components/layout/header'
import { canCreateLead } from '@/lib/permissions'
import { stripLeadByRole } from '@/lib/permissions'
import { PlusCircle } from 'lucide-react'
import Link from 'next/link'
import type { Role } from '@/generated/prisma/client'

export const metadata = { title: 'Leads' }

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ buId?: string; status?: string; q?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const role = session.user.role as Role
  const params = await searchParams
  const page = Number(params.page ?? 1)
  const pageSize = 25

  const where: any = {
    businessUnitId: { in: session.user.businessUnitIds },
  }

  if (role === 'SALES') {
    where.directedToDeptId = { in: session.user.departmentIds }
    where.sentToSales = true
  }
  if (params.buId)   where.businessUnitId  = params.buId
  if (params.status) where.requestStatus   = params.status
  if (params.q)      where.OR = [
    { reqCode:     { contains: params.q, mode: 'insensitive' } },
    { companyName: { contains: params.q, mode: 'insensitive' } },
    { contactName: { contains: params.q, mode: 'insensitive' } },
  ]

  const [leads, total, businessUnits, statuses] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        businessUnit:   { select: { name: true, prefix: true } },
        directedToDept: { select: { name: true } },
      },
    }),
    db.lead.count({ where }),
    db.businessUnit.findMany({
      where: { id: { in: session.user.businessUnitIds } },
      select: { id: true, name: true, prefix: true },
    }),
    db.dropdownOption.findMany({
      where: { category: 'REQUEST_STATUS', isActive: true },
      orderBy: { order: 'asc' },
      select: { value: true },
    }),
  ])

  const strippedLeads = leads.map((l: any) => stripLeadByRole(l, role))

  const user = {
    name: session.user.name ?? 'User',
    role,
    businessUnitIds: session.user.businessUnitIds,
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Leads" user={user} />

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--nf-text)' }}>
              {total.toLocaleString()} lead{total !== 1 ? 's' : ''}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--nf-muted)' }}>
              {role === 'SALES' ? 'Leads directed to your department' : 'All leads in your business units'}
            </p>
          </div>

          {canCreateLead(role) && (
            <Link href="/leads/new" className="btn-primary text-sm h-9 px-4">
              <PlusCircle className="w-4 h-4" />
              New Lead
            </Link>
          )}
        </div>

        <LeadsTable
          leads={strippedLeads as any}
          total={total}
          page={page}
          pageSize={pageSize}
          businessUnits={businessUnits}
          statusOptions={statuses.map((s: any) => s.value)}
          role={role}
          currentFilters={{
            buId:   params.buId,
            status: params.status,
            q:      params.q,
          }}
        />
      </div>
    </div>
  )
}
