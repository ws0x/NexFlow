'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import Link from 'next/link'
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { formatDate, getStatusStyle, getBUStyle, LEAD_STATUS_LABELS } from '@/lib/utils'
import type { Role } from '@/generated/prisma/client'

interface Lead {
  id: string
  reqCode: string
  requestDate: Date
  companyName: string
  contactName: string
  contactNumber: string
  leadType?: string | null
  requestStatus: string
  leadStatus: string
  businessUnit: { name: string; prefix: string }
  directedToDept?: { name: string } | null
}

interface LeadsTableProps {
  leads: Lead[]
  total: number
  page: number
  pageSize: number
  businessUnits: { id: string; name: string; prefix: string }[]
  statusOptions: string[]
  role: Role
  currentFilters: { buId?: string; status?: string; q?: string }
}

export function LeadsTable({
  leads, total, page, pageSize,
  businessUnits, statusOptions, role, currentFilters,
}: LeadsTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(window.location.search)
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-3">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: 'var(--nf-subtle)' }} />
          <input
            type="text"
            placeholder="Search REQ code, company…"
            defaultValue={currentFilters.q}
            onChange={(e) => updateFilter('q', e.target.value)}
            className="input-base text-xs pl-8 h-8"
          />
        </div>

        {/* BU filter */}
        {businessUnits.length > 1 && (
          <select
            defaultValue={currentFilters.buId ?? ''}
            onChange={(e) => updateFilter('buId', e.target.value)}
            className="input-base text-xs h-8 w-auto pr-7">
            <option value="">All BUs</option>
            {businessUnits.map((bu) => (
              <option key={bu.id} value={bu.id}>{bu.prefix} — {bu.name}</option>
            ))}
          </select>
        )}

        {/* Status filter */}
        <select
          defaultValue={currentFilters.status ?? ''}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="input-base text-xs h-8 w-auto pr-7">
          <option value="">All Statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--nf-border)', background: 'var(--nf-surface-2)' }}>
                {['REQ Code', 'Date', 'Company', 'Contact', 'BU', 'Department', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium"
                    style={{ color: 'var(--nf-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm"
                    style={{ color: 'var(--nf-muted)' }}>
                    No leads found
                  </td>
                </tr>
              ) : leads.map((lead) => (
                <tr key={lead.id} className="table-row-hover"
                  style={{ borderBottom: '1px solid var(--nf-border)' }}>

                  {/* REQ Code */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold"
                      style={{ color: 'var(--nf-accent)' }}>
                      {lead.reqCode}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-xs whitespace-nowrap"
                    style={{ color: 'var(--nf-muted)' }}>
                    {formatDate(lead.requestDate)}
                  </td>

                  {/* Company */}
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium" style={{ color: 'var(--nf-text)' }}>
                      {lead.companyName}
                    </p>
                    {lead.leadType && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--nf-subtle)' }}>
                        {lead.leadType}
                      </p>
                    )}
                  </td>

                  {/* Contact */}
                  <td className="px-4 py-3">
                    <p className="text-sm" style={{ color: 'var(--nf-text)' }}>{lead.contactName}</p>
                    <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--nf-subtle)' }}>
                      {lead.contactNumber}
                    </p>
                  </td>

                  {/* BU */}
                  <td className="px-4 py-3">
                    <span className={`badge ${getBUStyle(lead.businessUnit.prefix)}`}>
                      {lead.businessUnit.prefix}
                    </span>
                  </td>

                  {/* Dept */}
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--nf-muted)' }}>
                    {lead.directedToDept?.name ?? '—'}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={`badge ring-1 ${getStatusStyle(lead.requestStatus)}`}>
                      {lead.requestStatus}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3">
                    <Link href={`/leads/${lead.id}`}
                      className="text-xs btn-outline h-7 px-3">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--nf-muted)' }}>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => updateFilter('page', String(page - 1))}
              className="btn-ghost h-8 w-8 p-0 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs px-2" style={{ color: 'var(--nf-muted)' }}>
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => updateFilter('page', String(page + 1))}
              className="btn-ghost h-8 w-8 p-0 disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
