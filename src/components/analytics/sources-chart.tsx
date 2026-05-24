'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

type Point = { label: string; count: number }

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

export function SourcesChart({ data }: { data: Point[] }) {
  const barH = Math.max(28, 240 / Math.max(data.length, 1))
  const height = Math.max(200, data.length * barH)

  return (
    <div className="card p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--nf-muted)' }}>
        Top Lead Sources
      </h3>

      {data.length === 0 ? (
        <div
          className="flex items-center justify-center"
          style={{ height: 200, color: 'var(--nf-subtle)', fontSize: '0.875rem' }}
        >
          No source data
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />

            <XAxis
              type="number"
              tick={{ fill: '#64748B', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={128}
              tick={{ fill: '#94A3B8', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff06' }} />

            <Bar dataKey="count" radius={[0, 5, 5, 0]} fill="#06B6D4" fillOpacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
