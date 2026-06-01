'use client'

import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { formatDate, getStatusStyle, getBUStyle, getWhatsAppUrl } from '@/lib/utils'

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

type SortKey = 'date' | 'code' | 'company' | 'entity' | 'status'

interface LeadsTableProps {
  leads:    Lead[]
  total:    number
  page:     number
  pageSize: number
  role?:    string
  sort?:    SortKey
  sortDir?: 'asc' | 'desc'
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

export function LeadsTable({ leads, total, page, pageSize, role, sort, sortDir }: LeadsTableProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  function goToPage(p: number) {
    const params = new URLSearchParams(window.location.search)
    params.set('page', String(p))
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  function setSort(key: SortKey) {
    const params = new URLSearchParams(window.location.search)
    if (sort === key) {
      params.set('sortDir', sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      params.set('sort', key)
      params.set('sortDir', 'desc')
    }
    params.delete('page')
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sort !== col) return <ChevronsUpDown className="inline w-3 h-3 ml-1 opacity-40" />
    return sortDir === 'asc'
      ? <ChevronUp   className="inline w-3 h-3 ml-1" style={{ color: 'var(--nf-accent)' }} />
      : <ChevronDown className="inline w-3 h-3 ml-1" style={{ color: 'var(--nf-accent)' }} />
  }

  function SortTh({ col, label, className }: { col: SortKey; label: string; className?: string }) {
    return (
      <th
        onClick={() => setSort(col)}
        className={`px-4 py-2.5 text-left text-xs font-medium cursor-pointer select-none hover:opacity-80 transition-opacity ${className ?? ''}`}
        style={{ color: sort === col ? 'var(--nf-accent)' : 'var(--nf-muted)' }}>
        {label}<SortIcon col={col} />
      </th>
    )
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
                <SortTh col="code"    label="REQ Code" />
                <SortTh col="date"    label="Date"     className="hidden md:table-cell" />
                <SortTh col="company" label="Company" />
                <th className="px-4 py-2.5 text-left text-xs font-medium hidden sm:table-cell" style={{ color: 'var(--nf-muted)' }}>Contact</th>
                <SortTh col="entity"  label="Entity"   className="hidden lg:table-cell" />
                <th className="px-4 py-2.5 text-left text-xs font-medium hidden xl:table-cell" style={{ color: 'var(--nf-muted)' }}>Department</th>
                <SortTh col="status"  label="Status" />
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
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs font-mono" style={{ color: 'var(--nf-subtle)' }}>
                        {lead.contactNumber}
                      </p>
                      {getWhatsAppUrl(lead.contactNumber) && (
                        <a
                          href={getWhatsAppUrl(lead.contactNumber)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Chat on WhatsApp: ${lead.contactNumber}`}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 transition-opacity hover:opacity-80">
                          <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
                        </a>
                      )}
                    </div>
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
