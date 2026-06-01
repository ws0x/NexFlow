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
  role?:    string
}

export function LeadsTable({ leads, total, page, pageSize, role }: LeadsTableProps) {
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
                <th className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: 'var(--nf-muted)' }}>REQ Code</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium hidden md:table-cell" style={{ color: 'var(--nf-muted)' }}>Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: 'var(--nf-muted)' }}>Company</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium hidden sm:table-cell" style={{ color: 'var(--nf-muted)' }}>Contact</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium hidden lg:table-cell" style={{ color: 'var(--nf-muted)' }}>Entity</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium hidden xl:table-cell" style={{ color: 'var(--nf-muted)' }}>Department</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: 'var(--nf-muted)' }}>Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
                    <p className="text-sm font-medium" style={{ color: 'var(--nf-muted)' }}>
                      No leads found
                    </p>
                    {role === 'SALES' ? (
                      <p className="text-xs mt-1.5 max-w-sm mx-auto" style={{ color: 'var(--nf-subtle)' }}>
                        You can only see leads that have been sent to Sales for your entity.
                        If you expect leads here, confirm with your admin that your entity and department assignments are correct.
                      </p>
                    ) : (
                      <p className="text-xs mt-1" style={{ color: 'var(--nf-subtle)' }}>
                        Try adjusting your filters
                      </p>
                    )}
                  </td>
                </tr>
              ) : leads.map((lead) => (
                <tr key={lead.id} className="table-row-hover"
                  style={{ borderBottom: '1px solid var(--nf-border)' }}>

                  {/* REQ Code */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold block"
                      style={{ color: 'var(--nf-accent)' }}>
                      {lead.reqCode}
                    </span>
                    {/* On mobile: show entity badge inline */}
                    <span className={`badge ${getBUStyle(lead.businessUnit.prefix)} mt-1 lg:hidden`}>
                      {lead.businessUnit.prefix}
                    </span>
                  </td>

                  {/* Date — hidden on mobile */}
                  <td className="px-4 py-3 text-xs whitespace-nowrap hidden md:table-cell"
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
                    {/* On mobile: show date inline */}
                    <p className="text-xs mt-0.5 md:hidden" style={{ color: 'var(--nf-subtle)' }}>
                      {formatDate(lead.requestDate)}
                    </p>
                  </td>

                  {/* Contact — hidden on xs */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-sm" style={{ color: 'var(--nf-text)' }}>{lead.contactName}</p>
                    <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--nf-subtle)' }}>
                      {lead.contactNumber}
                    </p>
                  </td>

                  {/* Entity — hidden below lg */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={`badge ${getBUStyle(lead.businessUnit.prefix)}`}>
                      {lead.businessUnit.prefix}
                    </span>
                  </td>

                  {/* Dept — hidden below xl */}
                  <td className="px-4 py-3 text-xs hidden xl:table-cell" style={{ color: 'var(--nf-muted)' }}>
                    {lead.directedToDept?.name ?? '—'}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={`badge ring-1 ${getStatusStyle(lead.requestStatus)}`}
                      style={{ whiteSpace: 'nowrap' }}>
                      {lead.requestStatus}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3">
                    <Link href={`/leads/${lead.id}`} className="text-xs btn-outline h-7 px-3"
                      style={{ whiteSpace: 'nowrap' }}>
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
