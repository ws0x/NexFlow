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
      <p style={{ color: '#818CF8', fontWeight: 700 }}>{payload[0].value} leads</p>
    </div>
  )
}

export function SectorChart({ data }: { data: Point[] }) {
  const barH = Math.max(30, 280 / Math.max(data.length, 1))
  const height = Math.max(200, data.length * barH)

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nf-muted)' }}>
          Top Company Sectors
        </h3>
        <span className="text-xs" style={{ color: 'var(--nf-subtle)' }}>
          {data.length} sectors
        </span>
      </div>

      {data.length === 0 ? (
        <div
          className="flex items-center justify-center"
          style={{ height: 200, color: 'var(--nf-subtle)', fontSize: '0.875rem' }}
        >
          No sector data
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }}>
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
              width={168}
              tick={{ fill: '#94A3B8', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff06' }} />

            <Bar dataKey="count" radius={[0, 5, 5, 0]} fill="#818CF8" fillOpacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
