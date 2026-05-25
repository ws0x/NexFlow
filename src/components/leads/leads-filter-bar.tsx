'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import type { Role } from '@/generated/prisma/client'

export interface LeadFilters {
  q?:           string
  buId?:        string
  status?:      string
  dateFrom?:    string
  dateTo?:      string
  source?:      string
  leadType?:    string
  sentToSales?: string   // "true" | ""
}

interface LeadsFilterBarProps {
  businessUnits:  { id: string; name: string; prefix: string }[]
  statusOptions:  string[]
  sourceOptions:  string[]
  typeOptions:    string[]
  currentFilters: LeadFilters
  role:           Role
}

export function LeadsFilterBar({
  businessUnits, statusOptions, sourceOptions, typeOptions, currentFilters, role,
}: LeadsFilterBarProps) {
  const router        = useRouter()
  const pathname      = usePathname()
  const [, startTransition] = useTransition()

  // Auto-open expanded panel if any "more" filter is currently active
  const hasMoreActive = !!(
    currentFilters.dateFrom || currentFilters.dateTo ||
    currentFilters.source   || currentFilters.leadType ||
    currentFilters.sentToSales === 'true'
  )
  const [showMore, setShowMore] = useState(hasMoreActive)

  // Controlled search with 350 ms debounce
  const [searchVal, setSearchVal] = useState(currentFilters.q ?? '')

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      if (searchVal) params.set('q', searchVal)
      else           params.delete('q')
      params.delete('page')
      startTransition(() => router.push(`${pathname}?${params.toString()}`))
    }, 350)
    return () => clearTimeout(timer)
  }, [searchVal, pathname, router, startTransition])

  // ── Generic filter updater (instant — no debounce needed for selects) ──────
  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(window.location.search)
    if (value) params.set(key, value)
    else       params.delete(key)
    params.delete('page')
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  function clearAll() {
    setSearchVal('')
    startTransition(() => router.push(pathname))
  }

  // ── Active chips ────────────────────────────────────────────────────────────
  const chips: { label: string; key: string }[] = []
  if (currentFilters.buId) {
    const bu = businessUnits.find((b) => b.id === currentFilters.buId)
    chips.push({ label: `BU: ${bu?.prefix ?? currentFilters.buId}`, key: 'buId' })
  }
  if (currentFilters.status)  chips.push({ label: `Status: ${currentFilters.status}`,  key: 'status' })
  if (currentFilters.dateFrom) chips.push({ label: `From: ${currentFilters.dateFrom}`, key: 'dateFrom' })
  if (currentFilters.dateTo)   chips.push({ label: `To: ${currentFilters.dateTo}`,     key: 'dateTo' })
  if (currentFilters.source)   chips.push({ label: `Source: ${currentFilters.source}`, key: 'source' })
  if (currentFilters.leadType) chips.push({ label: `Type: ${currentFilters.leadType}`, key: 'leadType' })
  if (currentFilters.sentToSales === 'true') chips.push({ label: 'Sent to Sales', key: 'sentToSales' })

  const hasAny = chips.length > 0 || !!currentFilters.q

  return (
    <div className="space-y-2">

      {/* ── Row 1: Search + quick selects + More button ────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Debounced search */}
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: 'var(--nf-subtle)' }} />
          <input
            type="text"
            placeholder="Search REQ code, company, contact…"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="input-base text-xs pl-8 pr-8 h-8"
          />
          {searchVal && (
            <button
              onClick={() => setSearchVal('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded"
              style={{ color: 'var(--nf-subtle)' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* BU selector */}
        {businessUnits.length > 1 && (
          <select
            value={currentFilters.buId ?? ''}
            onChange={(e) => setFilter('buId', e.target.value)}
            className="input-base text-xs h-8 w-auto">
            <option value="">All BUs</option>
            {businessUnits.map((bu) => (
              <option key={bu.id} value={bu.id}>{bu.prefix} — {bu.name}</option>
            ))}
          </select>
        )}

        {/* Status selector */}
        <select
          value={currentFilters.status ?? ''}
          onChange={(e) => setFilter('status', e.target.value)}
          className="input-base text-xs h-8 w-auto">
          <option value="">All Statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* More filters toggle */}
        <button
          onClick={() => setShowMore((v) => !v)}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: showMore ? 'rgb(6 182 212 / 0.1)' : 'var(--nf-surface-2)',
            border:     `1px solid ${showMore ? 'rgb(6 182 212 / 0.3)' : 'var(--nf-border)'}`,
            color:      showMore ? '#06B6D4' : 'var(--nf-muted)',
          }}>
          <SlidersHorizontal className="w-3.5 h-3.5" />
          More
          {chips.length > 0 && !showMore && (
            <span className="flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
              style={{ background: '#06B6D4', color: 'white' }}>
              {chips.length}
            </span>
          )}
        </button>

        {/* Clear all */}
        {hasAny && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs h-8 px-2 rounded-lg transition-colors"
            style={{ color: 'var(--nf-muted)' }}>
            <X className="w-3.5 h-3.5" />
            Clear all
          </button>
        )}
      </div>

      {/* ── Row 2: Expanded filters panel ──────────────────────────────────── */}
      {showMore && (
        <div className="card p-3 grid grid-cols-2 md:grid-cols-4 gap-3">

          {/* Date from */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wide"
              style={{ color: 'var(--nf-subtle)' }}>
              Date from
            </label>
            <input
              type="date"
              value={currentFilters.dateFrom ?? ''}
              onChange={(e) => setFilter('dateFrom', e.target.value)}
              className="input-base text-xs h-8 w-full"
            />
          </div>

          {/* Date to */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wide"
              style={{ color: 'var(--nf-subtle)' }}>
              Date to
            </label>
            <input
              type="date"
              value={currentFilters.dateTo ?? ''}
              onChange={(e) => setFilter('dateTo', e.target.value)}
              className="input-base text-xs h-8 w-full"
            />
          </div>

          {/* Source */}
          {sourceOptions.length > 0 && (
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wide"
                style={{ color: 'var(--nf-subtle)' }}>
                Source
              </label>
              <select
                value={currentFilters.source ?? ''}
                onChange={(e) => setFilter('source', e.target.value)}
                className="input-base text-xs h-8 w-full">
                <option value="">All Sources</option>
                {sourceOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {/* Lead type */}
          {typeOptions.length > 0 && (
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wide"
                style={{ color: 'var(--nf-subtle)' }}>
                Lead type
              </label>
              <select
                value={currentFilters.leadType ?? ''}
                onChange={(e) => setFilter('leadType', e.target.value)}
                className="input-base text-xs h-8 w-full">
                <option value="">All Types</option>
                {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          {/* Sent to Sales — hidden for SALES role (they always see only sent leads) */}
          {role !== 'SALES' && (
            <div className="col-span-2 md:col-span-4 pt-1 flex items-center gap-3">
              <span className="text-xs" style={{ color: 'var(--nf-muted)' }}>Quick filter:</span>
              <button
                onClick={() =>
                  setFilter('sentToSales', currentFilters.sentToSales === 'true' ? '' : 'true')
                }
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors"
                style={{
                  background: currentFilters.sentToSales === 'true'
                    ? 'rgb(34 197 94 / 0.1)' : 'var(--nf-surface-2)',
                  color: currentFilters.sentToSales === 'true' ? '#86EFAC' : 'var(--nf-muted)',
                  border: `1px solid ${currentFilters.sentToSales === 'true'
                    ? 'rgb(34 197 94 / 0.3)' : 'var(--nf-border)'}`,
                }}>
                {currentFilters.sentToSales === 'true' ? '✓ ' : ''}Sent to Sales only
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Row 3: Active filter chips ─────────────────────────────────────── */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key, '')}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
              style={{
                background: 'rgb(6 182 212 / 0.08)',
                color:      '#06B6D4',
                border:     '1px solid rgb(6 182 212 / 0.2)',
              }}>
              {chip.label}
              <X className="w-3 h-3 opacity-60" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
