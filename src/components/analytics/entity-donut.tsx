'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

const ENTITY_COLORS = ['#06B6D4', '#818CF8', '#F59E0B', '#22C55E', '#EF4444', '#F97316']

type Point = { name: string; prefix: string; count: number }

function CustomTooltip({ active, payload }: any) {
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
      <p style={{ color: 'var(--nf-text)', fontWeight: 700 }}>{payload[0].name}</p>
      <p style={{ color: 'var(--nf-accent)', fontWeight: 600 }}>{payload[0].value} leads</p>
    </div>
  )
}

export function EntityDonut({ data }: { data: Point[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nf-muted)' }}>
          By Entity
        </h3>
        <span className="text-xs" style={{ color: 'var(--nf-subtle)' }}>{total} leads</span>
      </div>

      {total === 0 ? (
        <div
          className="flex items-center justify-center"
          style={{ height: 200, color: 'var(--nf-subtle)', fontSize: '0.875rem' }}
        >
          No data for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={ENTITY_COLORS[i % ENTITY_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={7}
              formatter={(value) => (
                <span style={{ color: 'var(--nf-muted)', fontSize: '0.75rem' }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
