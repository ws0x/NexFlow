'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDate, getStatusStyle, getBUStyle } from '@/lib/utils'

interface Lead {
  id:            string
  reqCode:       string
  requestDate:   Date
  companyName:   string
  contactName:   string
  contactNumber: string
  leadType?:     string | null
  requestStatus: string
  leadStatus:    string
  businessUnit:  { name: string; prefix: string }
  directedToDept?: { name: string } | null
}

interface LeadsTableProps {
  leads:    Lead[]
  total:    number
  page:     number
  pageSize: number
}

export function LeadsTable({ leads, total, page, pageSize }: LeadsTableProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  function goToPage(p: number) {
    const params = new URLSearchParams(window.location.search)
    params.set('page', String(p))
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-3">

      {/* ── Table ──────────────────────────────────────────────────────────── */}
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
                  <td colSpan={8} className="px-4 py-14 text-center text-sm"
                    style={{ color: 'var(--nf-muted)' }}>
                    No leads match your filters
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
                    <Link href={`/leads/${lead.id}`} className="text-xs btn-outline h-7 px-3">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--nf-muted)' }}>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of{' '}
            {total.toLocaleString()}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
              className="btn-ghost h-8 w-8 p-0 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs px-2" style={{ color: 'var(--nf-muted)' }}>
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
              className="btn-ghost h-8 w-8 p-0 disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
