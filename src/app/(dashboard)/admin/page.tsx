import { db } from '@/lib/db'
import { Users, Building2, FileText, TrendingUp, Activity, CheckCircle2, Clock, Send } from 'lucide-react'

export default async function AdminOverviewPage() {
  const [
    totalUsers,
    activeUsers,
    totalBUs,
    totalLeads,
    draftLeads,
    submittedLeads,
    sentToSalesLeads,
    completedLeads,
    recentUsers,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { isActive: true } }),
    db.businessUnit.count(),
    db.lead.count(),
    db.lead.count({ where: { leadStatus: 'DRAFT' } }),
    db.lead.count({ where: { leadStatus: 'SUBMITTED' } }),
    db.lead.count({ where: { leadStatus: 'SENT_TO_SALES' } }),
    db.lead.count({ where: { leadStatus: 'COMPLETED' } }),
    db.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        businessUnits: { include: { businessUnit: true } },
      },
    }),
  ])

  const stats = [
    {
      label: 'Total Users',
      value: totalUsers,
      sub: `${activeUsers} active`,
      icon: Users,
      color: '#06B6D4',
      bg: '#06B6D420',
    },
    {
      label: 'Entities',
      value: totalBUs,
      sub: 'All operational',
      icon: Building2,
      color: '#818CF8',
      bg: '#818CF820',
    },
    {
      label: 'Total Leads',
      value: totalLeads,
      sub: `${completedLeads} completed`,
      icon: FileText,
      color: '#22C55E',
      bg: '#22C55E20',
    },
    {
      label: 'In Pipeline',
      value: submittedLeads + sentToSalesLeads,
      sub: `${sentToSalesLeads} with sales`,
      icon: TrendingUp,
      color: '#F59E0B',
      bg: '#F59E0B20',
    },
  ]

  const pipeline = [
    { label: 'Draft',       count: draftLeads,       icon: Clock,         color: 'var(--nf-muted)' },
    { label: 'Submitted',   count: submittedLeads,    icon: Activity,      color: '#3B82F6' },
    { label: 'Sent to Sales', count: sentToSalesLeads, icon: Send,         color: '#F59E0B' },
    { label: 'Completed',   count: completedLeads,    icon: CheckCircle2,  color: '#22C55E' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--nf-muted)' }}>{label}</p>
                <p className="text-3xl font-bold mt-1" style={{ color: 'var(--nf-text)' }}>{value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--nf-subtle)' }}>{sub}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: bg }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead pipeline */}
        <div className="card p-5">
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--nf-text)' }}>
            Lead Pipeline
          </h2>
          <div className="space-y-3">
            {pipeline.map(({ label, count, icon: Icon, color }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color }} />
                  <span className="text-sm" style={{ color: 'var(--nf-muted)' }}>{label}</span>
                </div>
                <div className="flex items-center gap-3">
                  {/* progress bar */}
                  <div className="w-32 h-1.5 rounded-full" style={{ background: 'var(--nf-surface-2)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        background: color,
                        width: totalLeads > 0 ? `${Math.round((count / totalLeads) * 100)}%` : '0%',
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-8 text-right" style={{ color: 'var(--nf-text)' }}>
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent users */}
        <div className="card p-5">
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--nf-text)' }}>
            Recent Users
          </h2>
          <div className="space-y-3">
            {recentUsers.map((u: any) => (
              <div key={u.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg,#06B6D4,#6366F1)', color: 'white' }}>
                  {u.name?.slice(0, 2).toUpperCase() ?? '??'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--nf-text)' }}>
                    {u.name}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--nf-subtle)' }}>
                    {u.email}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {u.businessUnits?.slice(0, 2).map((ub: any) => (
                    <span key={ub.businessUnit.id}
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--nf-surface-2)', color: 'var(--nf-muted)' }}>
                      {ub.businessUnit.prefix}
                    </span>
                  ))}
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: u.isActive ? '#22C55E20' : '#EF444420',
                      color: u.isActive ? '#22C55E' : '#EF4444',
                    }}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
