'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'

type Point = { label: string; count: number }

const RANGES = [
  { value: '7d',  label: '7D'  },
  { value: '30d', label: '30D' },
  { value: '3m',  label: '3M'  },
  { value: '1y',  label: '1Y'  },
  { value: 'all', label: 'All' },
]

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'var(--nf-surface)',
        border: '1px solid var(--nf-border)',
        borderRadius: '0.5rem',
        padding: '0.5rem 0.75rem',
        fontSize: '0.8125rem',
      }}
    >
      <p style={{ color: 'var(--nf-muted)', marginBottom: '0.2rem' }}>{label}</p>
      <p style={{ color: '#06B6D4', fontWeight: 700 }}>{payload[0].value} leads</p>
    </div>
  )
}

export function LeadsTimeline({
  data,
  range,
  currentBU = 'all',
}: {
  data: Point[]
  range: string
  currentBU?: string
}) {
  const router   = useRouter()
  const pathname = usePathname()

  const setRange = useCallback(
    (newRange: string) => {
      const p = new URLSearchParams({ range: newRange, bu: currentBU })
      router.push(`${pathname}?${p.toString()}`)
    },
    [router, pathname, currentBU],
  )

  // For 30-day ranges, only show every 5th label to avoid crowding
  const tickInterval = range === '30d' ? 4 : 'preserveStartEnd'

  return (
    <div className="card p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nf-muted)' }}>
          Leads Over Time
        </h3>
        <div className="flex items-center gap-2">
          {/* Timeframe pills */}
          <div
            className="flex gap-0.5 p-0.5 rounded-lg"
            style={{ background: 'var(--nf-surface-2)', border: '1px solid var(--nf-border)' }}
          >
            {RANGES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setRange(value)}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all"
                style={
                  range === value
                    ? { background: 'var(--nf-accent)', color: '#0F172A' }
                    : { color: 'var(--nf-subtle)' }
                }
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#06B6D415', color: '#06B6D4' }}>
            {data.reduce((s, d) => s + d.count, 0)} total
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#06B6D4" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}    />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fill: '#64748B', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={tickInterval}
          />
          <YAxis
            tick={{ fill: '#64748B', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1 }} />

          <Area
            type="monotone"
            dataKey="count"
            stroke="#06B6D4"
            strokeWidth={2}
            fill="url(#timelineGrad)"
            dot={false}
            activeDot={{ r: 5, fill: '#06B6D4', stroke: '#0F172A', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
