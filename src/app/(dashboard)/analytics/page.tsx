import { connection } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { canViewAnalytics } from '@/lib/permissions'
import { Role } from '@/generated/prisma/client'
import {
  subDays,
  subMonths,
  subWeeks,
  startOfDay,
  startOfWeek,
  format,
  differenceInMonths,
} from 'date-fns'
import { BarChart2, CalendarDays } from 'lucide-react'

import { FilterBar }      from '@/components/analytics/filter-bar'
import { KPIStrip }       from '@/components/analytics/kpi-strip'
import type { KPIData }   from '@/components/analytics/kpi-strip'
import { LeadsTimeline }  from '@/components/analytics/leads-timeline'
import { PipelineBars }   from '@/components/analytics/pipeline-bars'
import { EntityDonut }    from '@/components/analytics/entity-donut'
import { SourcesChart }   from '@/components/analytics/sources-chart'
import { StatusChart }    from '@/components/analytics/status-chart'
import { SectorChart }    from '@/components/analytics/sector-chart'

// ─── Types ────────────────────────────────────────────────────────────────────

type RawLead = {
  id:             string
  reqCode:        string
  leadStatus:     string
  requestDate:    Date
  companyName:    string
  companySector:  string | null
  leadSource:     string | null
  requestStatus:  string
  businessUnitId: string
  businessUnit: { name: string; prefix: string }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_RANGES = ['7d', '30d', '3m', '1y', 'all'] as const
type Range = (typeof VALID_RANGES)[number]

const RANGE_LABEL: Record<Range, string> = {
  '7d':  'Last 7 days',
  '30d': 'Last 30 days',
  '3m':  'Last 3 months',
  '1y':  'Last 12 months',
  'all': 'All time',
}

function getRangeDates(
  range: Range,
  now: Date,
): { from: Date | null; prevFrom: Date | null; prevTo: Date | null } {
  const today = startOfDay(now)
  switch (range) {
    case '7d': {
      const from = subDays(today, 6)
      return { from, prevFrom: subDays(from, 7), prevTo: from }
    }
    case '30d': {
      const from = subDays(today, 29)
      return { from, prevFrom: subDays(from, 30), prevTo: from }
    }
    case '3m': {
      const from = subMonths(now, 3)
      return { from, prevFrom: subMonths(from, 3), prevTo: from }
    }
    case '1y': {
      const from = subMonths(now, 12)
      return { from, prevFrom: subMonths(from, 12), prevTo: from }
    }
    default:
      return { from: null, prevFrom: null, prevTo: null }
  }
}

function buildTimeline(
  leads: Pick<RawLead, 'requestDate'>[],
  range: Range,
  now: Date,
): { label: string; count: number }[] {
  if (range === '7d') {
    const map: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) map[format(subDays(now, i), 'EEE d')] = 0
    for (const l of leads) {
      const k = format(l.requestDate, 'EEE d')
      if (k in map) map[k]++
    }
    return Object.entries(map).map(([label, count]) => ({ label, count }))
  }

  if (range === '30d') {
    const map: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) map[format(subDays(now, i), 'd MMM')] = 0
    for (const l of leads) {
      const k = format(l.requestDate, 'd MMM')
      if (k in map) map[k]++
    }
    return Object.entries(map).map(([label, count]) => ({ label, count }))
  }

  if (range === '3m') {
    const map: Record<string, number> = {}
    for (let i = 12; i >= 0; i--) {
      const d = subWeeks(now, i)
      map[format(startOfWeek(d, { weekStartsOn: 1 }), 'd MMM')] = 0
    }
    for (const l of leads) {
      const k = format(startOfWeek(l.requestDate, { weekStartsOn: 1 }), 'd MMM')
      if (k in map) map[k]++
    }
    return Object.entries(map).map(([label, count]) => ({ label, count }))
  }

  // 1y or all → monthly buckets
  const map: Record<string, number> = {}
  if (range === '1y') {
    for (let i = 11; i >= 0; i--) map[format(subMonths(now, i), 'MMM yy')] = 0
  } else if (leads.length > 0) {
    // 'all': span from oldest lead to now
    const oldest  = leads[leads.length - 1].requestDate
    const nMonths = Math.min(differenceInMonths(now, oldest) + 1, 36)
    for (let i = nMonths - 1; i >= 0; i--) map[format(subMonths(now, i), 'MMM yy')] = 0
  } else {
    return []
  }

  for (const l of leads) {
    const k = format(l.requestDate, 'MMM yy')
    if (k in map) map[k]++
  }
  return Object.entries(map).map(([label, count]) => ({ label, count }))
}

function topValues(values: (string | null)[], top = 8): { label: string; count: number }[] {
  const counts: Record<string, number> = {}
  for (const v of values) {
    if (v) counts[v] = (counts[v] ?? 0) + 1
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, top)
    .map(([label, count]) => ({ label, count }))
}

// ─── Status badge (server-rendered) ──────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; fg: string; label: string }> = {
    DRAFT:         { bg: '#64748B18', fg: '#64748B', label: 'Draft'       },
    SUBMITTED:     { bg: '#3B82F618', fg: '#3B82F6', label: 'Submitted'   },
    SENT_TO_SALES: { bg: '#F59E0B18', fg: '#F59E0B', label: 'With Sales'  },
    COMPLETED:     { bg: '#22C55E18', fg: '#22C55E', label: 'Completed'   },
  }
  const s = styles[status] ?? { bg: '#64748B18', fg: '#94A3B8', label: status }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; bu?: string }>
}) {
  await connection()

  const session = await auth()
  if (!session?.user) redirect('/login')

  const role = session.user.role as Role
  if (!canViewAnalytics(role)) redirect('/leads')

  // ── Parse search params ────────────────────────────────────────────────────
  const { range: rawRange, bu: rawBU } = await searchParams
  const range: Range =
    rawRange && (VALID_RANGES as readonly string[]).includes(rawRange)
      ? (rawRange as Range)
      : '1y'

  const now          = new Date()
  const isSuperAdmin = role === Role.SUPER_ADMIN

  // ── Fetch business units scoped to user ────────────────────────────────────
  const allBUs = await db.businessUnit.findMany({
    where: isSuperAdmin
      ? undefined
      : { users: { some: { userId: session.user.id } } },
    orderBy: { prefix: 'asc' },
    select: { id: true, name: true, prefix: true },
  })

  const buIds  = allBUs.map((b) => b.id)
  const buId   = rawBU && rawBU !== 'all' && buIds.includes(rawBU) ? rawBU : 'all'

  // ── Date range ─────────────────────────────────────────────────────────────
  const { from, prevFrom, prevTo } = getRangeDates(range, now)

  // Fetch enough history to cover both current + previous period
  const fetchFrom = prevFrom ?? from

  // ── Fetch leads (one query, both periods) ──────────────────────────────────
  const buWhere =
    buId !== 'all'
      ? { businessUnitId: buId }
      : isSuperAdmin
        ? {}
        : { businessUnitId: { in: buIds } }

  const dateWhere = fetchFrom ? { requestDate: { gte: fetchFrom } } : {}

  const [rawLeads, timelineLeads] = await Promise.all([
    db.lead.findMany({
      where:   { ...buWhere, ...dateWhere },
      select:  {
        id:             true,
        reqCode:        true,
        leadStatus:     true,
        requestDate:    true,
        companyName:    true,
        companySector:  true,
        leadSource:     true,
        requestStatus:  true,
        businessUnitId: true,
        businessUnit:   { select: { name: true, prefix: true } },
      },
      orderBy: { requestDate: 'desc' },
    }),
    // Separate lean query for the timeline chart — no date filter so all
    // ranges (7D → All) are available independently of the dashboard filter.
    db.lead.findMany({
      where:   buWhere,
      select:  { requestDate: true },
      orderBy: { requestDate: 'desc' },
    }),
  ])

  // ── Split current vs previous period ──────────────────────────────────────
  const fromDate     = from
  const prevFromDate = prevFrom
  const prevToDate   = prevTo

  const currentLeads = fromDate
    ? rawLeads.filter((l) => l.requestDate >= fromDate)
    : rawLeads

  const prevLeads =
    prevFromDate && prevToDate
      ? rawLeads.filter(
          (l) => l.requestDate >= prevFromDate && l.requestDate < prevToDate,
        )
      : []

  // ── KPI metrics ────────────────────────────────────────────────────────────
  const totalLeads = currentLeads.length
  const inPipeline = currentLeads.filter(
    (l) => l.leadStatus === 'SUBMITTED' || l.leadStatus === 'SENT_TO_SALES',
  ).length
  const completed  = currentLeads.filter((l) => l.leadStatus === 'COMPLETED').length
  // Conversion = leads that actually turned into an order (not just workflow-closed)
  const converted  = currentLeads.filter((l) => l.requestStatus === 'Turned Into Order').length
  const convRate   = totalLeads > 0 ? (converted / totalLeads) * 100 : 0

  const prevTotal    = prevLeads.length
  const prevPipeline = prevLeads.filter(
    (l) => l.leadStatus === 'SUBMITTED' || l.leadStatus === 'SENT_TO_SALES',
  ).length
  const prevCompleted  = prevLeads.filter((l) => l.leadStatus === 'COMPLETED').length
  const prevConverted  = prevLeads.filter((l) => l.requestStatus === 'Turned Into Order').length
  const prevConvRate   = prevTotal > 0 ? (prevConverted / prevTotal) * 100 : 0

  const kpiData: KPIData = {
    totalLeads,
    inPipeline,
    completed,
    converted,
    conversionRate:     convRate,
    prevTotalLeads:     prevTotal,
    prevInPipeline:     prevPipeline,
    prevCompleted,
    prevConverted,
    prevConversionRate: prevConvRate,
    hasPrev:            range !== 'all',
  }

  // ── Chart data ─────────────────────────────────────────────────────────────
  // Pre-compute all timeframe buckets for the timeline chart so it can switch
  // ranges locally without triggering a full page navigation.
  const allTimelineData = Object.fromEntries(
    VALID_RANGES.map((r) => [r, buildTimeline(timelineLeads, r, now)]),
  )

  const pipelineData = [
    { label: 'Draft',     count: currentLeads.filter((l) => l.leadStatus === 'DRAFT').length,         color: '#64748B' },
    { label: 'Submitted', count: currentLeads.filter((l) => l.leadStatus === 'SUBMITTED').length,     color: '#3B82F6' },
    { label: 'W/ Sales',  count: currentLeads.filter((l) => l.leadStatus === 'SENT_TO_SALES').length, color: '#F59E0B' },
    { label: 'Completed', count: currentLeads.filter((l) => l.leadStatus === 'COMPLETED').length,     color: '#22C55E' },
  ]

  // Entity breakdown
  const buMap = new Map<string, { name: string; prefix: string; count: number }>()
  for (const l of currentLeads) {
    const entry = buMap.get(l.businessUnitId)
    if (entry) entry.count++
    else buMap.set(l.businessUnitId, { ...l.businessUnit, count: 1 })
  }
  const buData = Array.from(buMap.values()).sort((a, b) => b.count - a.count)

  const sourcesData = topValues(currentLeads.map((l) => l.leadSource), 8)
  const statusData  = topValues(currentLeads.map((l) => l.requestStatus), 7)
  const sectorData  = topValues(currentLeads.map((l) => l.companySector), 10)

  // ── Recent leads ──────────────────────────────────────────────────────────
  const recentLeads = rawLeads.slice(0, 10).map((l) => ({
    id:           l.id,
    reqCode:      l.reqCode,
    companyName:  l.companyName,
    leadStatus:   l.leadStatus,
    requestStatus: l.requestStatus,
    businessUnit: l.businessUnit.name,
    requestDate:  format(l.requestDate, 'dd MMM yyyy'),
    leadSource:   l.leadSource,
  }))

  // ── Render ────────────────────────────────────────────────────────────────
  const activeBULabel =
    buId !== 'all' ? allBUs.find((b) => b.id === buId)?.name : undefined

  return (
    <div className="p-6 space-y-6" style={{ background: 'var(--nf-bg)', minHeight: '100vh' }}>

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 className="w-5 h-5" style={{ color: 'var(--nf-accent)' }} />
            <h1 className="text-xl font-bold" style={{ color: 'var(--nf-text)' }}>
              Analytics
            </h1>
          </div>
          <p className="text-sm flex items-center gap-1.5" style={{ color: 'var(--nf-muted)' }}>
            <CalendarDays className="w-3.5 h-3.5" />
            {RANGE_LABEL[range]}
            {activeBULabel && (
              <>
                <span style={{ color: 'var(--nf-border-2)' }}>·</span>
                <span>{activeBULabel}</span>
              </>
            )}
            <span style={{ color: 'var(--nf-border-2)' }}>·</span>
            <span>{totalLeads.toLocaleString()} leads found</span>
          </p>
        </div>

        <FilterBar
          currentRange={range}
          currentBU={buId}
          businessUnits={allBUs}
        />
      </div>

      {/* ── KPI strip ─────────────────────────────────────────────────────── */}
      <KPIStrip data={kpiData} />

      {/* ── Primary charts: timeline + pipeline ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <LeadsTimeline allData={allTimelineData} />
        </div>
        <PipelineBars data={pipelineData} />
      </div>

      {/* ── Secondary charts: Entity, sources, status ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EntityDonut data={buData}    />
        <SourcesChart data={sourcesData} />
        <StatusChart  data={statusData}  />
      </div>

      {/* ── Sector chart (full-width) ─────────────────────────────────────── */}
      <SectorChart data={sectorData} />

      {/* ── Recent leads table ────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--nf-muted)' }}
          >
            Recent Leads
          </h3>
          <span className="text-xs" style={{ color: 'var(--nf-subtle)' }}>
            showing last {recentLeads.length}
          </span>
        </div>

        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--nf-border)' }}>
                {['REQ Code', 'Company', 'Entity', 'Stage', 'Source', 'Date'].map((h) => (
                  <th
                    key={h}
                    className="text-left py-2 px-3 text-xs font-semibold"
                    style={{ color: 'var(--nf-subtle)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentLeads.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-sm"
                    style={{ color: 'var(--nf-subtle)' }}
                  >
                    No leads found for this period
                  </td>
                </tr>
              ) : (
                recentLeads.map((l) => (
                  <tr
                    key={l.id}
                    className="transition-colors hover:bg-nf-surface-2"
                    style={{ borderBottom: '1px solid var(--nf-surface-2)' }}
                  >
                    <td className="py-2.5 px-3 font-mono text-xs" style={{ color: 'var(--nf-accent)' }}>
                      {l.reqCode}
                    </td>
                    <td
                      className="py-2.5 px-3 font-medium max-w-[180px] truncate"
                      style={{ color: 'var(--nf-text)' }}
                    >
                      {l.companyName}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className="px-1.5 py-0.5 rounded text-xs font-semibold"
                        style={{ background: 'var(--nf-surface-2)', color: 'var(--nf-muted)' }}
                      >
                        {l.businessUnit}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={l.leadStatus} />
                    </td>
                    <td
                      className="py-2.5 px-3 text-xs max-w-[130px] truncate"
                      style={{ color: 'var(--nf-muted)' }}
                    >
                      {l.leadSource ?? '—'}
                    </td>
                    <td className="py-2.5 px-3 text-xs whitespace-nowrap" style={{ color: 'var(--nf-subtle)' }}>
                      {l.requestDate}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
