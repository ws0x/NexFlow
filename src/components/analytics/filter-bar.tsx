'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Building2 } from 'lucide-react'

const RANGES = [
  { value: '7d',  label: '7D' },
  { value: '30d', label: '30D' },
  { value: '3m',  label: '3M' },
  { value: '1y',  label: '1Y' },
  { value: 'all', label: 'All' },
]

type BU = { id: string; name: string; prefix: string }

type Props = {
  currentRange: string
  currentBU: string
  businessUnits: BU[]
}

export function FilterBar({ currentRange, currentBU, businessUnits }: Props) {
  const router   = useRouter()
  const pathname = usePathname()

  const push = useCallback(
    (range: string, bu: string) => {
      const p = new URLSearchParams({ range, bu })
      router.push(`${pathname}?${p.toString()}`)
    },
    [router, pathname],
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* ── Date range pills ──────────────────────────────────────── */}
      <div
        className="flex gap-0.5 p-0.5 rounded-xl"
        style={{ background: 'var(--nf-surface-2)', border: '1px solid var(--nf-border)' }}
      >
        {RANGES.map(({ value, label }) => {
          const active = currentRange === value
          return (
            <button
              key={value}
              onClick={() => push(value, currentBU)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={
                active
                  ? { background: 'var(--nf-accent)', color: '#0F172A' }
                  : { color: 'var(--nf-muted)' }
              }
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* ── BU selector (hidden when only one BU) ─────────────────── */}
      {businessUnits.length > 1 && (
        <div
          className="flex items-center gap-0.5 p-0.5 rounded-xl"
          style={{ background: 'var(--nf-surface-2)', border: '1px solid var(--nf-border)' }}
        >
          <Building2 className="w-3.5 h-3.5 ml-2 shrink-0" style={{ color: 'var(--nf-subtle)' }} />
          {[{ id: 'all', prefix: 'All' }, ...businessUnits].map((bu) => {
            const active = currentBU === bu.id
            return (
              <button
                key={bu.id}
                onClick={() => push(currentRange, bu.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={
                  active
                    ? {
                        background: 'var(--nf-surface)',
                        color: 'var(--nf-accent)',
                        boxShadow: 'inset 0 0 0 1px var(--nf-accent)',
                      }
                    : { color: 'var(--nf-muted)' }
                }
              >
                {bu.prefix}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
