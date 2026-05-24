'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'

type Point = { label: string; count: number; color: string }

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const color = payload[0]?.payload?.color ?? '#06B6D4'
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
      <p style={{ color, fontWeight: 700 }}>{payload[0].value} leads</p>
    </div>
  )
}

export function PipelineBars({ data }: { data: Point[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <div className="card p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nf-muted)' }}>
          Pipeline Stages
        </h3>
        <span className="text-xs" style={{ color: 'var(--nf-subtle)' }}>{total} leads</span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fill: '#64748B', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#64748B', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />

          <Bar dataKey="count" radius={[5, 5, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} fillOpacity={0.9} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
