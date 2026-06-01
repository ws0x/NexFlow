import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { db } from '@/lib/db'
import { LeadsTable } from '@/components/leads/leads-table'
import { LeadsFilterBar } from '@/components/leads/leads-filter-bar'
import { Header } from '@/components/layout/header'
import { canCreateLead, stripLeadByRole } from '@/lib/permissions'
import { PlusCircle, Upload, Download } from 'lucide-react'
import Link from 'next/link'
import type { Role } from '@/generated/prisma/client'

export const metadata = { title: 'Leads' }

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?:          string
    buId?:       string
    status?:     string
    dateFrom?:   string
    dateTo?:     string
    source?:     string
    leadType?:   string
    sentToSales?: string
    page?:       string
  }>
}) {
  await connection()

  const session = await auth()
  if (!session?.user) redirect('/login')

  const role   = session.user.role as Role
  const params = await searchParams
  const page   = Math.max(1, Number(params.page ?? 1))
  const pageSize = 25

  // ── Where clause (role-scoped + filters) ───────────────────────────────────
  const where: any = {
    businessUnitId: { in: session.user.businessUnitIds },
  }

  // SALES: only see sent-to-sales leads.
  // If departments are assigned, also include leads with null directedToDeptId
  // (leads not routed to any specific department are visible to all dept-assigned sales).
  // SQL "IN" never matches NULL, so we must union with "IS NULL" explicitly.
  if (role === 'SALES') {
    where.sentToSales = true
    if (session.user.departmentIds.length > 0) {
      if (!where.AND) where.AND = []
      where.AND.push({
        OR: [
          { directedToDeptId: { in: session.user.departmentIds } },
          { directedToDeptId: null },
        ],
      })
    }
  }

  if (params.buId)   where.businessUnitId = params.buId
  if (params.status) where.requestStatus  = params.status

  if (params.q) {
    // Use AND to avoid overwriting any existing OR (e.g. dept filter above)
    if (!where.AND) where.AND = []
    where.AND.push({
      OR: [
        { reqCode:       { contains: params.q, mode: 'insensitive' } },
        { companyName:   { contains: params.q, mode: 'insensitive' } },
        { companyNameAr: { contains: params.q, mode: 'insensitive' } },
        { contactName:   { contains: params.q, mode: 'insensitive' } },
        { contactNumber: { contains: params.q, mode: 'insensitive' } },
        { contactEmail:  { contains: params.q, mode: 'insensitive' } },
      ],
    })
  }

  if (params.dateFrom || params.dateTo) {
    where.requestDate = {}
    if (params.dateFrom) where.requestDate.gte = new Date(params.dateFrom)
    if (params.dateTo) {
      const to = new Date(params.dateTo)
      to.setHours(23, 59, 59, 999)
      where.requestDate.lte = to
    }
  }

  if (params.source)   where.leadSource = params.source
  if (params.leadType) where.leadType   = params.leadType
  if (params.sentToSales === 'true' && role !== 'SALES') where.sentToSales = true

  // ── Base scope (for distinct lookups, ignoring active filters) ─────────────
  const scopeWhere = { businessUnitId: { in: session.user.businessUnitIds } }

  // ── Parallel queries ───────────────────────────────────────────────────────
  const [leads, total, businessUnits, statuses, sources, types] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: { requestDate: 'desc' },
      skip:    (page - 1) * pageSize,
      take:    pageSize,
      include: {
        businessUnit:   { select: { name: true, prefix: true } },
        directedToDept: { select: { name: true } },
      },
    }),
    db.lead.count({ where }),
    db.businessUnit.findMany({
      where:   { id: { in: session.user.businessUnitIds } },
      select:  { id: true, name: true, prefix: true },
    }),
    db.dropdownOption.findMany({
      where:   { category: 'REQUEST_STATUS', isActive: true },
      orderBy: { order: 'asc' },
      select:  { value: true },
    }),
    db.lead.findMany({
      where:    { ...scopeWhere, leadSource: { not: null } },
      select:   { leadSource: true },
      distinct: ['leadSource'],
      orderBy:  { leadSource: 'asc' },
    }),
    db.lead.findMany({
      where:    { ...scopeWhere, leadType: { not: null } },
      select:   { leadType: true },
      distinct: ['leadType'],
      orderBy:  { leadType: 'asc' },
    }),
  ])

  const strippedLeads = leads.map((l: any) => stripLeadByRole(l, role))

  const user = { name: session.user.name ?? 'User', role, businessUnitIds: session.user.businessUnitIds }

  // ── Export URL (same filters, no pagination) ───────────────────────────────
  const exportQS = new URLSearchParams()
  if (params.q)           exportQS.set('q',           params.q)
  if (params.buId)        exportQS.set('buId',        params.buId)
  if (params.status)      exportQS.set('status',      params.status)
  if (params.dateFrom)    exportQS.set('dateFrom',    params.dateFrom)
  if (params.dateTo)      exportQS.set('dateTo',      params.dateTo)
  if (params.source)      exportQS.set('source',      params.source)
  if (params.leadType)    exportQS.set('leadType',    params.leadType)
  if (params.sentToSales) exportQS.set('sentToSales', params.sentToSales)
  const exportUrl = `/api/leads/export?${exportQS.toString()}`

  const currentFilters = {
    q:           params.q,
    buId:        params.buId,
    status:      params.status,
    dateFrom:    params.dateFrom,
    dateTo:      params.dateTo,
    source:      params.source,
    leadType:    params.leadType,
    sentToSales: params.sentToSales,
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Leads" user={user} />

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--nf-text)' }}>
              {total.toLocaleString()} lead{total !== 1 ? 's' : ''}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--nf-muted)' }}>
              {role === 'SALES'
                ? 'Leads directed to your department'
                : 'All leads in your entities'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Export — visible to all roles, respects active filters */}
            <a href={exportUrl} className="btn-outline text-sm h-9 px-4">
              <Download className="w-4 h-4" />
              Export {total > 0 ? `(${total.toLocaleString()})` : ''}
            </a>

            {canCreateLead(role) && (
              <>
                <Link href="/leads/import" className="btn-outline text-sm h-9 px-4">
                  <Upload className="w-4 h-4" />
                  Import
                </Link>
                <Link href="/leads/new" className="btn-primary text-sm h-9 px-4">
                  <PlusCircle className="w-4 h-4" />
                  New Lead
                </Link>
              </>
            )}
          </div>
        </div>

        {/* ── Filter bar ── */}
        <LeadsFilterBar
          businessUnits={businessUnits}
          statusOptions={statuses.map((s: any) => s.value)}
          sourceOptions={sources.map((s: any) => s.leadSource).filter(Boolean)}
          typeOptions={types.map((t: any) => t.leadType).filter(Boolean)}
          currentFilters={currentFilters}
          role={role}
        />

        {/* ── Table + pagination ── */}
        <LeadsTable
          leads={strippedLeads as any}
          total={total}
          page={page}
          pageSize={pageSize}
          role={role}
        />
      </div>
    </div>
  )
}
