'use client'

import { TrendingUp, TrendingDown, Minus, FileText, Zap, CheckCircle2, Target } from 'lucide-react'

export type KPIData = {
  totalLeads: number
  inPipeline: number
  completed: number
  converted: number          // leads with requestStatus === 'Turned Into Order'
  conversionRate: number
  prevTotalLeads: number
  prevInPipeline: number
  prevCompleted: number
  prevConverted: number
  prevConversionRate: number
  hasPrev: boolean
}

function TrendBadge({ current, prev }: { current: number; prev: number }) {
  if (prev === 0 && current === 0)
    return <span className="text-xs" style={{ color: 'var(--nf-subtle)' }}>—</span>

  if (prev === 0)
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium" style={{ color: '#22C55E' }}>
        <TrendingUp className="w-3 h-3" /> New
      </span>
    )

  const diff = current - prev
  const pct  = Math.round(Math.abs(diff / prev) * 100)

  if (diff === 0)
    return (
      <span className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--nf-subtle)' }}>
        <Minus className="w-3 h-3" /> 0%
      </span>
    )

  const up = diff > 0
  return (
    <span
      className="flex items-center gap-0.5 text-xs font-medium"
      style={{ color: up ? '#22C55E' : '#EF4444' }}
    >
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? '+' : '-'}{pct}% vs prev
    </span>
  )
}

function KPICard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  trend,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  color: string
  trend?: React.ReactNode
}) {
  return (
    <div className="card p-5 relative overflow-hidden">
      {/* ambient glow */}
      <div
        className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl pointer-events-none"
        style={{ background: color, opacity: 0.18 }}
      />

      <div className="relative">
        {/* label + icon row */}
        <div className="flex items-center justify-between mb-3">
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--nf-muted)' }}
          >
            {label}
          </p>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${color}18` }}
          >
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
        </div>

        {/* big number */}
        <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--nf-text)' }}>
          {value}
        </p>

        {sub && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--nf-subtle)' }}>
            {sub}
          </p>
        )}

        {trend && <div className="mt-2">{trend}</div>}
      </div>
    </div>
  )
}

export function KPIStrip({ data }: { data: KPIData }) {
  const trend = (cur: number, prev: number) =>
    data.hasPrev ? <TrendBadge current={cur} prev={prev} /> : undefined

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        label="Total Leads"
        value={data.totalLeads.toLocaleString()}
        icon={FileText}
        color="#06B6D4"
        trend={trend(data.totalLeads, data.prevTotalLeads)}
      />
      <KPICard
        label="In Pipeline"
        value={data.inPipeline.toLocaleString()}
        icon={Zap}
        color="#F59E0B"
        trend={trend(data.inPipeline, data.prevInPipeline)}
      />
      <KPICard
        label="Completed"
        value={data.completed.toLocaleString()}
        icon={CheckCircle2}
        color="#22C55E"
        trend={trend(data.completed, data.prevCompleted)}
      />
      <KPICard
        label="Conversion Rate"
        value={`${data.conversionRate.toFixed(1)}%`}
        sub={`${data.converted} turned into order`}
        icon={Target}
        color="#818CF8"
        trend={trend(
          Math.round(data.conversionRate),
          Math.round(data.prevConversionRate),
        )}
      />
    </div>
  )
}
